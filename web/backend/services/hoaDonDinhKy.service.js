import { executeQuery, sql } from '../database/connection.js';
import { createServiceError } from './serviceErrors.js';

// Hóa đơn định kỳ cho kế toán (theo màn "Hóa đơn Định kỳ" của nhóm Hằng): chốt chỉ số điện nước theo phòng,
// cộng tiền phòng + dịch vụ đã đăng ký + phí phát sinh đã xác nhận thành hóa đơn tháng; danh sách hóa đơn và thu tiền.
// Dữ liệu dùng bảng sẵn có PhieuGhiChiSo, HoaDon, ChiTietHoaDon, DichVuHopDong và bảng mới PhiPhatSinh.

const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;
const CONTRACT_ID = /^[A-Za-z0-9]{1,6}$/;
const INVOICE_ID = /^[A-Za-z0-9]{1,6}$/;
const FEE_ID = /^[A-Za-z0-9-]{3,20}$/;
const MIN_GRACE_DAYS = 7;

const pad = (n) => String(n).padStart(2, '0');
export const toDateOnly = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const periodOf = (value) => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? String(value).slice(0, 7) : `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
};
export function nextPeriod(period) {
  const [y, m] = period.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`;
}

// Hạn thanh toán: ngày 10 của tháng kế tiếp kỳ, nhưng không sớm hơn ngày lập + 7 ngày (như nhóm Hằng).
export function dueDateFor(period, today = new Date()) {
  const [y, m] = period.split('-').map(Number);
  const scheduled = toDateOnly(new Date(y, m, 10));
  const floor = new Date(today.getFullYear(), today.getMonth(), today.getDate() + MIN_GRACE_DAYS);
  const floorText = toDateOnly(floor);
  return scheduled > floorText ? scheduled : floorText;
}

// Ngày ghi chỉ số phải rơi vào tháng của kỳ (trigger đặt KyGhi = tháng của NgayGhi).
export function readingDateFor(period, today = new Date()) {
  const current = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
  const [y, m] = period.split('-').map(Number);
  if (period === current) return toDateOnly(today);
  if (period < current) return toDateOnly(new Date(y, m, 0));
  return `${period}-01`;
}

// Kỳ cần lập tiếp theo: tháng sau kỳ hóa đơn mới nhất, hoặc tháng bắt đầu hợp đồng nếu chưa có hóa đơn nào.
export function periodToBill(lastPeriod, startDate) {
  return lastPeriod && PERIOD.test(lastPeriod) ? nextPeriod(lastPeriod) : periodOf(startDate);
}

export function statusGroup(row, today = toDateOnly(new Date())) {
  if (row.trangThai === 'Đã TT') return 'paid';
  const due = row.ngayHanTT ? String(row.ngayHanTT instanceof Date ? row.ngayHanTT.toISOString() : row.ngayHanTT).slice(0, 10) : '';
  if (row.trangThai === 'Nợ' || (due && due < today)) return 'overdue';
  return 'pending';
}

function assertAccountant(user) {
  if (user?.vaiTro !== 'NhanVien' || user.chucVu !== 'Kế toán' || !user.maChiNhanh) {
    throw createServiceError('Chức năng này chỉ dành cho nhân viên kế toán của chi nhánh.', 403);
  }
}

const branchParam = (user) => ({ name: 'MaChiNhanh', type: sql.VarChar(6), value: user.maChiNhanh });
const IN_BRANCH = `EXISTS (SELECT 1 FROM dbo.ChiTietDatCoc cb JOIN dbo.Phong pb ON pb.MaPhong = cb.MaPhong
  WHERE cb.MaPhieuDatCoc = h.MaPhieuCoc AND pb.MaChiNhanh = @MaChiNhanh)`;

