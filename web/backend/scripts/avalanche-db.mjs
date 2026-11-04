import { readFile } from 'node:fs/promises';
import { getPool } from '../database/connection.js';
const command = process.argv[2] || 'check';
if (!['check', 'migrate'].includes(command)) throw new Error('Usage: node scripts/avalanche-db.mjs check|migrate');
let pool;
try {
  pool = await getPool();
  if (command === 'migrate') {
    const migration = await readFile(new URL('../../../database/migrations/20261105_avalanche.sql', import.meta.url), 'utf8');
    await pool.request().query(migration);
  }
  const result = await pool.request().query(`SELECT DB_NAME() AS databaseName;
    SELECT name FROM sys.tables WHERE name IN ('AvalancheWallet','AvalancheChallenge','AvalancheCase');
    SELECT TABLE_NAME,COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME IN ('BienBanBanGiao','DoiSoat','HopDongThue') ORDER BY TABLE_NAME,ORDINAL_POSITION;`);
  console.log(JSON.stringify(result.recordsets, null, 2));
} catch (error) {
  console.error('SQL check/migration failed:', error.code || error.name);
  process.exitCode = 1;
} finally { if (pool) await pool.close(); }
