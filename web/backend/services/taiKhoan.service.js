import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { executeQuery, sql } from '../database/connection.js';
import { createServiceError } from './serviceErrors.js';
import { createMailer } from '../integrations/mail/mailer.js';

// Quên mật khẩu (OTP qua email), đổi mật khẩu và ảnh đại diện. Không cần đổi cấu trúc cơ sở dữ liệu:
// OTP giữ trong bộ nhớ máy chủ (hết hạn sau 10 phút, tối đa 5 lần thử); ảnh lưu thành file trong uploads/avatars.
const OTP_MINUTES = 10, OTP_MAX_TRIES = 5, OTP_RESEND_SECONDS = 45, MIN_PASSWORD = 6;
const AVATAR_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'uploads', 'avatars');
const AVATAR_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const otps = new Map();

const hashPassword = (value) => createHash('sha256').update(value).digest('hex').toUpperCase();
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const checkPassword = (value) => {
  if (String(value || '').length < MIN_PASSWORD) throw createServiceError(`Mật khẩu mới phải có ít nhất ${MIN_PASSWORD} ký tự.`);
};

export async function findAccountsByEmail(email, query = executeQuery) {
  const result = await query(`SELECT tk.TenDangNhap AS tenDangNhap, tk.MaNguoiDung AS maNguoiDung, tk.TrangThai AS trangThai
    FROM dbo.TaiKhoan tk JOIN dbo.NguoiDung nd ON nd.MaNguoiDung = tk.MaNguoiDung WHERE LOWER(nd.Email) = @Email`,
  [{ name: 'Email', type: sql.VarChar(100), value: normalizeEmail(email) }]);
  return result.recordset || [];
}

// Người dùng có thể gõ email thay cho tên đăng nhập. Không tìm thấy thì giữ nguyên để thủ tục đăng nhập báo sai thông tin.
export async function resolveLoginName(input, query = executeQuery) {
  const value = String(input || '').trim();
  if (!value.includes('@')) return value;
  const accounts = await findAccountsByEmail(value, query);
  if (accounts.length > 1) throw createServiceError('Email này đang gắn với nhiều tài khoản, vui lòng đăng nhập bằng tên đăng nhập.', 409);
  return accounts[0]?.tenDangNhap || value;
}

export async function quenMatKhau(data = {}, { query = executeQuery, mailer = createMailer(), now = Date.now, random = () => String(randomInt(0, 1000000)).padStart(6, '0') } = {}) {
  const email = normalizeEmail(data.email);
  if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(email)) throw createServiceError('Email không hợp lệ.');
  const accounts = await findAccountsByEmail(email, query);
  if (!accounts.length) throw createServiceError('Email này chưa được đăng ký tài khoản.', 404);
  if (accounts.length > 1) throw createServiceError('Email này đang gắn với nhiều tài khoản, vui lòng liên hệ quản trị viên.', 409);
  if (accounts[0].trangThai !== 'Hoạt động') throw createServiceError('Tài khoản đang bị vô hiệu hóa.', 403);
  const old = otps.get(email);
  if (old && now() - old.sentAt < OTP_RESEND_SECONDS * 1000) throw createServiceError('Vui lòng đợi một chút rồi gửi lại mã.', 429);
  const code = random();
  otps.set(email, { hash: hashPassword(code), expiresAt: now() + OTP_MINUTES * 60 * 1000, sentAt: now(), tries: 0, maNguoiDung: accounts[0].maNguoiDung });
  await mailer.send({
    to: email, subject: 'Mã đặt lại mật khẩu HomeStayDorm',
    text: `Mã OTP của bạn là ${code}. Mã có hiệu lực trong ${OTP_MINUTES} phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.`,
  });
  return { ok: true, expiresInMinutes: OTP_MINUTES };
}

export async function datLaiMatKhau(data = {}, { query = executeQuery, now = Date.now } = {}) {
  const email = normalizeEmail(data.email), otp = String(data.otp || '').trim();
  checkPassword(data.matKhauMoi);
  const entry = otps.get(email);
  if (!entry || now() > entry.expiresAt) { otps.delete(email); throw createServiceError('Mã OTP đã hết hạn, vui lòng gửi lại mã.', 400); }
  entry.tries += 1;
  if (entry.tries > OTP_MAX_TRIES) { otps.delete(email); throw createServiceError('Nhập sai quá nhiều lần, vui lòng gửi lại mã.', 429); }
  const given = Buffer.from(hashPassword(otp)), expected = Buffer.from(entry.hash);
  if (!/^\d{6}$/.test(otp) || given.length !== expected.length || !timingSafeEqual(given, expected)) throw createServiceError('Mã OTP không đúng.', 400);
  otps.delete(email);
  await query('UPDATE dbo.TaiKhoan SET MatKhau = @MatKhau WHERE MaNguoiDung = @Ma', [
    { name: 'MatKhau', type: sql.VarChar(255), value: hashPassword(String(data.matKhauMoi)) },
    { name: 'Ma', type: sql.VarChar(6), value: entry.maNguoiDung },
  ]);
  return { ok: true };
}

export async function doiMatKhau(user, data = {}, { query = executeQuery } = {}) {
  const hienTai = String(data.matKhauHienTai || '');
  if (!hienTai) throw createServiceError('Vui lòng nhập mật khẩu hiện tại.');
  checkPassword(data.matKhauMoi);
  if (data.matKhauMoi === hienTai) throw createServiceError('Mật khẩu mới phải khác mật khẩu hiện tại.');
  const result = await query('UPDATE dbo.TaiKhoan SET MatKhau = @Moi WHERE TenDangNhap = @Ten AND MatKhau = @Cu', [
    { name: 'Moi', type: sql.VarChar(255), value: hashPassword(String(data.matKhauMoi)) },
    { name: 'Ten', type: sql.VarChar(50), value: user.tenDangNhap },
    { name: 'Cu', type: sql.VarChar(255), value: hashPassword(hienTai) },
  ]);
  if (!result.rowsAffected?.[0]) throw createServiceError('Mật khẩu hiện tại không đúng.', 400);
  return { ok: true };
}

export function avatarUrlOf(maNguoiDung) {
  if (!/^[A-Za-z0-9]{1,10}$/.test(String(maNguoiDung || ''))) return null;
  for (const ext of Object.values(AVATAR_TYPES)) if (existsSync(path.join(AVATAR_DIR, `${maNguoiDung}.${ext}`))) return `/uploads/avatars/${maNguoiDung}.${ext}`;
  return null;
}

async function removeAvatars(maNguoiDung) {
  const files = await readdir(AVATAR_DIR).catch(() => []);
  await Promise.all(files.filter((name) => name.startsWith(`${maNguoiDung}.`)).map((name) => unlink(path.join(AVATAR_DIR, name)).catch(() => {})));
}

export async function capNhatAvatar(user, data = {}) {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(data.anh || ''));
  if (!match) throw createServiceError('Ảnh phải là PNG, JPG hoặc WebP.');
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > AVATAR_MAX_BYTES) throw createServiceError('Ảnh tối đa 2MB.');
  await mkdir(AVATAR_DIR, { recursive: true });
  await removeAvatars(user.maNguoiDung);
  await writeFile(path.join(AVATAR_DIR, `${user.maNguoiDung}.${AVATAR_TYPES[match[1]]}`), buffer);
  return { avatarUrl: `${avatarUrlOf(user.maNguoiDung)}?v=${Date.now()}` };
}

export async function xoaAvatar(user) {
  await removeAvatars(user.maNguoiDung);
  return { avatarUrl: null };
}