const CONTRACT_SELECT = `SELECT h.MaHopDong AS maHopDong, h.GiaThue AS giaThue, h.SoGiuongThue AS soGiuongThue,
    h.NgayBatDau AS ngayBatDau, h.NgayKetThuc AS ngayKetThuc, p.HinhThucThue AS hinhThucThue,
    nd.HoTen AS hoTen, nd.SDT AS sdt, ph.MaPhong AS maPhong, ph.TenPhong AS tenPhong,
    ph.MaChiNhanh AS maChiNhanh, cn.TenChiNhanh AS tenChiNhanh,
    (SELECT STRING_AGG(c.MaGiuong, ', ') FROM dbo.ChiTietDatCoc c WHERE c.MaPhieuDatCoc = h.MaPhieuCoc AND c.MaGiuong IS NOT NULL) AS giuong,
    (SELECT MAX(x.KyThanhToan) FROM dbo.HoaDon x WHERE x.MaHopDong = h.MaHopDong
       AND x.KyThanhToan LIKE '[0-9][0-9][0-9][0-9]-[0-9][0-9]') AS kyCuoi
  FROM dbo.HopDongThue h
  JOIN dbo.PhieuDatCoc p ON p.MaPhieuDatCoc = h.MaPhieuCoc
  JOIN dbo.NguoiDung nd ON nd.MaNguoiDung = h.MaKhachHang
  CROSS APPLY (SELECT TOP 1 c.MaPhong FROM dbo.ChiTietDatCoc c WHERE c.MaPhieuDatCoc = h.MaPhieuCoc ORDER BY c.MaPhong) r
  JOIN dbo.Phong ph ON ph.MaPhong = r.MaPhong
  JOIN dbo.ChiNhanh cn ON cn.MaChiNhanh = ph.MaChiNhanh`;

function toContract(row) {
  const kyCanLap = periodToBill(row.kyCuoi, row.ngayBatDau);
  return {
    maHopDong: row.maHopDong, hoTen: row.hoTen, sdt: row.sdt, maPhong: row.maPhong,
    tenPhong: row.tenPhong, giuong: row.giuong || '', hinhThucThue: row.hinhThucThue,
    giaThue: Number(row.giaThue) || 0, soGiuongThue: Number(row.soGiuongThue) || 1,
    maChiNhanh: row.maChiNhanh, tenChiNhanh: row.tenChiNhanh, kyCuoi: row.kyCuoi || null, kyCanLap,
    hetHan: kyCanLap > periodOf(row.ngayKetThuc),
  };
}

export async function danhSachHopDong(user, { query = executeQuery } = {}) {
  assertAccountant(user);
  const result = await query(`${CONTRACT_SELECT}
    WHERE h.TrangThai = N'Hiệu lực' AND ph.MaChiNhanh = @MaChiNhanh ORDER BY h.MaHopDong`, [branchParam(user)]);
  return (result.recordset || []).map(toContract).filter((c) => !c.hetHan);
}

async function loadContract(user, maHopDong, query) {
  const id = String(maHopDong || '').trim();
  if (!CONTRACT_ID.test(id)) throw createServiceError('Mã hợp đồng không hợp lệ.');
  const row = (await query(`${CONTRACT_SELECT}
    WHERE h.MaHopDong = @MaHopDong AND h.TrangThai = N'Hiệu lực' AND ph.MaChiNhanh = @MaChiNhanh`, [
    { name: 'MaHopDong', type: sql.VarChar(6), value: id }, branchParam(user),
  ])).recordset?.[0];
  if (!row) throw createServiceError('Không tìm thấy hợp đồng đang hiệu lực trong chi nhánh.', 404);
  return toContract(row);
}

// Tỷ lệ chia điện nước: nguyên phòng chịu toàn bộ; ghép giường chia theo số giường thuê trong phòng.
async function shareOf(contract, query) {
  if (contract.hinhThucThue !== 'Ghép giường') return 1;
  const total = Number((await query(`SELECT SUM(h.SoGiuongThue) AS tong FROM dbo.HopDongThue h
    WHERE h.TrangThai = N'Hiệu lực' AND EXISTS (SELECT 1 FROM dbo.ChiTietDatCoc c
      WHERE c.MaPhieuDatCoc = h.MaPhieuCoc AND c.MaPhong = @MaPhong AND c.MaGiuong IS NOT NULL)`, [
    { name: 'MaPhong', type: sql.VarChar(4), value: contract.maPhong },
  ])).recordset?.[0]?.tong) || 0;
  return total > 0 ? Math.min(1, contract.soGiuongThue / total) : 1;
}

