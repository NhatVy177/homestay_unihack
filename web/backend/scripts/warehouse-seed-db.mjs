import { readFile } from 'node:fs/promises';
import { getPool } from '../database/connection.js';

// Nạp hàng dự phòng cho kho chi nhánh (chỉ thêm dòng chưa có). Chạy lại được. Hỏi Vy trước khi chạy lên HOMEDORM4.
const file = new URL('../../../database/migrations/20261119_seed_branch_warehouse.sql', import.meta.url);
let pool;
try {
  pool = await getPool();
  const result = await pool.request().batch(await readFile(file, 'utf8'));
  console.table(result.recordset);
} catch (error) {
  console.error('Warehouse seed failed:', error.message);
  process.exitCode = 1;
} finally { if (pool) await pool.close(); }
