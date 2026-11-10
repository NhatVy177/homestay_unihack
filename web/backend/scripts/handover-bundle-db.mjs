import { readFile } from 'node:fs/promises';
import { getPool } from '../database/connection.js';

let pool;
try {
  const source = await readFile(new URL('../../../database/avalanche/20261111_handover_evidence.sql', import.meta.url), 'utf8');
  pool = await getPool();
  await pool.request().batch(source);
  console.log('C1 handover evidence tables prepared; legacy slips require customer policy acknowledgment.');
} catch (error) {
  console.error('C1 migration failed:', error.message);
  process.exitCode = 1;
} finally { if (pool) await pool.close(); }