async function readingsFor(contract, period, query) {
  const params = [{ name: 'MaPhong', type: sql.VarChar(4), value: contract.maPhong }, { name: 'Ky', type: sql.VarChar(7), value: period }];
  const cols = `MaPhieuGhi AS maPhieuGhi, KyGhi AS kyGhi, ChiSoDienDau AS dienDau, ChiSoDienCuoi AS dienCuoi,
    ChiSoNuocDau AS nuocDau, ChiSoNuocCuoi AS nuocCuoi`;
  const [current, previous] = await Promise.all([
    query(`SELECT TOP 1 ${cols} FROM dbo.PhieuGhiChiSo WHERE MaPhong = @MaPhong AND KyGhi = @Ky`, params),
    query(`SELECT TOP 1 ${cols} FROM dbo.PhieuGhiChiSo WHERE MaPhong = @MaPhong AND KyGhi < @Ky ORDER BY KyGhi DESC`, params),
  ]);
  const num = (row) => row && Object.fromEntries(Object.entries(row).map(([k, v]) => [k, /dien|nuoc/.test(k) ? Number(v) : v]));
  return { current: num(current.recordset?.[0]) || null, previous: num(previous.recordset?.[0]) || null };
}

export async function chiTietLapHoaDon(user, maHopDong, { query = executeQuery } = {}) {
  assertAccountant(user);
  const contract = await loadContract(user, maHopDong, query);
  if (contract.hetHan) throw createServiceError('Hợp đồng đã lập hóa đơn tới hết thời hạn.', 409);
  const period = contract.kyCanLap;
  const idParam = [{ name: 'MaHopDong', type: sql.VarChar(6), value: contract.maHopDong }];
  const [services, fees, readings, tyLe] = await Promise.all([
    query(`SELECT d.MaChiTietDVHD AS maChiTietDVHD, v.TenDichVu AS tenDichVu, v.DonViTinh AS donViTinh, v.DonGia AS donGia,
        CASE WHEN TRY_CAST(d.GhiChu AS DECIMAL(10,2)) > 0 THEN TRY_CAST(d.GhiChu AS DECIMAL(10,2)) ELSE 1 END AS soLuong
      FROM dbo.DichVuHopDong d JOIN dbo.DichVu v ON v.MaDichVu = d.MaDichVu WHERE d.MaHopDong = @MaHopDong ORDER BY d.MaChiTietDVHD`, idParam),
    query(`SELECT MaPhi AS maPhi, TenPhi AS tenPhi, SoTien AS soTien, TrangThai AS trangThai, NgayGhiNhan AS ngayGhiNhan
      FROM dbo.PhiPhatSinh WHERE MaHopDong = @MaHopDong AND TrangThai <> N'Đã tính' ORDER BY NgayTao`, idParam),
    readingsFor(contract, period, query),
    shareOf(contract, query),
  ]);
  return {
    hopDong: contract, kyThanhToan: period, tyLeChia: tyLe, hanThanhToan: dueDateFor(period),
    chiSo: readings,
    dichVu: (services.recordset || []).map((s) => ({ ...s, donGia: Number(s.donGia) || 0, soLuong: Number(s.soLuong) || 1 })),
    phiPhatSinh: (fees.recordset || []).map((f) => ({ ...f, soTien: Number(f.soTien) || 0 })),
  };
}

const reading = (value, label) => {
  const n = Number(value);
  if (value === '' || value === null || value === undefined || !Number.isFinite(n) || n < 0) throw createServiceError(`${label} phải là số không âm.`);
  return Math.round(n * 100) / 100;
};

