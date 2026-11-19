import { executeQuery, getPool, sql } from '../database/connection.js';
import { createServiceError, mapDatabaseError } from './serviceErrors.js';
import { notifyDeposit } from '../integrations/mail/datCocNotifications.js';
import { sqlFirstCharges } from '../integrations/payment-sim/sql.js';
import { getDanhSachHDChoThuDauKy, ghiNhanThuDauKy } from './nhanPhong.service.js';

// Kế toán thu tiền mặt cho hóa đơn đặt cọc và hóa đơn nhận phòng (kỳ đầu) (D-080).
// Kế toán chọn hóa đơn, xem rõ thông tin, nhập số tiền đã nhận; số tiền phải đúng số cần thu.
const LOAI = { datCoc: 'dat-coc', nhanPhong: 'nhan-phong' };
const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;

function requireAccountant(user) {
  if (user?.vaiTro !== 'NhanVien' || user?.chucVu !== 'Kế toán') throw createServiceError('Chỉ kế toán được thu tiền mặt', 403);
  return String(user.maNguoiDung);
}

const staffParam = (staff) => [{ name: 'staff', type: sql.VarChar(6), value: staff }];

async function datCocChoThu(staff) {
  const result = await executeQuery(`
    SELECT d.MaPhieuDatCoc AS ma, d.SoTienCoc AS soTien, d.ThoiHanThanhToan AS hanThanhToan,
      nd.HoTen AS hoTen, nd.SDT AS soDienThoai,
      STRING_AGG(p.TenPhong + CASE WHEN c.MaGiuong IS NOT NULL THEN N' - Giường ' + CAST(c.MaGiuong AS NVARCHAR(3)) ELSE N'' END, N', ') AS phong
    FROM dbo.PhieuDatCoc d
    JOIN dbo.ChiTietDatCoc c ON c.MaPhieuDatCoc = d.MaPhieuDatCoc
    JOIN dbo.Phong p ON p.MaPhong = c.MaPhong
    JOIN dbo.NguoiDung nd ON nd.MaNguoiDung = d.MaKhachHang
    JOIN dbo.NhanVien nv ON nv.MaNhanVien = @staff AND nv.MaChiNhanh = p.MaChiNhanh
    WHERE d.TrangThaiCoc = N'Hiệu lực' AND d.TrangThaiThanhToan = N'Chờ TT'
      AND d.MaNhanVienKeToan IS NOT NULL AND d.ThoiHanThanhToan >= GETDATE()
    GROUP BY d.MaPhieuDatCoc, d.SoTienCoc, d.ThoiHanThanhToan, nd.HoTen, nd.SDT
    ORDER BY d.ThoiHanThanhToan`, staffParam(staff));
  return result.recordset.map((row) => ({ loai: LOAI.datCoc, ...row, soTien: Number(row.soTien) }));
}

async function nhanPhongChoThu(staff) {
  const [rows, scope] = await Promise.all([
    getDanhSachHDChoThuDauKy({ trangThaiThuTien: 'Chưa thanh toán' }),
    executeQuery(`SELECT DISTINCT hd.MaHopDong AS ma FROM dbo.HopDongThue hd
      JOIN dbo.ChiTietDatCoc c ON c.MaPhieuDatCoc = hd.MaPhieuCoc
      JOIN dbo.Phong p ON p.MaPhong = c.MaPhong
      JOIN dbo.NhanVien nv ON nv.MaNhanVien = @staff AND nv.MaChiNhanh = p.MaChiNhanh`, staffParam(staff)),
  ]);
  const inBranch = new Set(scope.recordset.map((row) => row.ma));
  const result = [];
  for (const row of rows.filter((item) => inBranch.has(item.MaHopDong))) {
    const amount = await sqlFirstCharges.amount(row.MaHopDong).catch(() => NaN);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    result.push({ loai: LOAI.nhanPhong, ma: row.MaHopDong, soTien: amount, hoTen: row.HoTenKhachHang, soDienThoai: row.SDT, phong: row.PhongGiuong, hanThanhToan: null });
  }
  return result;
}

export async function danhSachChoThu(user) {
  const staff = requireAccountant(user);
  const [datCoc, nhanPhong] = await Promise.all([datCocChoThu(staff), nhanPhongChoThu(staff)]);
  return [...datCoc, ...nhanPhong];
}

function parseAmount(value) {
  const amount = Number(value);
  if (value == null || value === '' || !Number.isFinite(amount) || amount <= 0) throw createServiceError('Vui lòng nhập số tiền đã nhận.', 400);
  return Math.round(amount);
}

