import { executeQuery, sql } from '../database/connection.js';
import { createServiceError } from './serviceErrors.js';

// Trang "Quản lý hợp đồng" của quản lý (theo màn của nhóm Hằng): một danh sách hợp đồng của chi nhánh,
// lọc theo trạng thái thay cho ba tab con; mỗi dòng cho biết việc cần làm ở bước trả phòng.
export function nhomTrangThai(row) {
  const traPhongDangMo = row.maPhieuTra && !['Hoàn tất', 'Hủy'].includes(row.trangThaiPhieuTra);
  if (row.trangThai === 'Đã thanh lý') return 'thanh-ly';
  if (traPhongDangMo) return 'tra-phong';
  if (row.trangThai === 'Hết hạn') return 'het-han';
  if (!row.daThuKyDau) return 'cho-thanh-toan';
  return 'hieu-luc';
}

// Việc quản lý cần làm tiếp với hợp đồng này (mở đúng màn xử lý có sẵn).
export function viecCanLam(row) {
  if (row.trangThaiPhieuTra === 'Chờ xử lý') return 'kiem-tra';
  if (row.trangThaiDoiSoat === 'Chờ phản hồi') return 'phan-hoi';
  if (row.maPhieuTra && row.trangThaiPhieuTra !== 'Hủy' && !row.daThuChiaKhoa) return 'ket-thuc';
  if (row.trangThai === 'Đã thanh lý') return 'ket-thuc';
  return null;
}

export async function danhSachHopDongQuanLy(user, { query = executeQuery } = {}) {
  if (user?.vaiTro !== 'NhanVien' || user.chucVu !== 'Quản lý' || !user.maChiNhanh) {
    throw createServiceError('Chức năng này chỉ dành cho quản lý chi nhánh.', 403);
  }
  const result = await query(`SELECT h.MaHopDong AS maHopDong, h.NgayBatDau AS ngayBatDau, h.NgayKetThuc AS ngayKetThuc,
      h.GiaThue AS giaThue, h.TrangThai AS trangThai, p.HinhThucThue AS hinhThucThue, nd.HoTen AS hoTen, nd.SDT AS sdt,
      ph.TenPhong AS tenPhong,
      (SELECT STRING_AGG(c.MaGiuong, ', ') FROM dbo.ChiTietDatCoc c WHERE c.MaPhieuDatCoc = h.MaPhieuCoc AND c.MaGiuong IS NOT NULL) AS giuong,
      CAST(CASE WHEN EXISTS (SELECT 1 FROM dbo.HoaDon x WHERE x.MaHopDong = h.MaHopDong
        AND x.KyThanhToan = CONVERT(char(7), h.NgayBatDau, 120) AND x.TrangThai = N'Đã TT') THEN 1 ELSE 0 END AS BIT) AS daThuKyDau,
      tp.MaPhieuTra AS maPhieuTra, tp.TrangThai AS trangThaiPhieuTra, ds.MaDoiSoat AS maDoiSoat, ds.TrangThai AS trangThaiDoiSoat,
      CAST(CASE WHEN cl.KeysReturnedAt IS NULL THEN 0 ELSE 1 END AS BIT) AS daThuChiaKhoa
    FROM dbo.HopDongThue h
    JOIN dbo.PhieuDatCoc p ON p.MaPhieuDatCoc = h.MaPhieuCoc
    JOIN dbo.NguoiDung nd ON nd.MaNguoiDung = h.MaKhachHang
    CROSS APPLY (SELECT TOP 1 c.MaPhong FROM dbo.ChiTietDatCoc c WHERE c.MaPhieuDatCoc = h.MaPhieuCoc ORDER BY c.MaPhong) r
    JOIN dbo.Phong ph ON ph.MaPhong = r.MaPhong
    OUTER APPLY (SELECT TOP 1 t.MaPhieuTra, t.TrangThai FROM dbo.PhieuTraPhong t WHERE t.MaHopDong = h.MaHopDong ORDER BY t.MaPhieuTra DESC) tp
    OUTER APPLY (SELECT TOP 1 d.MaDoiSoat, d.TrangThai FROM dbo.DoiSoat d WHERE d.MaPhieuTra = tp.MaPhieuTra ORDER BY d.MaDoiSoat DESC) ds
    LEFT JOIN dbo.CheckoutLifecycle cl ON cl.ContractId = h.MaHopDong
    WHERE ph.MaChiNhanh = @MaChiNhanh
    ORDER BY h.MaHopDong DESC`, [{ name: 'MaChiNhanh', type: sql.VarChar(6), value: user.maChiNhanh }]);
  return (result.recordset || []).map((row) => ({
    ...row, giaThue: Number(row.giaThue) || 0, giuong: row.giuong || '',
    daThuKyDau: Boolean(row.daThuKyDau), daThuChiaKhoa: Boolean(row.daThuChiaKhoa),
    nhom: nhomTrangThai(row), viecCanLam: viecCanLam(row),
  }));
}