export async function lapHoaDon(user, data = {}, { query = executeQuery, today = new Date() } = {}) {
  assertAccountant(user);
  const detail = await chiTietLapHoaDon(user, data.maHopDong, { query });
  const { hopDong: contract, kyThanhToan: period } = detail;
  if (data.kyThanhToan && data.kyThanhToan !== period) throw createServiceError(`Kỳ cần lập của hợp đồng là ${period}.`, 409);
  if (detail.phiPhatSinh.some((f) => f.trangThai === 'Chưa xác nhận')) {
    throw createServiceError('Còn khoản phí phát sinh chưa xác nhận. Vui lòng xác nhận hoặc xóa trước khi lập hóa đơn.', 409);
  }
  // Phòng đã có chỉ số của kỳ (hợp đồng khác cùng phòng đã chốt) thì dùng lại, không ghi đè.
  let dien = { dau: 0, cuoi: 0 }, nuoc = { dau: 0, cuoi: 0 };
  if (!detail.chiSo.current) {
    const prev = detail.chiSo.previous;
    dien = { dau: prev ? prev.dienCuoi : reading(data.chiSoDienCu ?? 0, 'Chỉ số điện cũ'), cuoi: reading(data.chiSoDienMoi, 'Chỉ số điện mới') };
    nuoc = { dau: prev ? prev.nuocCuoi : reading(data.chiSoNuocCu ?? 0, 'Chỉ số nước cũ'), cuoi: reading(data.chiSoNuocMoi, 'Chỉ số nước mới') };
    if (dien.cuoi < dien.dau) throw createServiceError('Chỉ số điện mới không được nhỏ hơn chỉ số cũ.');
    if (nuoc.cuoi < nuoc.dau) throw createServiceError('Chỉ số nước mới không được nhỏ hơn chỉ số cũ.');
  }
  const params = [
    { name: 'MaHopDong', type: sql.VarChar(6), value: contract.maHopDong },
    { name: 'MaPhong', type: sql.VarChar(4), value: contract.maPhong },
    { name: 'Ky', type: sql.VarChar(7), value: period },
    { name: 'NgayGhi', type: sql.Date, value: readingDateFor(period, today) },
    { name: 'NgayHanTT', type: sql.Date, value: dueDateFor(period, today) },
    { name: 'DienDau', type: sql.Decimal(10, 2), value: dien.dau },
    { name: 'DienCuoi', type: sql.Decimal(10, 2), value: dien.cuoi },
    { name: 'NuocDau', type: sql.Decimal(10, 2), value: nuoc.dau },
    { name: 'NuocCuoi', type: sql.Decimal(10, 2), value: nuoc.cuoi },
    { name: 'TyLe', type: sql.Decimal(10, 4), value: detail.tyLeChia },
    { name: 'GiaThue', type: sql.Decimal(15, 2), value: contract.giaThue },
    { name: 'MaNV', type: sql.VarChar(6), value: user.maNguoiDung },
  ];
  let result;
  try {
    result = await query(`SET XACT_ABORT ON;
BEGIN TRAN;
IF EXISTS (SELECT 1 FROM dbo.HoaDon WITH (UPDLOCK, HOLDLOCK) WHERE MaHopDong = @MaHopDong AND KyThanhToan = @Ky)
  THROW 51001, N'Hợp đồng đã có hóa đơn cho kỳ này.', 1;
IF EXISTS (SELECT 1 FROM dbo.PhiPhatSinh WITH (UPDLOCK, HOLDLOCK) WHERE MaHopDong = @MaHopDong AND TrangThai = N'Chưa xác nhận')
  THROW 51002, N'Còn khoản phí phát sinh chưa xác nhận.', 1;
DECLARE @MaPhieuGhi VARCHAR(6) = (SELECT TOP 1 MaPhieuGhi FROM dbo.PhieuGhiChiSo WITH (UPDLOCK, HOLDLOCK) WHERE MaPhong = @MaPhong AND KyGhi = @Ky);
IF @MaPhieuGhi IS NULL
BEGIN
  DECLARE @n INT = (SELECT ISNULL(MAX(CAST(SUBSTRING(MaPhieuGhi, 3, 4) AS INT)), 0) FROM dbo.PhieuGhiChiSo WITH (UPDLOCK, HOLDLOCK)
    WHERE MaPhieuGhi LIKE 'PG[0-9][0-9][0-9][0-9]');
  SET @MaPhieuGhi = 'PG' + RIGHT('0000' + CAST(@n + 1 AS VARCHAR(4)), 4);
  INSERT dbo.PhieuGhiChiSo (MaPhieuGhi, KyGhi, NgayGhi, ChiSoNuocDau, ChiSoNuocCuoi, ChiSoDienDau, ChiSoDienCuoi, TrangThai, MaNhanVienQuanLy, MaPhong)
  VALUES (@MaPhieuGhi, @Ky, @NgayGhi, @NuocDau, @NuocCuoi, @DienDau, @DienCuoi, N'Đã Lập HD', @MaNV, @MaPhong);
END;
DECLARE @DienDung DECIMAL(10, 2), @NuocDung DECIMAL(10, 2);
SELECT @DienDung = ChiSoDienCuoi - ChiSoDienDau, @NuocDung = ChiSoNuocCuoi - ChiSoNuocDau FROM dbo.PhieuGhiChiSo WHERE MaPhieuGhi = @MaPhieuGhi;
DECLARE @h INT = (SELECT ISNULL(MAX(CAST(SUBSTRING(MaHoaDon, 3, 4) AS INT)), 0) FROM dbo.HoaDon WITH (UPDLOCK, HOLDLOCK)
  WHERE MaHoaDon LIKE 'HO[0-9][0-9][0-9][0-9]');
DECLARE @MaHoaDon VARCHAR(6) = 'HO' + RIGHT('0000' + CAST(@h + 1 AS VARCHAR(4)), 4);
INSERT dbo.HoaDon (MaHoaDon, KyThanhToan, NgayLap, NgayHanTT, TongTien, TrangThai, MaHopDong, MaNhanVienKeToan)
VALUES (@MaHoaDon, @Ky, CAST(GETDATE() AS DATE), @NgayHanTT, @GiaThue, N'Chưa TT', @MaHopDong, @MaNV);
DECLARE @c INT = (SELECT ISNULL(MAX(CAST(SUBSTRING(MaChiTietHD, 3, 4) AS INT)), 0) FROM dbo.ChiTietHoaDon WITH (UPDLOCK, HOLDLOCK)
  WHERE MaChiTietHD LIKE 'CH[0-9][0-9][0-9][0-9]');
INSERT dbo.ChiTietHoaDon (MaChiTietHD, SoLuong, DonViTinh, DonGia, ThanhTien, MaHoaDon, MaChiTietDVHD, MaPhieuGhi)
SELECT 'CH' + RIGHT('0000' + CAST(@c + ROW_NUMBER() OVER (ORDER BY d.MaChiTietDVHD) AS VARCHAR(4)), 4),
  q.SoLuong, v.DonViTinh, v.DonGia, ROUND(q.SoLuong * v.DonGia, 0), @MaHoaDon, d.MaChiTietDVHD,
  CASE WHEN v.DonViTinh IN ('kWh', 'm3') THEN @MaPhieuGhi END
FROM dbo.DichVuHopDong d JOIN dbo.DichVu v ON v.MaDichVu = d.MaDichVu
CROSS APPLY (SELECT CAST(CASE WHEN v.DonViTinh = 'kWh' THEN ROUND(@DienDung * @TyLe, 2)
  WHEN v.DonViTinh = 'm3' THEN ROUND(@NuocDung * @TyLe, 2)
  WHEN TRY_CAST(d.GhiChu AS DECIMAL(10, 2)) > 0 THEN TRY_CAST(d.GhiChu AS DECIMAL(10, 2)) ELSE 1 END AS DECIMAL(10, 2)) AS SoLuong) q
WHERE d.MaHopDong = @MaHopDong;
UPDATE dbo.PhiPhatSinh SET TrangThai = N'Đã tính', MaHoaDon = @MaHoaDon WHERE MaHopDong = @MaHopDong AND TrangThai = N'Đã xác nhận';
UPDATE dbo.HoaDon SET TongTien = @GiaThue
  + ISNULL((SELECT SUM(ThanhTien) FROM dbo.ChiTietHoaDon WHERE MaHoaDon = @MaHoaDon), 0)
  + ISNULL((SELECT SUM(SoTien) FROM dbo.PhiPhatSinh WHERE MaHoaDon = @MaHoaDon), 0)
WHERE MaHoaDon = @MaHoaDon;
COMMIT;
SELECT @MaHoaDon AS maHoaDon, (SELECT TongTien FROM dbo.HoaDon WHERE MaHoaDon = @MaHoaDon) AS tongTien;`, params);
  } catch (error) {
    const number = error.number ?? error.originalError?.info?.number;
    if (number === 51001) throw createServiceError('Hợp đồng đã có hóa đơn cho kỳ này.', 409);
    if (number === 51002) throw createServiceError('Còn khoản phí phát sinh chưa xác nhận.', 409);
    throw error;
  }
  const row = (result.recordsets?.at(-1) || result.recordset || [])[0];
  return { maHoaDon: row?.maHoaDon, tongTien: Number(row?.tongTien) || 0, kyThanhToan: period };
}

