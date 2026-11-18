import { readFile } from 'node:fs/promises';
import { getPool } from '../database/connection.js';

const pool = await getPool();
try {
  const migration = await readFile(new URL('../../../database/migrations/20261118_loyalty_points.sql', import.meta.url), 'utf8');
  for (const batch of migration.split(/^\s*GO\s*$/im).map(part => part.trim()).filter(Boolean)) {
    await pool.request().batch(batch);
  }
  console.log('Đã cài bảng và các thủ tục điểm thưởng.');
} finally {
  await pool.close();
}
