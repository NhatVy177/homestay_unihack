import { pathToFileURL } from 'node:url';

// Minh chứng chuyển khoản/tiền mặt của khoản thu kỳ đầu khi nhận phòng (khách tải lên, kế toán xem rồi mới ghi nhận).
// Chỉ thêm một bảng mới, không đổi dữ liệu cũ. Chỉ chạy trên HOMEDORM4 khi Vy cho phép.
export const CREATE_TABLE = `
IF OBJECT_ID(N'dbo.ChungTuKyDau', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ChungTuKyDau (
    MaHopDong VARCHAR(6) NOT NULL CONSTRAINT PK_ChungTuKyDau PRIMARY KEY,
    DuongDan NVARCHAR(300) NOT NULL,
    TenTep NVARCHAR(200) NOT NULL,
    NgayGui DATETIME2 NOT NULL CONSTRAINT DF_ChungTuKyDau_NgayGui DEFAULT SYSDATETIME(),
    CONSTRAINT FK_ChungTuKyDau_HopDong FOREIGN KEY (MaHopDong) REFERENCES dbo.HopDongThue(MaHopDong)
  );
END`;

async function main() {
  const mode = process.argv[2] || 'check';
  if (!['check', 'migrate'].includes(mode) || process.argv.length > 3) throw new Error('Usage: first-charge-proof-db.mjs check|migrate');
  const { getPool } = await import('../database/connection.js');
  const pool = await getPool();
  const db = (await pool.request().query('SELECT DB_NAME() AS n')).recordset[0]?.n;
  if (!/^(HOMEDORM4|HOMEDORM_CONFIRM_TEST_\d+)$/.test(db)) throw new Error('Unexpected migration database.');
  if (mode === 'migrate') await pool.request().batch(CREATE_TABLE);
  const ready = Boolean((await pool.request().query("SELECT OBJECT_ID(N'dbo.ChungTuKyDau', N'U') AS id")).recordset[0]?.id);
  console.log(JSON.stringify({ mode, databaseName: db, ready }));
  if (!ready) process.exitCode = 1;
  await pool.close();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
