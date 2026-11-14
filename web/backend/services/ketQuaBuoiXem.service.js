import { executeProcedure, sql } from '../database/connection.js';
import { createServiceError, mapDatabaseError } from './serviceErrors.js';
import { ensureViewingConfirmationReady } from './viewingConfirmation.service.js';

const outcomes = { 'da-xem': 'Đã xem', 'khach-khong-den': 'Khách không đến' };

// The authenticated actor is passed separately from the request body.
export async function ghiNhanKetQuaBuoiXem(id, data, user, run = executeProcedure) {
  if (!((user?.vaiTro === 'NhanVien' && user.chucVu === 'Sale') || user?.vaiTro === 'NhanVienSale')
    || !/^NV\d{4}$/.test(user.maNguoiDung || '') || !user.maChiNhanh) {
    throw createServiceError('Chỉ nhân viên Sale mới được ghi kết quả buổi xem.', 403);
  }
  const match = /^([A-Za-z]{2}\d{4})-([1-9]\d*)$/.exec(String(id || ''));
  const outcome = outcomes[data?.thaoTac];
  const note = data?.ghiChuXuLy == null ? null : data.ghiChuXuLy;
  if (!match || !Number.isSafeInteger(Number(match[2])) || Number(match[2]) > 2147483647 || !outcome) {
    throw createServiceError('Lịch xem phòng hoặc kết quả không hợp lệ.');
  }
  if (note !== null && (typeof note !== 'string' || note.length > 500)) {
    throw createServiceError('Ghi chú tối đa 500 ký tự.');
  }
  try {
    if (run === executeProcedure) await ensureViewingConfirmationReady();
    const result = await run('dbo.SP_GhiNhanKetQuaBuoiXem', [
      { name: 'MaNhanVien', type: sql.VarChar(6), value: user.maNguoiDung },
      { name: 'MaDangKy', type: sql.VarChar(6), value: match[1] },
      { name: 'STTLich', type: sql.Int, value: Number(match[2]) },
      { name: 'KetQua', type: sql.NVarChar(30), value: outcome },
      { name: 'GhiChu', type: sql.NVarChar(500), value: note?.trim() || null },
    ]);
    return result.recordset[0];
  } catch (error) {
    mapDatabaseError(error, { 50330: 403, 50331: 404, 50332: 409, 50333: 400, 50403: 409 });
  }
}