export async function danhSachHoaDon(user, { query = executeQuery } = {}) {
  assertAccountant(user);
  const sum = (filter) => `(SELECT SUM(ct.ThanhTien) FROM dbo.ChiTietHoaDon ct WHERE ct.MaHoaDon = hd.MaHoaDon AND ${filter})`;
  const result = await query(`SELECT hd.MaHoaDon AS maHoaDon, hd.KyThanhToan AS kyThanhToan, hd.NgayLap AS ngayLap,
      hd.NgayHanTT AS ngayHanTT, hd.TongTien AS tongTien, hd.TrangThai AS trangThai, hd.NgayThanhToan AS ngayThanhToan,
      hd.PhuongThucThanhToan AS phuongThuc, h.MaHopDong AS maHopDong, h.GiaThue AS giaThue, h.NgayBatDau AS ngayBatDau,
      nd.HoTen AS hoTen, nd.SDT AS sdt, ph.TenPhong AS tenPhong, ph.MaChiNhanh AS maChiNhanh, cn.TenChiNhanh AS tenChiNhanh,
      ${sum("ct.DonViTinh = 'kWh'")} AS tienDien, ${sum("ct.DonViTinh = 'm3'")} AS tienNuoc,
      ${sum("ct.DonViTinh NOT IN ('kWh', 'm3')")} AS tienDichVu,
      (SELECT SUM(ps.SoTien) FROM dbo.PhiPhatSinh ps WHERE ps.MaHoaDon = hd.MaHoaDon) AS tienPhatSinh
    FROM dbo.HoaDon hd
    JOIN dbo.HopDongThue h ON h.MaHopDong = hd.MaHopDong
    JOIN dbo.NguoiDung nd ON nd.MaNguoiDung = h.MaKhachHang
    CROSS APPLY (SELECT TOP 1 c.MaPhong FROM dbo.ChiTietDatCoc c WHERE c.MaPhieuDatCoc = h.MaPhieuCoc ORDER BY c.MaPhong) r
    JOIN dbo.Phong ph ON ph.MaPhong = r.MaPhong
    JOIN dbo.ChiNhanh cn ON cn.MaChiNhanh = ph.MaChiNhanh
    WHERE hd.TrangThai <> N'Tạm tính' AND ph.MaChiNhanh = @MaChiNhanh
    ORDER BY hd.KyThanhToan DESC, hd.MaHoaDon DESC`, [branchParam(user)]);
  const today = toDateOnly(new Date());
  return (result.recordset || []).map((row) => ({
    maHoaDon: row.maHoaDon, maHopDong: row.maHopDong, kyThanhToan: row.kyThanhToan, hoTen: row.hoTen, sdt: row.sdt,
    tenPhong: row.tenPhong, maChiNhanh: row.maChiNhanh, tenChiNhanh: row.tenChiNhanh,
    loai: row.kyThanhToan === periodOf(row.ngayBatDau) ? 'Kỳ đầu' : 'Hàng tháng',
    tienPhong: Number(row.giaThue) || 0, tienDien: Number(row.tienDien) || 0, tienNuoc: Number(row.tienNuoc) || 0,
    tienDichVu: Number(row.tienDichVu) || 0, tienPhatSinh: Number(row.tienPhatSinh) || 0, tongTien: Number(row.tongTien) || 0,
    ngayLap: row.ngayLap, ngayHanTT: row.ngayHanTT, ngayThanhToan: row.ngayThanhToan, phuongThuc: row.phuongThuc,
    trangThai: row.trangThai, nhom: statusGroup(row, today),
  }));
}

