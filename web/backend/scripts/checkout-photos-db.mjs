import { readFile } from 'node:fs/promises';
import { getPool } from '../database/connection.js';

let pool;
try {
  const source = await readFile(new URL('../../../database/migrations/20261111_checkout_photos.sql', import.meta.url), 'utf8');
  pool = await getPool();
  await pool.request().batch(source);
  const check = await pool.request().query("SELECT COUNT(*) AS n FROM sys.tables WHERE name = 'KiemTraTraPhongAnh'");
  console.log(check.recordset[0].n === 1 ? 'C2 checkout photo table ready (KiemTraTraPhongAnh).' : 'C2 table missing after migration.');
  if (check.recordset[0].n !== 1) process.exitCode = 1;
} catch (error) {
  console.error('C2 migration failed:', error.message);
  process.exitCode = 1;
} finally { if (pool) await pool.close(); }
