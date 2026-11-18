import { pathToFileURL } from 'node:url';

// Nguồn khách (Facebook / Zalo / người quen / tìm trên web / Sale gửi link / khác) cho mỗi phiếu đăng ký thuê, để Sale xem
// tỷ lệ chốt theo nguồn. Chỉ thêm một cột cho phép trống vào dbo.PhieuDangKy; dữ liệu cũ giữ nguyên. Chạy lại được.
export const ADD_COLUMN = `IF COL_LENGTH(N'dbo.PhieuDangKy', N'NguonKhach') IS NULL ALTER TABLE dbo.PhieuDangKy ADD NguonKhach NVARCHAR(30) NULL;`;

async function main() {
  const mode = process.argv[2] || 'check';
  if (!['check', 'migrate'].includes(mode) || process.argv.length > 3) throw new Error('Usage: customer-source-db.mjs check|migrate');
  const { getPool } = await import('../database/connection.js');
  const pool = await getPool();
  const db = (await pool.request().query('SELECT DB_NAME() AS n')).recordset[0]?.n;
  if (!/^(HOMEDORM4|HOMEDORM_CONFIRM_TEST_\d+)$/.test(db)) throw new Error('Unexpected migration database.');
  if (mode === 'migrate') await pool.request().batch(ADD_COLUMN);
  const ready = Boolean((await pool.request().query("SELECT COL_LENGTH(N'dbo.PhieuDangKy', N'NguonKhach') AS n")).recordset[0]?.n);
  console.log(JSON.stringify({ mode, databaseName: db, ready }));
  if (!ready) process.exitCode = 1;
  await pool.close();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