export async function chiTietHoaDon(user, maHoaDon, { query = executeQuery } = {}) {
  assertAccountant(user);
  const id = String(maHoaDon || '').trim();
  if (!INVOICE_ID.test(id)) throw createServiceError('Mã hóa đơn không hợp lệ.');
  const invoice = (await danhSachHoaDon(user, { query })).find((row) => row.maHoaDon === id);
  if (!invoice) throw createServiceError('Không tìm thấy hóa đơn trong chi nhánh.', 404);
  const p = [{ name: 'MaHoaDon', type: sql.VarChar(6), value: id }];
  const [lines, fees] = await Promise.all([
    query(`SELECT ct.MaChiTietHD AS maChiTietHD, v.TenDichVu AS tenDichVu, ct.DonViTinh AS donViTinh, ct.SoLuong AS soLuong,
        ct.DonGia AS donGia, ct.ThanhTien AS thanhTien, g.ChiSoDienDau AS dienDau, g.ChiSoDienCuoi AS dienCuoi,
        g.ChiSoNuocDau AS nuocDau, g.ChiSoNuocCuoi AS nuocCuoi
      FROM dbo.ChiTietHoaDon ct JOIN dbo.DichVuHopDong d ON d.MaChiTietDVHD = ct.MaChiTietDVHD
      JOIN dbo.DichVu v ON v.MaDichVu = d.MaDichVu LEFT JOIN dbo.PhieuGhiChiSo g ON g.MaPhieuGhi = ct.MaPhieuGhi
      WHERE ct.MaHoaDon = @MaHoaDon ORDER BY ct.MaChiTietHD`, p),
    query(`SELECT MaPhi AS maPhi, TenPhi AS tenPhi, SoTien AS soTien FROM dbo.PhiPhatSinh WHERE MaHoaDon = @MaHoaDon ORDER BY NgayTao`, p),
  ]);
  const n = (v) => (v === null || v === undefined ? null : Number(v));
  return {
    ...invoice,
    chiTiet: (lines.recordset || []).map((l) => ({ ...l, soLuong: n(l.soLuong), donGia: n(l.donGia), thanhTien: n(l.thanhTien),
      dienDau: n(l.dienDau), dienCuoi: n(l.dienCuoi), nuocDau: n(l.nuocDau), nuocCuoi: n(l.nuocCuoi) })),
    phiPhatSinh: (fees.recordset || []).map((f) => ({ ...f, soTien: Number(f.soTien) || 0 })),
  };
}

