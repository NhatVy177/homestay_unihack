import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createSign } from 'node:crypto';
import { verifyGoogleIdToken } from '../services/googleAuth.js';
import { dangNhapGoogle, hoanTatDangKyGoogle } from '../services/auth.service.js';

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-kid', alg: 'RS256', use: 'sig' };
const fetchJwks = async () => [jwk];
const CLIENT = 'client-123.apps.googleusercontent.com';
const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

function idToken(claims = {}, { key = privateKey, kid = 'test-kid', alg = 'RS256' } = {}) {
  const head = b64({ alg, kid, typ: 'JWT' });
  const body = b64({ iss: 'https://accounts.google.com', aud: CLIENT, exp: Math.floor(Date.now() / 1000) + 3600, email: 'khach@gmail.com', email_verified: true, name: 'Khách Google', sub: '1', ...claims });
  const sig = createSign('RSA-SHA256').update(`${head}.${body}`).sign(key).toString('base64url');
  return `${head}.${body}.${sig}`;
}
const verify = (token, extra = {}) => verifyGoogleIdToken(token, { clientId: CLIENT, fetchJwks, ...extra });

test('a valid Google ID token yields the verified email and name', async () => {
  assert.deepEqual(await verify(idToken()), { email: 'khach@gmail.com', hoTen: 'Khách Google', sub: '1' });
});

test('tokens that are forged, for another app, expired, unverified or unconfigured are refused', async () => {
  const other = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  await assert.rejects(verify(idToken({}, { key: other })), /không hợp lệ/);
  await assert.rejects(verify(idToken({ aud: 'other-app' })), /không dành cho ứng dụng/);
  await assert.rejects(verify(idToken({ iss: 'https://evil.example' })), /không dành cho ứng dụng/);
  await assert.rejects(verify(idToken({ exp: Math.floor(Date.now() / 1000) - 10 })), /hết hạn/);
  await assert.rejects(verify(idToken({ email_verified: false })), /chưa được xác minh/);
  await assert.rejects(verify(idToken({}, { kid: 'unknown' })), /không hợp lệ/);
  await assert.rejects(verify(idToken({}, { alg: 'none' })), /không hợp lệ/);
  await assert.rejects(verify('abc.def'), /không hợp lệ/);
  await assert.rejects(verifyGoogleIdToken(idToken(), { clientId: '', fetchJwks }), /chưa được cấu hình/);
});

const verified = async () => ({ email: 'khach@gmail.com', hoTen: 'Khách Google', sub: '1' });
const row = (extra = {}) => ({ tenDangNhap: 'khach', maNguoiDung: 'KH9001', hoTen: 'Khách', email: 'khach@gmail.com', vaiTro: 'KhachHang', trangThai: 'Hoạt động', ...extra });

test('Google sign-in logs in an existing customer by email, refuses staff and disabled accounts', async () => {
  const ok = await dangNhapGoogle({ credential: 'x' }, { verify: verified, query: async () => ({ recordset: [row()] }) });
  assert.equal(ok.user.maNguoiDung, 'KH9001'); assert.ok(ok.token);
  await assert.rejects(dangNhapGoogle({ credential: 'x' }, { verify: verified, query: async () => ({ recordset: [row({ vaiTro: 'NhanVien' })] }) }), /nhân viên/);
  await assert.rejects(dangNhapGoogle({ credential: 'x' }, { verify: verified, query: async () => ({ recordset: [row({ trangThai: 'Vô hiệu hóa' })] }) }), /vô hiệu hóa/);
  await assert.rejects(dangNhapGoogle({ credential: 'x' }, { verify: verified, query: async () => ({ recordset: [row(), row({ maNguoiDung: 'KH9002' })] }) }), /nhiều tài khoản/);
});

test('a new Google email gets a short-lived profile token and finishes registration with the missing fields', async () => {
  const first = await dangNhapGoogle({ credential: 'x' }, { verify: verified, query: async () => ({ recordset: [] }) });
  assert.equal(first.needsProfile, true); assert.equal(first.email, 'khach@gmail.com');
  const sent = [];
  const done = await hoanTatDangKyGoogle({ profileToken: first.profileToken, hoTen: 'Khách Google', ngaySinh: '2003-05-20', gioiTinh: 'Nữ', soDienThoai: '0912345678' },
    { register: async (data) => { sent.push(data); return { user: { email: data.email } }; } });
  assert.equal(done.user.email, 'khach@gmail.com');
  assert.equal(sent[0].tenDangNhap, 'khach@gmail.com');
  assert.equal(sent[0].matKhau, sent[0].xacNhanMatKhau); assert.ok(sent[0].matKhau.length >= 24);
  await assert.rejects(hoanTatDangKyGoogle({ profileToken: 'bad.token' }, { register: async () => null }), /hết hạn/);
});
