import { executeProcedure, sql } from '../database/connection.js';
import { createServiceError, mapDatabaseError } from './serviceErrors.js';

const isAdmin = (user = {}) => user.vaiTro === 'Admin' || user.chucVu === 'Admin';
const text = (value) => String(value ?? '').trim();

export function phamViDieuPhoi(user = {}, requestedBranch = '') {
  const requested = text(requestedBranch);
  if (isAdmin(user)) return { admin: true, maChiNhanh: requested || null, maNhanVien: user.maNguoiDung || null };
  if (user.vaiTro === 'NhanVien' && user.chucVu === 'Quản lý' && user.maChiNhanh) {
    if (requested && requested !== user.maChiNhanh) {
      throw createServiceError('Quản lý chỉ được xem và điều chuyển tài sản trong chi nhánh của mình.', 403);
    }
    return { admin: false, maChiNhanh: user.maChiNhanh, maNhanVien: user.maNguoiDung };
  }
  throw createServiceError('Bạn không có quyền sử dụng chức năng điều phối tài sản.', 403);
}
function handleDatabaseError(error) {
  mapDatabaseError(error, {
    51401: 400, 51402: 400, 51403: 400, 51404: 400,
    51405: 403, 51406: 400, 51407: 400, 51408: 400,
    51409: 403, 51410: 403, 51411: 409, 51412: 404,
    51413: 409, 51414: 404, 51415: 409, 51416: 409,
  });
}

export async function layTonKho(user, filters = {}, { execute = executeProcedure } = {}) {
  const scope = phamViDieuPhoi(user, filters.chiNhanh);
  try {
    const result = await execute('dbo.SP_DieuPhoiTaiSan_DanhSachKho', [
      { name: 'MaChiNhanh', type: sql.VarChar(6), value: scope.maChiNhanh },
    ]);
    return result.recordset || [];
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function layTaiSanPhong(user, filters = {}, { execute = executeProcedure } = {}) {
  const scope = phamViDieuPhoi(user, filters.chiNhanh);
  try {
    const result = await execute('dbo.SP_DieuPhoiTaiSan_DanhSachPhong', [
      { name: 'MaChiNhanh', type: sql.VarChar(6), value: scope.maChiNhanh },
      { name: 'MaTaiSan', type: sql.VarChar(6), value: text(filters.maTaiSan) || null },
    ]);
    return result.recordset || [];
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function layLichSuDieuPhoi(user, filters = {}, { execute = executeProcedure } = {}) {
  const scope = phamViDieuPhoi(user, filters.chiNhanh);
  try {
    const result = await execute('dbo.SP_DieuPhoiTaiSan_LichSu', [
      { name: 'MaChiNhanh', type: sql.VarChar(6), value: scope.maChiNhanh },
      { name: 'MaTaiSan', type: sql.VarChar(6), value: text(filters.maTaiSan) || null },
      { name: 'MaPhong', type: sql.VarChar(4), value: text(filters.maPhong) || null },
    ]);
    return result.recordset || [];
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function chuyenTaiSan(user, data = {}, { execute = executeProcedure } = {}) {
  const scope = phamViDieuPhoi(user, data.chiNhanh);
  if (scope.admin) throw createServiceError('Admin chỉ xem điều phối tài sản; Quản lý chi nhánh là người thực hiện chuyển.', 403);

  const soLuong = Number(data.soLuong);
  if (!Number.isInteger(soLuong) || soLuong <= 0) {
    throw createServiceError('Số lượng điều chuyển phải là số nguyên lớn hơn 0.', 400);
  }
  if (!text(data.lyDo)) throw createServiceError('Vui lòng nhập lý do điều chuyển.', 400);
  if (!text(data.maTaiSan)) throw createServiceError('Vui lòng chọn tài sản.', 400);

  try {
    const result = await execute('dbo.SP_DieuPhoiTaiSan_Chuyen', [
      { name: 'MaChiNhanh', type: sql.VarChar(6), value: scope.maChiNhanh },
      { name: 'LoaiThaoTac', type: sql.NVarChar(30), value: text(data.loaiThaoTac).toUpperCase() },
      { name: 'MaPhongNguon', type: sql.VarChar(4), value: text(data.maPhongNguon) || null },
      { name: 'MaPhongDich', type: sql.VarChar(4), value: text(data.maPhongDich) || null },
      { name: 'MaTaiSan', type: sql.VarChar(6), value: text(data.maTaiSan) },
      { name: 'SoLuong', type: sql.Int, value: soLuong },
      { name: 'LyDo', type: sql.NVarChar(500), value: text(data.lyDo) },
      { name: 'MaNhanVien', type: sql.VarChar(6), value: scope.maNhanVien },
    ]);
    return result.recordset?.[0] || null;
  } catch (error) {
    handleDatabaseError(error);
  }
}

