import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// Thêm tham số tùy chọn @BoQuaGioHen (mặc định 0) vào SP_GhiNhanKetQuaBuoiXem cho chế độ demo.
// Không đổi hành vi khi không truyền tham số. Chỉ chạy trên HOMEDORM4 khi Vy cho phép.
export function patchDemoViewingTime(definition) {
  if (!definition) throw new Error('Không tìm thấy SP_GhiNhanKetQuaBuoiXem.');
  const normalized = definition.replace(/^\s*(?:CREATE(?:\s+OR\s+ALTER)?|ALTER)\s+PROC(?:EDURE)?\b/i, 'CREATE OR ALTER PROCEDURE');
  if (normalized.includes('@BoQuaGioHen')) return normalized;
  const paramAnchor = '@GhiChu nvarchar(500) = NULL';
  const gateAnchor = 'IF @Time > GETDATE() OR';
  if (normalized.split(paramAnchor).length !== 2 || normalized.split(gateAnchor).length !== 2) throw new Error('Định nghĩa SP lạ; không ghi đè.');
  return normalized.replace(paramAnchor, `${paramAnchor}, @BoQuaGioHen bit = 0`).replace(gateAnchor, 'IF (@Time > GETDATE() AND @BoQuaGioHen = 0) OR');
}
const defOf = async (pool) => (await pool.request().query("SELECT OBJECT_DEFINITION(OBJECT_ID(N'dbo.SP_GhiNhanKetQuaBuoiXem')) AS d")).recordset[0]?.d;
async function main() {
  const mode = process.argv[2] || 'check';
  if (!['check', 'migrate'].includes(mode) || process.argv.length > 3) throw new Error('Usage: demo-viewing-time-db.mjs check|migrate');
  const { getPool } = await import('../database/connection.js');
  const pool = await getPool();
  try {
    const db = (await pool.request().query('SELECT DB_NAME() AS n')).recordset[0]?.n;
    if (!/^(HOMEDORM4|HOMEDORM_CONFIRM_TEST_\d+)$/.test(db)) throw new Error('Unexpected migration database.');
    if (mode === 'migrate') await pool.request().batch(patchDemoViewingTime(await defOf(pool)));
    const ready = (await defOf(pool)).includes('@BoQuaGioHen');
    console.log(JSON.stringify({ mode, databaseName: db, ready }));
    if (!ready) process.exitCode = 1;
  } finally { await pool.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch((e) => { console.error(e.message); process.exitCode = 1; });
