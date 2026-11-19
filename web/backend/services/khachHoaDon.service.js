import { executeQuery, sql } from '../database/connection.js';
import { createServiceError } from './serviceErrors.js';

// Danh sách hóa đơn theo kỳ của khách (hợp đồng của chính họ). Phiếu cọc lấy từ /khach-moi/dat-coc.
// Loại "Kỳ đầu" = hóa đơn của tháng bắt đầu hợp đồng (D-023); các kỳ sau là "Hàng tháng".
export function classifyInvoice(row) {
  const startMonth = row.ngayBatDau ? new Date(row.ngayBatDau).toISOString().slice(0, 7) : null;
  return startMonth && startMonth === row.kyThanhToan ? 'Kỳ đầu' : 'Hàng tháng';
}

export async function getHoaDonCuaKhach(user, query = executeQuery) {
  if (!user || user.vaiTro !== 'KhachHang' || !user.maNguoiDung) throw createServiceError('Chức năng này chỉ dành cho khách hàng.', 403);
  const result = await query(`SELECT hd.MaHoaDon AS maHoaDon, hd.MaHopDong AS maHopDong, hd.KyThanhToan AS kyThanhToan,
      hd.NgayLap AS ngayLap, hd.NgayHanTT AS ngayHanTT, hd.TongTien AS tongTien, hd.TrangThai AS trangThai,
      hd.NgayThanhToan AS ngayThanhToan, hd.PhuongThucThanhToan AS phuongThuc, h.NgayBatDau AS ngayBatDau,
      CAST(CASE WHEN EXISTS (SELECT 1 FROM dbo.ChungTuHoaDon c WHERE c.MaHoaDon = hd.MaHoaDon) THEN 1 ELSE 0 END AS BIT) AS daGuiMinhChung
    FROM dbo.HoaDon hd JOIN dbo.HopDongThue h ON h.MaHopDong = hd.MaHopDong
    WHERE h.MaKhachHang = @MaKhachHang AND hd.TrangThai <> N'Tạm tính'
    ORDER BY hd.KyThanhToan DESC, hd.MaHoaDon DESC;
    IF OBJECT_ID('dbo.SP_Loyalty_InvoiceDiscounts', 'P') IS NOT NULL
      EXEC dbo.SP_Loyalty_InvoiceDiscounts @MaKhachHang = @MaKhachHang;
    `, [{ name: 'MaKhachHang', type: sql.VarChar(6), value: user.maNguoiDung }]);
  const discounts = new Map((result.recordsets?.[1] || []).map(row => [row.maHoaDon, Number(row.giamDiemThuong)]));
  return result.recordset.map((row) => {
    const discount = discounts.get(row.maHoaDon);
    return { ...row, loai: classifyInvoice(row), ...(discount > 0 ? { giamDiemThuong: discount } : {}) };
  });
}
