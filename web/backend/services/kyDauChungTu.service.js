import { executeQuery, sql } from '../database/connection.js';
import { createServiceError } from './serviceErrors.js';
import { publicUrlFor } from '../middleware/upload.middleware.js';

// Minh chứng thanh toán khoản thu kỳ đầu khi nhận phòng. Khách tải lên (ảnh/PDF), kế toán xem rồi mới ghi nhận khoản thu.
const CONTRACT_ID = /^[A-Za-z0-9]{1,6}$/;

function assertCustomer(user) {
  if (user?.vaiTro !== 'KhachHang' || !user.maNguoiDung) throw createServiceError('Chỉ khách hàng mới dùng chức năng này.', 403);
}

function toProof(row) {
  return row ? { maHopDong: row.maHopDong, duongDan: row.duongDan, tenTep: row.tenTep, ngayGui: row.ngayGui } : null;
}

const SELECT = 'SELECT MaHopDong AS maHopDong, DuongDan AS duongDan, TenTep AS tenTep, NgayGui AS ngayGui FROM dbo.ChungTuKyDau WHERE MaHopDong = @MaHopDong';

export async function layChungTuKyDauCuaKhach(user, maHopDong, { query = executeQuery } = {}) {
  assertCustomer(user);
  const id = String(maHopDong || '').trim();
  if (!CONTRACT_ID.test(id)) throw createServiceError('Mã hợp đồng không hợp lệ.');
  const result = await query(`${SELECT} AND EXISTS (SELECT 1 FROM dbo.HopDongThue h WHERE h.MaHopDong = @MaHopDong AND h.MaKhachHang = @MaKhachHang)`, [
    { name: 'MaHopDong', type: sql.VarChar(6), value: id },
    { name: 'MaKhachHang', type: sql.VarChar(6), value: user.maNguoiDung },
  ]);
  return toProof(result.recordset?.[0]);
}

// Kế toán xem minh chứng của một hợp đồng (route của kế toán đã được chặn theo vai trò ở nhanPhong.routes).
export async function layChungTuKyDau(maHopDong, { query = executeQuery } = {}) {
  const id = String(maHopDong || '').trim();
  if (!CONTRACT_ID.test(id)) throw createServiceError('Mã hợp đồng không hợp lệ.');
  const result = await query(SELECT, [{ name: 'MaHopDong', type: sql.VarChar(6), value: id }]);
  return toProof(result.recordset?.[0]);
}

export async function luuChungTuKyDau(user, maHopDong, file, { query = executeQuery } = {}) {
  assertCustomer(user);
  const id = String(maHopDong || '').trim();
  if (!CONTRACT_ID.test(id)) throw createServiceError('Mã hợp đồng không hợp lệ.');
  if (!file?.filename) throw createServiceError('Vui lòng chọn ảnh hoặc PDF chứng từ thanh toán.');
  const contract = (await query(`SELECT hd.MaKhachHang AS maKhachHang, hd.TrangThai AS trangThai,
      CAST(CASE WHEN EXISTS (SELECT 1 FROM dbo.HoaDon h WHERE h.MaHopDong = hd.MaHopDong
        AND h.KyThanhToan = CONVERT(char(7), hd.NgayBatDau, 120) AND h.TrangThai = N'Đã TT') THEN 1 ELSE 0 END AS BIT) AS daThu
    FROM dbo.HopDongThue hd WHERE hd.MaHopDong = @MaHopDong`, [{ name: 'MaHopDong', type: sql.VarChar(6), value: id }])).recordset?.[0];
  if (!contract || contract.maKhachHang !== user.maNguoiDung) throw createServiceError('Không tìm thấy hợp đồng của bạn.', 404);
  if (contract.trangThai !== 'Hiệu lực') throw createServiceError('Hợp đồng chưa ở trạng thái chờ thu kỳ đầu.', 409);
  if (contract.daThu) throw createServiceError('Khoản thu kỳ đầu đã được thanh toán.', 409);
  const params = [
    { name: 'MaHopDong', type: sql.VarChar(6), value: id },
    { name: 'DuongDan', type: sql.NVarChar(300), value: publicUrlFor(file.filename) },
    { name: 'TenTep', type: sql.NVarChar(200), value: String(file.originalname || file.filename).slice(0, 200) },
  ];
  await query(`MERGE dbo.ChungTuKyDau AS t USING (SELECT @MaHopDong AS MaHopDong) AS s ON t.MaHopDong = s.MaHopDong
    WHEN MATCHED THEN UPDATE SET DuongDan = @DuongDan, TenTep = @TenTep, NgayGui = SYSDATETIME()
    WHEN NOT MATCHED THEN INSERT (MaHopDong, DuongDan, TenTep) VALUES (@MaHopDong, @DuongDan, @TenTep);`, params);
  return layChungTuKyDauCuaKhach(user, id, { query });
}

