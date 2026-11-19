import { executeQuery, sql } from '../database/connection.js';
import { createServiceError } from './serviceErrors.js';

// KPI Sale theo tháng đăng ký của hồ sơ (D-075). Hồ sơ tính cho Sale ghi ở PhieuDangKy.MaNhanVienSale.
// Sale chỉ thấy số của mình, Quản lý thấy Sale cùng chi nhánh, Admin thấy tất cả và lọc được theo chi nhánh.
const isAdmin = (user) => user?.vaiTro === 'Admin' || user?.chucVu === 'Admin';

export function phamViKpi(user, { chiNhanh } = {}) {
  if (isAdmin(user)) return { maNhanVien: null, maChiNhanh: String(chiNhanh || '').trim() || null, admin: true };
  if (user?.vaiTro === 'NhanVien' && user.chucVu === 'Sale') return { maNhanVien: user.maNguoiDung, maChiNhanh: null, admin: false };
  if (user?.vaiTro === 'NhanVien' && user.chucVu === 'Quản lý' && user.maChiNhanh) return { maNhanVien: null, maChiNhanh: user.maChiNhanh, admin: false };
  throw createServiceError('Bạn không có quyền xem KPI Sale.', 403);
}

// "YYYY-MM" → [ngày đầu tháng, ngày đầu tháng sau]; rỗng nghĩa là mọi thời gian.
export function khoangThang(thang) {
  const text = String(thang || '').trim();
  if (!text) return [null, null];
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(text);
  if (!m) throw createServiceError('Tháng không hợp lệ, cần dạng YYYY-MM.', 400);
  const y = Number(m[1]), mo = Number(m[2]);
  const pad = (n) => String(n).padStart(2, '0');
  return [`${y}-${pad(mo)}-01`, mo === 12 ? `${y + 1}-01-01` : `${y}-${pad(mo + 1)}-01`];
}

const rate = (part, total) => (total ? Math.round((part / total) * 100) : 0);

const KPI_SQL = `SELECT nv.MaNhanVien AS maNhanVien, nd.HoTen AS hoTen, nv.MaChiNhanh AS maChiNhanh, cn.TenChiNhanh AS tenChiNhanh,
    COUNT(x.MaDangKy) AS soHoSo, ISNULL(SUM(x.daXem), 0) AS soDaXem, ISNULL(SUM(x.khongDen), 0) AS soKhongDen,
    ISNULL(SUM(x.coCoc), 0) AS soDatCoc, ISNULL(SUM(x.coHopDong), 0) AS soHopDong
  FROM dbo.NhanVien nv
  JOIN dbo.NguoiDung nd ON nd.MaNguoiDung = nv.MaNhanVien
  LEFT JOIN dbo.ChiNhanh cn ON cn.MaChiNhanh = nv.MaChiNhanh
  LEFT JOIN (
    SELECT p.MaDangKy, p.MaNhanVienSale,
      (SELECT COUNT(*) FROM dbo.LichXemPhong l WHERE l.MaDangKy = p.MaDangKy AND l.TrangThai = N'Đã xem') AS daXem,
      (SELECT COUNT(*) FROM dbo.LichXemPhong l WHERE l.MaDangKy = p.MaDangKy AND l.TrangThai = N'Khách không đến') AS khongDen,
      CASE WHEN EXISTS (SELECT 1 FROM dbo.PhieuDatCoc c WHERE c.MaPhieuYeuCauDangKy = p.MaDangKy AND c.TrangThaiThanhToan = N'Đã TT') THEN 1 ELSE 0 END AS coCoc,
      CASE WHEN EXISTS (SELECT 1 FROM dbo.PhieuDatCoc c JOIN dbo.HopDongThue h ON h.MaPhieuCoc = c.MaPhieuDatCoc WHERE c.MaPhieuYeuCauDangKy = p.MaDangKy) THEN 1 ELSE 0 END AS coHopDong
    FROM dbo.PhieuDangKy p
    WHERE p.MaNhanVienSale IS NOT NULL AND (@TuNgay IS NULL OR (p.NgayDangKy >= @TuNgay AND p.NgayDangKy < @DenNgay))
  ) x ON x.MaNhanVienSale = nv.MaNhanVien
  WHERE nv.ChucVu = N'Sale'
    AND (@MaNhanVien IS NULL OR nv.MaNhanVien = @MaNhanVien)
    AND (@MaChiNhanh IS NULL OR nv.MaChiNhanh = @MaChiNhanh)
  GROUP BY nv.MaNhanVien, nd.HoTen, nv.MaChiNhanh, cn.TenChiNhanh`;

export async function baoCaoKpiSale(user, { thang, chiNhanh } = {}, { query = executeQuery } = {}) {
  const scope = phamViKpi(user, { chiNhanh });
  const [tuNgay, denNgay] = khoangThang(thang);
  const rows = (await query(KPI_SQL, [
    { name: 'TuNgay', type: sql.Date, value: tuNgay },
    { name: 'DenNgay', type: sql.Date, value: denNgay },
    { name: 'MaNhanVien', type: sql.VarChar(6), value: scope.maNhanVien },
    { name: 'MaChiNhanh', type: sql.VarChar(6), value: scope.maChiNhanh },
  ])).recordset || [];
  const items = rows.map((r) => ({ ...r, tyLeDatCoc: rate(r.soDatCoc, r.soHoSo), tyLeChot: rate(r.soHopDong, r.soHoSo) }))
    .sort((a, b) => b.soHopDong - a.soHopDong || b.soDatCoc - a.soDatCoc || b.soHoSo - a.soHoSo || String(a.hoTen).localeCompare(String(b.hoTen), 'vi'));
  const sum = (key) => items.reduce((total, r) => total + Number(r[key] || 0), 0);
  const tong = { soHoSo: sum('soHoSo'), soDaXem: sum('soDaXem'), soKhongDen: sum('soKhongDen'), soDatCoc: sum('soDatCoc'), soHopDong: sum('soHopDong') };
  tong.tyLeDatCoc = rate(tong.soDatCoc, tong.soHoSo);
  tong.tyLeChot = rate(tong.soHopDong, tong.soHoSo);
  const danhSachChiNhanh = scope.admin
    ? ((await query(`SELECT MaChiNhanh AS maChiNhanh, TenChiNhanh AS tenChiNhanh FROM dbo.ChiNhanh ORDER BY MaChiNhanh`)).recordset || [])
    : [];
  return { thang: String(thang || '').trim(), phamVi: scope.admin ? 'admin' : scope.maNhanVien ? 'sale' : 'chi-nhanh', rows: items, tong, danhSachChiNhanh };
}
