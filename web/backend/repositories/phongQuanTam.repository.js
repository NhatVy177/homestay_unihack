import { executeQuery, sql } from '../database/connection.js';

// D-043: bảng PhieuDangKyPhongQuanTam lưu mã phòng khách quan tâm theo từng hồ sơ.
export async function layHoSoCuaKhach(maDangKy, khachHangId) {
  const result = await executeQuery(`
    SELECT
      pdk.MaDangKy AS maDangKy,
      pdk.TrangThai AS trangThai, pdk.SoNam AS soNam, pdk.SoNu AS soNu,
      CASE WHEN EXISTS (
        SELECT 1 FROM dbo.LichXemPhong lxp
        WHERE lxp.MaDangKy = pdk.MaDangKy AND lxp.TrangThai <> N'Đã hủy'
      ) THEN 1 ELSE 0 END AS coLichXemConHieuLuc
    FROM dbo.PhieuDangKy pdk
    WHERE pdk.MaDangKy = @MaDangKy AND pdk.MaKhachHang = @KhachHangId;
  `, [
    { name: 'MaDangKy', type: sql.VarChar(6), value: maDangKy },
    { name: 'KhachHangId', type: sql.VarChar(6), value: khachHangId }
  ]);
  const row = result.recordset[0];
  return row ? { ...row, coLichXemConHieuLuc: Boolean(row.coLichXemConHieuLuc) } : null;
}

export async function layPhongQuanTam(maDangKy) {
  const result = await executeQuery(`
    SELECT q.MaPhong AS maPhong, p.TenPhong AS tenPhong, p.MaChiNhanh AS maChiNhanh,
           p.MaLoaiPhong AS maLoaiPhong, cn.TenChiNhanh AS chiNhanh, q.ThoiGianThem AS thoiGianThem
    FROM dbo.PhieuDangKyPhongQuanTam q
    JOIN dbo.Phong p ON p.MaPhong = q.MaPhong
    JOIN dbo.ChiNhanh cn ON cn.MaChiNhanh = p.MaChiNhanh
    WHERE q.MaDangKy = @MaDangKy
    ORDER BY q.ThoiGianThem, q.MaPhong;
  `, [{ name: 'MaDangKy', type: sql.VarChar(6), value: maDangKy }]);
  return result.recordset;
}

export async function layPhongQuanTamCuaKhach(khachHangId) {
  const result = await executeQuery(`
    SELECT q.MaDangKy AS maDangKy, q.MaPhong AS maPhong, p.TenPhong AS tenPhong,
           p.MaChiNhanh AS maChiNhanh, cn.TenChiNhanh AS chiNhanh
    FROM dbo.PhieuDangKyPhongQuanTam q
    JOIN dbo.PhieuDangKy pdk ON pdk.MaDangKy = q.MaDangKy
    JOIN dbo.Phong p ON p.MaPhong = q.MaPhong
    JOIN dbo.ChiNhanh cn ON cn.MaChiNhanh = p.MaChiNhanh
    WHERE pdk.MaKhachHang = @KhachHangId
    ORDER BY q.ThoiGianThem, q.MaPhong;
  `, [{ name: 'KhachHangId', type: sql.VarChar(6), value: khachHangId }]);
  return result.recordset;
}

export async function layThongTinPhong(maPhongs = []) {
  const ids = [...new Set(maPhongs.map((id) => String(id || '').trim()).filter(Boolean))];
  const rows = [];
  for (const maPhong of ids) {
    const result = await executeQuery(
      `SELECT p.MaPhong AS maPhong, p.TenPhong AS tenPhong, p.MaChiNhanh AS maChiNhanh,
              p.MaLoaiPhong AS maLoaiPhong, lp.TenLoaiPhong AS tenLoaiPhong, p.GioiTinhChoPhep AS gioiTinhChoPhep
       FROM dbo.Phong p JOIN dbo.LoaiPhong lp ON lp.MaLoaiPhong = p.MaLoaiPhong
       WHERE p.MaPhong = @MaPhong;`,
      [{ name: 'MaPhong', type: sql.VarChar(4), value: maPhong }]
    );
    if (result.recordset[0]) rows.push(result.recordset[0]);
  }
  return rows;
}

export async function themPhongQuanTam(maDangKy, maPhong) {
  await executeQuery(`
    IF NOT EXISTS (SELECT 1 FROM dbo.PhieuDangKyPhongQuanTam WHERE MaDangKy = @MaDangKy AND MaPhong = @MaPhong)
      INSERT INTO dbo.PhieuDangKyPhongQuanTam (MaDangKy, MaPhong) VALUES (@MaDangKy, @MaPhong);
  `, [
    { name: 'MaDangKy', type: sql.VarChar(6), value: maDangKy },
    { name: 'MaPhong', type: sql.VarChar(4), value: maPhong }
  ]);
}

export async function goPhongQuanTam(maDangKy, maPhong) {
  await executeQuery(
    'DELETE FROM dbo.PhieuDangKyPhongQuanTam WHERE MaDangKy = @MaDangKy AND MaPhong = @MaPhong;',
    [
      { name: 'MaDangKy', type: sql.VarChar(6), value: maDangKy },
      { name: 'MaPhong', type: sql.VarChar(4), value: maPhong }
    ]
  );
}

export async function layLoaiPhongHoSo(maDangKy) {
  const result = await executeQuery(
    'SELECT MaLoaiPhong AS maLoaiPhong FROM dbo.PDK_LoaiPhong WHERE MaDangKy = @MaDangKy;',
    [{ name: 'MaDangKy', type: sql.VarChar(6), value: maDangKy }]
  );
  return result.recordset.map((row) => row.maLoaiPhong);
}

// D-044: màn chọn phiếu của Sale hiện tên các phòng khách đã quan tâm (một lần cho cả danh sách).
export async function layTenPhongQuanTamTatCaHoSo() {
  const result = await executeQuery(`
    SELECT q.MaDangKy AS maDangKy, q.MaPhong AS maPhong, p.TenPhong AS tenPhong
    FROM dbo.PhieuDangKyPhongQuanTam q
    JOIN dbo.Phong p ON p.MaPhong = q.MaPhong
    ORDER BY q.ThoiGianThem, q.MaPhong;
  `);
  return result.recordset;
}
