import { createHmac, timingSafeEqual } from 'node:crypto';
import { executeQuery, sql } from '../database/connection.js';
import { createServiceError } from './serviceErrors.js';

// "Link chốt phòng": Sale chọn phòng (và giờ hẹn xem nếu có) rồi tạo link dán vào Messenger/Zalo. Link là một mã ký bằng
// AUTH_SECRET (không cần bảng mới), chứa mã phòng, giờ hẹn, ghi chú và mã Sale; hết hạn sau 7 ngày. Khách mở link thấy đúng
// phòng đó kèm lời giới thiệu của Sale, bấm đăng ký thì form điền sẵn phòng và giờ hẹn, nguồn khách ghi là "Sale gửi link".
const DAYS = 7;
const secret = () => `${process.env.AUTH_SECRET || 'happyroom-auth-secret'}:link-chot`;
const sign = (body) => createHmac('sha256', secret()).update(body).digest('base64url');

export function taoMa(payload, now = Date.now()) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: now + DAYS * 24 * 60 * 60 * 1000 })).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function docMa(token, now = Date.now()) {
  const [body, signature] = String(token || '').split('.');
  if (!body || !signature) return null;
  const expected = Buffer.from(sign(body)), actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return payload.exp && now <= payload.exp ? payload : null;
  } catch { return null; }
}

const canSend = (user) => user?.vaiTro === 'NhanVien' && ['Sale', 'Quản lý'].includes(user.chucVu);

export async function taoLink(user, data = {}, { query = executeQuery, now = Date.now } = {}) {
  if (!canSend(user)) throw createServiceError('Chỉ nhân viên Sale hoặc quản lý mới tạo được link gửi khách.', 403);
  const maPhong = String(data.maPhong || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(maPhong)) throw createServiceError('Vui lòng chọn phòng.');
  const room = (await query('SELECT MaPhong AS maPhong, TenPhong AS tenPhong FROM dbo.Phong WHERE MaPhong = @Ma', [{ name: 'Ma', type: sql.VarChar(4), value: maPhong }])).recordset[0];
  if (!room) throw createServiceError('Không tìm thấy phòng.', 404);
  const ngayXem = String(data.ngayXem || '').trim(), gioXem = String(data.gioXem || '').trim();
  if (ngayXem && !/^\d{4}-\d{2}-\d{2}$/.test(ngayXem)) throw createServiceError('Ngày hẹn không hợp lệ.');
  if (gioXem && !/^\d{2}:\d{2}$/.test(gioXem)) throw createServiceError('Giờ hẹn không hợp lệ.');
  if (ngayXem && new Date(`${ngayXem}T23:59:59+07:00`).getTime() < now()) throw createServiceError('Ngày hẹn đã qua.');
  const ghiChu = String(data.ghiChu || '').trim().slice(0, 200);
  const token = taoMa({ maPhong, ngayXem: ngayXem || null, gioXem: gioXem || null, ghiChu: ghiChu || null, maSale: user.maNguoiDung }, now());
  return { token, maPhong, tenPhong: room.tenPhong, hetHan: new Date(now() + DAYS * 24 * 60 * 60 * 1000).toISOString() };
}

// Công khai: chỉ trả mã phòng, giờ hẹn, ghi chú và tên + số điện thoại công việc của Sale (để khách biết ai gửi).
export async function moLink(token, { query = executeQuery, now = Date.now } = {}) {
  const payload = docMa(token, now());
  if (!payload) throw createServiceError('Link đã hết hạn hoặc không đúng. Vui lòng nhờ nhân viên gửi lại link mới.', 404);
  const sale = (await query('SELECT HoTen AS hoTen, SDT AS sdt FROM dbo.NguoiDung WHERE MaNguoiDung = @Ma', [{ name: 'Ma', type: sql.VarChar(6), value: payload.maSale }])).recordset[0];
  return { maPhong: payload.maPhong, ngayXem: payload.ngayXem, gioXem: payload.gioXem, ghiChu: payload.ghiChu, maSale: payload.maSale, tenSale: sale?.hoTen || null, sdtSale: sale?.sdt || null, hetHan: new Date(payload.exp).toISOString() };
}
