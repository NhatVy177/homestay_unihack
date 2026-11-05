import { createHash, createPrivateKey, createPublicKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
// D-011: Privy JWT-based auth. HomeStayDorm stays the identity provider; Privy only creates/unlocks
// the tenant's embedded wallet for the same account, so there is no second login.
const b64 = value => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');
export function loadPrivyKey(env = process.env) {
  const pem = env.PRIVY_JWT_PRIVATE_KEY_FILE ? readFileSync(env.PRIVY_JWT_PRIVATE_KEY_FILE, 'utf8')
    : String(env.PRIVY_JWT_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (!pem.trim()) return null;
  const privateKey = createPrivateKey(pem);
  if (privateKey.asymmetricKeyType !== 'rsa') throw new Error('PRIVY_JWT_PRIVATE_KEY phải là khóa RSA (RS256).');
  const publicKey = createPublicKey(privateKey);
  const kid = createHash('sha256').update(publicKey.export({ type: 'spki', format: 'der' })).digest('base64url').slice(0, 16);
  return { privateKey, publicKey, kid };
}
export function createPrivyIssuer({ key, appId, issuer = 'homestaydorm', ttlSeconds = 600, clock = () => Date.now() }) {
  return {
    enabled: Boolean(key),
    issue(user) {
      if (!key) throw Object.assign(new Error('Xác nhận trong tài khoản chưa được cấu hình.'), { statusCode: 503 });
      if (user?.vaiTro !== 'KhachHang' || !/^[A-Za-z0-9]{1,6}$/.test(user.maNguoiDung || '')) throw Object.assign(new Error('Chỉ khách thuê dùng xác nhận trong tài khoản.'), { statusCode: 403 });
      const iat = Math.floor(clock() / 1000);
      const header = { alg: 'RS256', typ: 'JWT', kid: key.kid };
      const payload = { sub: user.maNguoiDung, iss: issuer, ...(appId ? { aud: appId } : {}), iat, exp: iat + ttlSeconds };
      const input = b64(header) + '.' + b64(payload);
      return input + '.' + sign('RSA-SHA256', Buffer.from(input), key.privateKey).toString('base64url');
    },
    jwks() {
      if (!key) return { keys: [] };
      return { keys: [{ ...key.publicKey.export({ format: 'jwk' }), kid: key.kid, alg: 'RS256', use: 'sig' }] };
    },
    publicKeyPem() { return key ? key.publicKey.export({ type: 'spki', format: 'pem' }) : ''; },
  };
}
let cached;
export function configuredPrivyIssuer() {
  return cached ||= createPrivyIssuer({ key: loadPrivyKey(), appId: process.env.PRIVY_APP_ID || undefined });
}
