import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// D-043: tạo bảng phòng quan tâm theo hồ sơ. `check` chỉ đọc; `migrate` chạy file SQL (chạy lại được).
async function main() {
  const mode = process.argv[2] || 'check';
  if (!['check', 'migrate'].includes(mode) || process.argv.length > 3) throw new Error('Usage: interested-rooms-db.mjs check|migrate');
  const { getPool } = await import('../database/connection.js');
  const pool = await getPool();
  try {
    const exists = async () => (await pool.request().query("SELECT OBJECT_ID(N'dbo.PhieuDangKyPhongQuanTam', N'U') AS id")).recordset[0].id != null;
    const before = await exists();
    console.log(JSON.stringify({ mode, tableExistsBefore: before }));
    if (mode === 'check') return;
    const migration = await readFile(new URL('../../../database/migrations/20261113_registration_interested_rooms.sql', import.meta.url), 'utf8');
    for (const batch of migration.split(/^\s*GO\s*$/mi).filter((s) => s.trim())) await pool.request().batch(batch);
    const rows = (await pool.request().query('SELECT COUNT(*) AS n FROM dbo.PhieuDangKyPhongQuanTam')).recordset[0].n;
    console.log(JSON.stringify({ tableExistsAfter: await exists(), rows }));
    console.log('D-043 ready: table PhieuDangKyPhongQuanTam installed. No existing business rows changed.');
  } finally { await pool.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
