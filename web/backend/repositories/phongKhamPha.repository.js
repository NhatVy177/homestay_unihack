import { executeProcedure, getPool, sql } from '../database/connection.js';

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
export async function layDemGiuongTheoPhong() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      MaPhong AS maPhong,
      SUM(CASE WHEN TinhTrang = N'Trống' THEN 1 ELSE 0 END) AS soGiuongTrong,
      SUM(CASE WHEN TinhTrang = N'Giữ chỗ' THEN 1 ELSE 0 END) AS soGiuongChoCoc
    FROM dbo.Giuong
    GROUP BY MaPhong;
  `);

  return result.recordset || [];
}