export async function thuTien(user, maHoaDon, data = {}, { query = executeQuery } = {}) {
  assertAccountant(user);
  const id = String(maHoaDon || '').trim();
  if (!INVOICE_ID.test(id)) throw createServiceError('Mã hóa đơn không hợp lệ.');
  const phuongThuc = data.phuongThuc || 'Chuyển khoản';
  if (!['Tiền mặt', 'Chuyển khoản'].includes(phuongThuc)) throw createServiceError('Phương thức thanh toán không hợp lệ.');
  const result = await query(`UPDATE hd SET TrangThai = N'Đã TT', NgayThanhToan = CAST(GETDATE() AS DATE),
      PhuongThucThanhToan = @PhuongThuc, MaNhanVienKeToan = @MaNV
    FROM dbo.HoaDon hd JOIN dbo.HopDongThue h ON h.MaHopDong = hd.MaHopDong
    WHERE hd.MaHoaDon = @MaHoaDon AND hd.TrangThai IN (N'Chưa TT', N'Nợ') AND ${IN_BRANCH}`, [
    { name: 'MaHoaDon', type: sql.VarChar(6), value: id },
    { name: 'PhuongThuc', type: sql.NVarChar(20), value: phuongThuc },
    { name: 'MaNV', type: sql.VarChar(6), value: user.maNguoiDung },
    branchParam(user),
  ]);
  if (!result.rowsAffected?.[0]) throw createServiceError('Hóa đơn không còn ở trạng thái chờ thu hoặc không thuộc chi nhánh.', 409);
  return { maHoaDon: id, trangThai: 'Đã TT', phuongThuc };
}