// J-C147: minh chứng chuyển khoản cho hóa đơn tháng (khách tự thanh toán, kế toán xem rồi xác nhận).
const INVOICE_ID = /^[A-Za-z0-9]{1,6}$/;
const PROOF_SELECT = 'SELECT c.MaHoaDon AS maHoaDon, c.DuongDan AS duongDan, c.TenTep AS tenTep, c.NgayGui AS ngayGui FROM dbo.ChungTuHoaDon c';

export async function layChungTuHoaDonCuaKhach(user, maHoaDon, { query = executeQuery } = {}) {
  assertCustomer(user);
  const id = String(maHoaDon || '').trim();
  if (!INVOICE_ID.test(id)) throw createServiceError('Mã hóa đơn không hợp lệ.');
  const result = await query(`${PROOF_SELECT} JOIN dbo.HoaDon hd ON hd.MaHoaDon = c.MaHoaDon JOIN dbo.HopDongThue h ON h.MaHopDong = hd.MaHopDong
    WHERE c.MaHoaDon = @MaHoaDon AND h.MaKhachHang = @MaKhachHang`, [
    { name: 'MaHoaDon', type: sql.VarChar(6), value: id }, { name: 'MaKhachHang', type: sql.VarChar(6), value: user.maNguoiDung },
  ]);
  return result.recordset?.[0] || null;
}

export async function luuChungTuHoaDon(user, maHoaDon, file, { query = executeQuery } = {}) {
  assertCustomer(user);
  const id = String(maHoaDon || '').trim();
  if (!INVOICE_ID.test(id)) throw createServiceError('Mã hóa đơn không hợp lệ.');
  if (!file?.filename) throw createServiceError('Vui lòng chọn ảnh hoặc PDF chứng từ thanh toán.');
  const invoice = (await query(`SELECT h.MaKhachHang AS maKhachHang, hd.TrangThai AS trangThai FROM dbo.HoaDon hd
    JOIN dbo.HopDongThue h ON h.MaHopDong = hd.MaHopDong WHERE hd.MaHoaDon = @MaHoaDon`, [{ name: 'MaHoaDon', type: sql.VarChar(6), value: id }])).recordset?.[0];
  if (!invoice || invoice.maKhachHang !== user.maNguoiDung) throw createServiceError('Không tìm thấy hóa đơn của bạn.', 404);
  if (!['Chưa TT', 'Nợ'].includes(invoice.trangThai)) throw createServiceError('Hóa đơn không còn ở trạng thái chờ thanh toán.', 409);
  await query(`MERGE dbo.ChungTuHoaDon AS t USING (SELECT @MaHoaDon AS MaHoaDon) AS s ON t.MaHoaDon = s.MaHoaDon
    WHEN MATCHED THEN UPDATE SET DuongDan = @DuongDan, TenTep = @TenTep, NgayGui = SYSDATETIME()
    WHEN NOT MATCHED THEN INSERT (MaHoaDon, DuongDan, TenTep) VALUES (@MaHoaDon, @DuongDan, @TenTep);`, [
    { name: 'MaHoaDon', type: sql.VarChar(6), value: id },
    { name: 'DuongDan', type: sql.NVarChar(300), value: publicUrlFor(file.filename) },
    { name: 'TenTep', type: sql.NVarChar(200), value: String(file.originalname || file.filename).slice(0, 200) },
  ]);
  return layChungTuHoaDonCuaKhach(user, id, { query });
}
