// Read-only inventory for A3. Running this requires Vy's prior approval for HOMEDORM4.
// It creates no business rows and never selects account passwords or tenant personal data.
import { mkdir, writeFile } from 'node:fs/promises';

async function main() {
  if (process.argv.slice(2).length !== 1 || process.argv[2] !== '--allow-homedorm4-read') {
    console.error('Approval required. After Vy approves HOMEDORM4 reads: node --env-file=.env scripts/fuji-e2e-preflight.mjs --allow-homedorm4-read');
    process.exitCode = 1;
    return;
  }
  if (process.env.DB_NAME !== 'HOMEDORM4') throw new Error('This preflight is scoped to HOMEDORM4. Check env before connecting.');
  const { getPool } = await import('../database/connection.js');
  const pool = await getPool();
  try {
    const schema = (await pool.request().query(`SELECT s.name AS schemaName, t.name AS tableName, c.name AS columnName
      FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id
      JOIN sys.columns c ON c.object_id=t.object_id
      WHERE s.name='dbo' AND t.name IN ('DepositPolicySnapshot','SignedContractEvidence','KiemTraTraPhongAnh','AvalancheCase')
      ORDER BY t.name,c.column_id`)).recordset;
    const staff = (await pool.request().query(`SELECT DISTINCT n.MaNhanVien AS staffCode,n.MaChiNhanh AS branchCode,n.ChucVu AS role
      FROM dbo.NhanVien n JOIN dbo.TaiKhoan t ON t.MaNguoiDung=n.MaNhanVien
      WHERE t.TrangThai=N'Hoạt động' AND n.ChucVu IN (N'Sale',N'Quản lý',N'Kế toán')
      ORDER BY n.MaChiNhanh,n.ChucVu,n.MaNhanVien`)).recordset;
    const rooms = (await pool.request().query(`SELECT p.MaChiNhanh AS branchCode,p.MaPhong AS roomCode,p.GioiTinhChoPhep AS gender,
        p.MaLoaiPhong AS roomType,l.SucChuaToiDa AS capacity,l.GiaThueNguyenPhong AS roomRent,COUNT(*) AS beds
      FROM dbo.Phong p JOIN dbo.Giuong g ON g.MaPhong=p.MaPhong JOIN dbo.LoaiPhong l ON l.MaLoaiPhong=p.MaLoaiPhong
      WHERE p.TinhTrang=N'Trống' AND NOT EXISTS (SELECT 1 FROM dbo.PhieuDangKy d
        JOIN dbo.ChiTietXemPhong c ON c.MaDangKy=d.MaDangKy
        WHERE d.TrangThai=N'Chờ xác nhận cọc' AND c.KhachChon=1 AND c.MaPhong=p.MaPhong)
      GROUP BY p.MaChiNhanh,p.MaPhong,p.GioiTinhChoPhep,p.MaLoaiPhong,l.SucChuaToiDa,l.GiaThueNguyenPhong
      HAVING COUNT(*)=SUM(CASE WHEN g.TinhTrang=N'Trống' THEN 1 ELSE 0 END)
      ORDER BY p.MaChiNhanh,p.MaPhong`)).recordset;
    const counts = (await pool.request().query(`SELECT 'PhieuDangKy' AS tableName,COUNT_BIG(*) AS rows FROM dbo.PhieuDangKy
      UNION ALL SELECT 'PhieuDatCoc',COUNT_BIG(*) FROM dbo.PhieuDatCoc
      UNION ALL SELECT 'HopDongThue',COUNT_BIG(*) FROM dbo.HopDongThue
      UNION ALL SELECT 'PhieuTraPhong',COUNT_BIG(*) FROM dbo.PhieuTraPhong
      UNION ALL SELECT 'AvalancheCase',COUNT_BIG(*) FROM dbo.AvalancheCase`)).recordset;
    const output = new URL('../secrets/fuji-e2e/', import.meta.url);
    await mkdir(output, { recursive: true });
    const name = `preflight-${Date.now()}.json`;
    await writeFile(new URL(name, output), JSON.stringify({ recordedAt: new Date().toISOString(), database: 'HOMEDORM4', readOnly: true, schema, staff, rooms, counts }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ readOnly: true, schemaColumns: schema.length, staff, availableRooms: rooms, counts, report: `secrets/fuji-e2e/${name}` }));
  } finally { await pool.close(); }
}
main().catch(error => {
  console.error(error.message?.startsWith('This preflight') ? error.message : 'A3 preflight failed. No business data was written; check schema/configuration. Secret diagnostics suppressed.');
  process.exitCode = 1;
});
