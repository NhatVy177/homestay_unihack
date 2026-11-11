import { readFile } from 'node:fs/promises';
import { getPool } from '../database/connection.js';

// C3: apply database/migrations/20261111_settlement_topup_wallet.sql batch by batch (split on GO).
let pool;
try {
  const source = await readFile(new URL('../../../database/migrations/20261111_settlement_topup_wallet.sql', import.meta.url), 'utf8');
  pool = await getPool();
  for (const batch of source.split(/^\s*GO\s*$/gim).map(part => part.trim()).filter(Boolean)) {
    await pool.request().batch(batch);
  }
  const check = await pool.request().query("SELECT OBJECT_ID(N'dbo.SP_TraPhong_ThuThemQuaViMoPhong', N'P') AS sp");
  if (!check.recordset[0]?.sp) throw new Error('procedure missing after migration');
  console.log('C3 settlement top-up through the simulated wallet prepared.');
} catch (error) {
  console.error('C3 migration failed:', error.message);
  process.exitCode = 1;
} finally { if (pool) await pool.close(); }
