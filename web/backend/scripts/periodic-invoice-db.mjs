import { pathToFileURL } from 'node:url';

// Hóa đơn định kỳ (theo màn của nhóm Hằng): khoản phí phát sinh trong kỳ (đền bù, phạt) do kế toán ghi,
// xác nhận rồi mới cộng vào hóa đơn tháng. Chỉ thêm một bảng mới, không đổi dữ liệu cũ. Chạy khi Vy cho phép.
export const CREATE_TABLE = `
IF OBJECT_ID(N'dbo.PhiPhatSinh', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.PhiPhatSinh (
    MaPhi VARCHAR(20) NOT NULL CONSTRAINT PK_PhiPhatSinh PRIMARY KEY,
    MaHopDong VARCHAR(6) NOT NULL CONSTRAINT FK_PhiPhatSinh_HopDong REFERENCES dbo.HopDongThue(MaHopDong),
    TenPhi NVARCHAR(200) NOT NULL,
    SoTien DECIMAL(15,2) NOT NULL CONSTRAINT CHK_PhiPhatSinh_SoTien CHECK (SoTien > 0),
    TrangThai NVARCHAR(20) NOT NULL CONSTRAINT CHK_PhiPhatSinh_TrangThai CHECK (TrangThai IN (N'Chưa xác nhận', N'Đã xác nhận', N'Đã tính')),
    NgayGhiNhan DATE NOT NULL,
    MaHoaDon VARCHAR(6) NULL CONSTRAINT FK_PhiPhatSinh_HoaDon REFERENCES dbo.HoaDon(MaHoaDon),
    MaNhanVien VARCHAR(6) NULL,
    NgayTao DATETIME2 NOT NULL CONSTRAINT DF_PhiPhatSinh_NgayTao DEFAULT SYSDATETIME()
  );
  CREATE INDEX IX_PhiPhatSinh_HopDong ON dbo.PhiPhatSinh(MaHopDong, TrangThai);
END`;

async function main() {
  const mode = process.argv[2] || 'check';
  if (!['check', 'migrate'].includes(mode) || process.argv.length > 3) throw new Error('Usage: periodic-invoice-db.mjs check|migrate');
  const { getPool } = await import('../database/connection.js');
  const pool = await getPool();
  const db = (await pool.request().query('SELECT DB_NAME() AS n')).recordset[0]?.n;
  if (!/^(HOMEDORM4|HOMEDORM_CONFIRM_TEST_\d+)$/.test(db)) throw new Error('Unexpected migration database.');
  if (mode === 'migrate') await pool.request().batch(CREATE_TABLE);
  const ready = Boolean((await pool.request().query("SELECT OBJECT_ID(N'dbo.PhiPhatSinh', N'U') AS id")).recordset[0]?.id);
  console.log(JSON.stringify({ mode, databaseName: db, ready }));
  if (!ready) process.exitCode = 1;
  await pool.close();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
