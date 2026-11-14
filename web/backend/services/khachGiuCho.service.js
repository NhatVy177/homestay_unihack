import { executeProcedure, executeQuery, sql } from '../database/connection.js';
import { createServiceError, mapDatabaseError } from './serviceErrors.js';
import { notifyDeposit } from '../integrations/mail/datCocNotifications.js';

// D-026: khách tự gửi yêu cầu giữ chỗ sau buổi "Đã xem". Dùng lại đúng hai thủ tục của Sale,
// với Sale phụ trách của phiếu làm người đại diện; quản lý vẫn là người duyệt (không tự giữ chỗ).
const KHACH_ERRORS = { 50201: 404, 50202: 409, 50203: 404, 50256: 422, 50257: 409, 50258: 409, 50301: 400, 50302: 403, 50303: 422, 50304: 422, 50305: 409, 50315: 403 };

function assertCustomer(user) {
  if (user?.vaiTro !== 'KhachHang' || !user.maNguoiDung) throw createServiceError('Chỉ khách hàng mới dùng chức năng này.', 403);
}
function assertCode(value) {
  const code = String(value || '').trim();
  if (!/^[A-Za-z]{2}\d{4}$/.test(code)) throw createServiceError('Mã phiếu đăng ký không hợp lệ.');
  return code;
}
async function ownProfile(user, maDangKy, query) {
  const result = await query(`SELECT MaDangKy AS maDangKy, MaNhanVienSale AS maNhanVienSale, TrangThai AS trangThai,
      SoNguoiDuKienO AS soNguoiDuKienO, SoNam AS soNam, SoNu AS soNu
    FROM dbo.PhieuDangKy WHERE MaDangKy = @MaDangKy AND MaKhachHang = @MaKhachHang`, [
    { name: 'MaDangKy', type: sql.VarChar(6), value: maDangKy },
    { name: 'MaKhachHang', type: sql.VarChar(6), value: user.maNguoiDung }]);
  const profile = result.recordset[0];
  if (!profile) throw createServiceError('Không tìm thấy phiếu của bạn.', 404);
  return profile;
}

export async function getPhongDaXemCuaKhach(user, maDangKyInput, { query = executeQuery, run = executeProcedure } = {}) {
  assertCustomer(user);
  const maDangKy = assertCode(maDangKyInput);
  const profile = await ownProfile(user, maDangKy, query);
  try {
    const result = await run('dbo.SP_DanhSachPhongDaXem', [{ name: 'MaDangKy', type: sql.VarChar(6), value: maDangKy }]);
    return { soNguoi: Number(profile.soNguoiDuKienO) || 0, khacGioi: Number(profile.soNam) > 0 && Number(profile.soNu) > 0,
      daGuiYeuCau: profile.trangThai !== 'Đã tiếp nhận', phong: result.recordset };
  } catch (error) { mapDatabaseError(error, KHACH_ERRORS); }
}

export async function khachGuiYeuCauGiuCho(user, data = {}, { query = executeQuery, run = executeProcedure, notify = notifyDeposit } = {}) {
  assertCustomer(user);
  const maDangKy = assertCode(data.maDangKy);
  const maPhong = String(data.maPhong || '').trim();
  const hinhThucThue = String(data.hinhThucThue || '').trim();
  if (!/^[A-Za-z0-9]{1,4}$/.test(maPhong)) throw createServiceError('Vui lòng chọn phòng đã xem.');
  if (!['Nguyên phòng', 'Ghép giường'].includes(hinhThucThue)) throw createServiceError('Chọn hình thức thuê nguyên phòng hoặc ghép giường.');
  const giuongs = Array.isArray(data.giuongs) ? data.giuongs.map((item) => String(item).trim()).filter(Boolean) : [];
  if (hinhThucThue === 'Ghép giường' && !giuongs.length) throw createServiceError('Chọn giường bạn muốn giữ.');
  const profile = await ownProfile(user, maDangKy, query);
  if (profile.trangThai !== 'Đã tiếp nhận') throw createServiceError('Phiếu của bạn đã gửi yêu cầu giữ chỗ hoặc chưa ở bước này.', 409);
  if (!profile.maNhanVienSale) throw createServiceError('Phiếu chưa có nhân viên Sale phụ trách. Vui lòng liên hệ nhân viên.', 409);
  try {
    await run('dbo.SP_ChonPhongKhachChot', [
      { name: 'MaDangKy', type: sql.VarChar(6), value: maDangKy },
      { name: 'MaPhong', type: sql.VarChar(4), value: maPhong }]);
    const result = await run('dbo.SP_GuiYeuCauCocKemLuaChon', [
      { name: 'MaDangKy', type: sql.VarChar(6), value: maDangKy },
      { name: 'MaNhanVienSale', type: sql.VarChar(6), value: profile.maNhanVienSale },
      { name: 'HinhThucThue', type: sql.NVarChar(20), value: hinhThucThue },
      { name: 'DanhSachGiuong', type: sql.NVarChar(100), value: hinhThucThue === 'Ghép giường' ? giuongs.join(',') : null }]);
    const row = result.recordsets.at(-1)?.[0] || null;
    if (row) await notify('request', maDangKy);
    return row;
  } catch (error) { mapDatabaseError(error, KHACH_ERRORS); }
}

// Yêu cầu giữ chỗ của chính khách đang chờ quản lý xác nhận (tối đa 12 giờ, D-026). Sau khi quản lý duyệt,
// yêu cầu thành phiếu cọc và hiện ở danh sách phiếu cọc; bị từ chối/quá hạn thì hồ sơ về "Đã xem" nên không còn ở đây.
export async function getYeuCauGiuChoCuaKhach(user, query = executeQuery) {
  assertCustomer(user);
  const result = await query(`SELECT y.MaDangKy AS maDangKy, y.MaPhong AS maPhong, p.TenPhong AS tenPhong,
      cn.TenChiNhanh AS tenChiNhanh, y.HinhThucThue AS hinhThucThue, y.DanhSachGiuong AS danhSachGiuong, y.GuiLuc AS guiLuc
    FROM dbo.YeuCauDatCocChiTiet y
    JOIN dbo.PhieuDangKy d ON d.MaDangKy = y.MaDangKy
    JOIN dbo.Phong p ON p.MaPhong = y.MaPhong
    JOIN dbo.ChiNhanh cn ON cn.MaChiNhanh = p.MaChiNhanh
    WHERE d.MaKhachHang = @MaKhachHang AND d.TrangThai = N'Chờ xác nhận cọc'
    ORDER BY y.GuiLuc DESC`, [{ name: 'MaKhachHang', type: sql.VarChar(6), value: user.maNguoiDung }]);
  return result.recordset;
}