async function thuDatCoc(staff, ma, amount) {
  const row = (await executeQuery(`
    SELECT TOP (1) d.SoTienCoc AS soTien FROM dbo.PhieuDatCoc d
    JOIN dbo.ChiTietDatCoc c ON c.MaPhieuDatCoc = d.MaPhieuDatCoc
    JOIN dbo.Phong p ON p.MaPhong = c.MaPhong
    JOIN dbo.NhanVien nv ON nv.MaNhanVien = @staff AND nv.MaChiNhanh = p.MaChiNhanh
    WHERE d.MaPhieuDatCoc = @ma AND d.TrangThaiCoc = N'Hiệu lực' AND d.TrangThaiThanhToan = N'Chờ TT'
      AND d.MaNhanVienKeToan IS NOT NULL AND d.ThoiHanThanhToan >= GETDATE()`,
  [...staffParam(staff), { name: 'ma', type: sql.VarChar(6), value: ma }])).recordset[0];
  if (!row) throw createServiceError('Phiếu cọc không còn chờ thu, đã hết hạn hoặc không thuộc chi nhánh của bạn.', 409);
  if (amount !== Math.round(Number(row.soTien))) throw createServiceError(`Số tiền đã nhận phải đúng số cần thu ${money(row.soTien)}.`, 400);
  const tx = new sql.Transaction(await getPool());
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const call = (name, args) => {
      const request = new sql.Request(tx);
      for (const [key, type, value] of args) request.input(key, type, value);
      return request.execute(name);
    };
    // Dùng đúng các thủ tục Web2 sẵn có (như đường Sale thu tiền mặt), chứng từ ghi người thu thay cho ảnh biên nhận.
    await call('dbo.SP_ChonPhuongThucThanhToanCoc', [['PhieuId', sql.NVarChar(30), ma], ['PhuongThucThanhToan', sql.NVarChar(20), 'Tiền mặt']]);
    await call('dbo.SP_CapNhatMinhChungThanhToanCoc', [['PhieuId', sql.NVarChar(30), ma], ['ChungTuThanhToan', sql.NVarChar(500), `ke-toan-thu-tien-mat:${ma}:${staff}`]]);
    await call('dbo.SP_XacNhanThanhToanCoc', [['PhieuId', sql.NVarChar(30), ma], ['HopLe', sql.Bit, true],
      ['GhiChu', sql.NVarChar(sql.MAX), null], ['QuanLyXacNhanThanhToanId', sql.NVarChar(20), staff]]);
    // Tiền mặt do chính kế toán nhận nên coi như đã vào quỹ.
    await call('dbo.SP_GhiNhanNopQuyCoc', [['MaPhieu', sql.VarChar(6), ma], ['MaKeToan', sql.VarChar(6), staff]]);
    await tx.commit();
  } catch (error) {
    await tx.rollback().catch(() => {});
    throw error;
  }
  const email = await notifyDeposit('paid', ma);
  return { loai: LOAI.datCoc, ma, soTien: amount, email };
}

async function thuNhanPhong(staff, ma, amount) {
  const due = await sqlFirstCharges.amount(ma).catch(() => NaN);
  if (!Number.isFinite(due) || due <= 0) throw createServiceError('Hợp đồng này không còn khoản thu kỳ đầu cần thu.', 409);
  if (amount !== Math.round(due)) throw createServiceError(`Số tiền đã nhận phải đúng số cần thu ${money(due)}.`, 400);
  await ghiNhanThuDauKy({ maHopDong: ma, soTienThucNop: amount, phuongThucTT: 'Tiền mặt', maNhanVienKeToan: staff, ghiChu: 'Kế toán thu tiền mặt' });
  return { loai: LOAI.nhanPhong, ma, soTien: amount };
}

export async function ghiNhanThuTienMat(user, { loai, ma, soTienDaNhan } = {}) {
  const staff = requireAccountant(user);
  const code = String(ma || '').trim();
  if (!/^[A-Za-z0-9]{1,6}$/.test(code)) throw createServiceError('Vui lòng chọn hóa đơn cần thu.', 400);
  const amount = parseAmount(soTienDaNhan);
  try {
    if (loai === LOAI.datCoc) return await thuDatCoc(staff, code, amount);
    if (loai === LOAI.nhanPhong) return await thuNhanPhong(staff, code, amount);
  } catch (error) {
    if (error.statusCode) throw error;
    mapDatabaseError(error, { 50220: 409, 50221: 409, 50222: 409, 50223: 400, 50230: 404, 50231: 409, 50232: 409, 50234: 409, 50275: 409, 50310: 403, 50311: 409, 50314: 403 });
  }
  throw createServiceError('Loại hóa đơn không hợp lệ.', 400);
}
