import { executeProcedure, executeQuery, getPool, sql } from '../database/connection.js';

export async function layDanhSachPhongKhamPha(filter = {}) {
  const result = await executeProcedure('dbo.SP_KhachMoi_DanhSachPhong', [
    { name: 'TenPhong', type: sql.NVarChar(100), value: filter.tuKhoa || null },
    { name: 'LoaiPhong', type: sql.NVarChar(100), value: filter.loaiPhong || null },
    { name: 'KhuVuc', type: sql.NVarChar(100), value: filter.khuVuc || null },
    { name: 'MucGiaToiDa', type: sql.Decimal(15, 2), value: filter.mucGiaToiDa }
  ]);

  return result.recordset || [];
}

export async function layChiTietPhong(maPhong) {
  const result = await executeProcedure('dbo.SP_KhachMoi_ChiTietPhong', [
    { name: 'MaPhong', type: sql.VarChar(4), value: maPhong }
  ]);

  return result.recordsets || [];
}

export async function layBoLocPhongKhamPha() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT MaLoaiPhong AS maLoaiPhong, TenLoaiPhong AS tenLoaiPhong
    FROM dbo.LoaiPhong
    ORDER BY TenLoaiPhong;

    SELECT DISTINCT TenChiNhanh AS tenChiNhanh, DiaChi AS diaChi
    FROM dbo.ChiNhanh
    ORDER BY DiaChi;
  `);

  return result.recordsets || [];
}

// D-042: đếm giường trống / đang giữ chỗ chờ cọc theo phòng để gắn nhãn "quan tâm".
export async function layDemGiuongTheoPhong(query = executeQuery) {
  const result = await query(`
    WITH GiuongTheoPhong AS (
      SELECT MaPhong, COUNT(*) AS tongGiuong,
        SUM(CASE WHEN TinhTrang = N'Trống' THEN 1 ELSE 0 END) AS soGiuongTrong,
        SUM(CASE WHEN TinhTrang = N'Giữ chỗ' THEN 1 ELSE 0 END) AS soGiuongChoCoc
      FROM dbo.Giuong
      GROUP BY MaPhong
    ), CuTruTheoPhong AS (
      SELECT c.MaPhong,
        MAX(CASE WHEN tv.GioiTinh = N'Nam' THEN 1 ELSE 0 END) AS coNam,
        MAX(CASE WHEN tv.GioiTinh = N'Nữ' THEN 1 ELSE 0 END) AS coNu
      FROM dbo.ChiTietDatCoc c
      JOIN dbo.HopDongThue h ON h.MaPhieuCoc = c.MaPhieuDatCoc AND h.TrangThai = N'Hiệu lực'
      JOIN dbo.ThanhVienHopDong tv ON tv.MaHopDong = h.MaHopDong AND tv.TrangThai = N'Đang ở'
      GROUP BY c.MaPhong
    )
    SELECT p.MaPhong AS maPhong, g.tongGiuong, g.soGiuongTrong, g.soGiuongChoCoc,
      CASE
        WHEN g.tongGiuong > 0 AND g.soGiuongTrong = g.tongGiuong THEN N'Không phân biệt'
        WHEN c.coNam = 1 AND c.coNu = 1 THEN N'Không phân biệt'
        WHEN c.coNam = 1 THEN N'Nam'
        WHEN c.coNu = 1 THEN N'Nữ'
        ELSE p.GioiTinhChoPhep
      END AS gioiTinhChoPhep
    FROM dbo.Phong p
    LEFT JOIN GiuongTheoPhong g ON g.MaPhong = p.MaPhong
    LEFT JOIN CuTruTheoPhong c ON c.MaPhong = p.MaPhong;
  `);

  return result.recordset || [];
}
