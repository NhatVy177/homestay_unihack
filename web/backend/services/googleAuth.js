import { createPublicKey, createVerify } from 'node:crypto';
import { createServiceError } from './serviceErrors.js';

// Xác thực ID token của Google (Google Identity Services) bằng khóa công khai của Google, không cần thư viện ngoài.
// Chỉ nhận token do Google ký, đúng ứng dụng (aud), còn hạn, email đã được Google xác minh.
const CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

let cache = { keys: null, at: 0 };
async function defaultFetchJwks() {
  if (cache.keys && Date.now() - cache.at < 60 * 60 * 1000) return cache.keys;
  const response = await fetch(CERTS_URL);
  if (!response.ok) throw createServiceError('Không kết nối được Google để xác thực.', 502);
  const body = await response.json();
  cache = { keys: body.keys || [], at: Date.now() };
  return cache.keys;
}

export function googleClientId() {
  return String(process.env.GOOGLE_CLIENT_ID || '').trim();
}

const decode = (part) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));

export async function verifyGoogleIdToken(idToken, { clientId = googleClientId(), fetchJwks = defaultFetchJwks, now = () => Date.now() } = {}) {
  if (!clientId) throw createServiceError('Đăng nhập bằng Google chưa được cấu hình trên máy chủ.', 503);
  const parts = String(idToken || '').split('.');
  if (parts.length !== 3) throw createServiceError('Phiên đăng nhập Google không hợp lệ.', 401);
  let header, payload;
  try { header = decode(parts[0]); payload = decode(parts[1]); } catch { throw createServiceError('Phiên đăng nhập Google không hợp lệ.', 401); }
  if (header.alg !== 'RS256') throw createServiceError('Phiên đăng nhập Google không hợp lệ.', 401);
  const key = (await fetchJwks()).find((item) => item.kid === header.kid);
  if (!key) throw createServiceError('Phiên đăng nhập Google không hợp lệ.', 401);
  const verifier = createVerify('RSA-SHA256');
  verifier.update(`${parts[0]}.${parts[1]}`);
  if (!verifier.verify(createPublicKey({ key, format: 'jwk' }), Buffer.from(parts[2], 'base64url'))) {
    throw createServiceError('Phiên đăng nhập Google không hợp lệ.', 401);
  }
  if (!ISSUERS.has(payload.iss) || payload.aud !== clientId) throw createServiceError('Phiên đăng nhập Google không dành cho ứng dụng này.', 401);
  if (!payload.exp || payload.exp * 1000 < now()) throw createServiceError('Phiên đăng nhập Google đã hết hạn, vui lòng thử lại.', 401);
  if (!payload.email || !(payload.email_verified === true || payload.email_verified === 'true')) {
    throw createServiceError('Email Google chưa được xác minh.', 401);
  }
  return { email: String(payload.email).trim().toLowerCase(), hoTen: String(payload.name || '').trim(), sub: payload.sub };
}