// ---- Phí phát sinh trong kỳ ----
export async function themPhiPhatSinh(user, data = {}, { query = executeQuery } = {}) {
  assertAccountant(user);
  const contract = await loadContract(user, data.maHopDong, query);
  const tenPhi = String(data.tenPhi || '').trim().slice(0, 200);
  const soTien = Number(data.soTien);
  const trangThai = data.trangThai === 'Chưa xác nhận' ? 'Chưa xác nhận' : 'Đã xác nhận';
  const ngay = String(data.ngayGhiNhan || toDateOnly(new Date())).slice(0, 10);
  if (!tenPhi) throw createServiceError('Vui lòng nhập tên khoản phí.');
  if (!Number.isSafeInteger(soTien) || soTien <= 0) throw createServiceError('Số tiền phải là số nguyên dương.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay)) throw createServiceError('Ngày ghi nhận không hợp lệ.');
  const maPhi = FEE_ID.test(String(data.maPhi || '')) ? String(data.maPhi) : `PS${Date.now().toString().slice(-10)}`;
  try {
    await query(`INSERT dbo.PhiPhatSinh (MaPhi, MaHopDong, TenPhi, SoTien, TrangThai, NgayGhiNhan, MaNhanVien)
      VALUES (@MaPhi, @MaHopDong, @TenPhi, @SoTien, @TrangThai, @Ngay, @MaNV)`, [
      { name: 'MaPhi', type: sql.VarChar(20), value: maPhi },
      { name: 'MaHopDong', type: sql.VarChar(6), value: contract.maHopDong },
      { name: 'TenPhi', type: sql.NVarChar(200), value: tenPhi },
      { name: 'SoTien', type: sql.Decimal(15, 2), value: soTien },
      { name: 'TrangThai', type: sql.NVarChar(20), value: trangThai },
      { name: 'Ngay', type: sql.Date, value: ngay },
      { name: 'MaNV', type: sql.VarChar(6), value: user.maNguoiDung },
    ]);
  } catch (error) {
    if (/PRIMARY KEY|duplicate/i.test(error.message)) throw createServiceError('Mã chi phí đã tồn tại, vui lòng đổi mã khác.', 409);
    throw error;
  }
  return { maPhi, maHopDong: contract.maHopDong, tenPhi, soTien, trangThai, ngayGhiNhan: ngay };
}

async function changeFee(user, maPhi, text, extra, { query }) {
  assertAccountant(user);
  const id = String(maPhi || '').trim();
  if (!FEE_ID.test(id)) throw createServiceError('Mã chi phí không hợp lệ.');
  const result = await query(`${text}
    FROM dbo.PhiPhatSinh ps JOIN dbo.HopDongThue h ON h.MaHopDong = ps.MaHopDong
    WHERE ps.MaPhi = @MaPhi AND ${extra} AND ${IN_BRANCH}`, [{ name: 'MaPhi', type: sql.VarChar(20), value: id }, branchParam(user)]);
  if (!result.rowsAffected?.[0]) throw createServiceError('Không tìm thấy khoản phí phù hợp hoặc khoản phí đã được tính vào hóa đơn.', 409);
  return { maPhi: id };
}

export const xacNhanPhiPhatSinh = (user, maPhi, opts = {}) =>
  changeFee(user, maPhi, `UPDATE ps SET TrangThai = N'Đã xác nhận'`, `ps.TrangThai = N'Chưa xác nhận'`, { query: opts.query || executeQuery });
export const xoaPhiPhatSinh = (user, maPhi, opts = {}) =>
  changeFee(user, maPhi, 'DELETE ps', `ps.TrangThai <> N'Đã tính'`, { query: opts.query || executeQuery });
