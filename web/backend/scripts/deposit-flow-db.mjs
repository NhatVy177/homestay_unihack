import { readFile } from 'node:fs/promises';
import { getPool } from '../database/connection.js';

const root = new URL('../../../database/', import.meta.url);
let pool;
try {
  pool = await getPool();
  const autoAccount = await pool.request().query("SELECT 1 AS ok FROM dbo.NhanVien WHERE MaNhanVien='NVAUTO'");
  if (!autoAccount.recordset[0]) throw new Error('Chạy npm run auto-deposit:db:migrate trước');
  const migration = await readFile(new URL('migrations/20261107_deposit_flow.sql', root), 'utf8');
  await pool.request().batch(migration);
  const sql = await readFile(new URL('SP_DatCoc/deposit-flow-20261107.sql', root), 'utf8');
  for (const batch of sql.split(/^\s*GO\s*$/gim).map(x => x.trim()).filter(Boolean)) {
    await pool.request().batch(batch);
  }
  const reviewSql = await readFile(new URL('SP_DatCoc/dat-coc-xac-nhan-kha-nang.sql', root), 'utf8');
  const reviewBatch = reviewSql.split(/^\s*GO\s*$/gim).find(x => /CREATE OR ALTER PROCEDURE dbo\.SP_DanhSachChoXacNhanCoc\b/.test(x));
  if (!reviewBatch) throw new Error('SP_DanhSachChoXacNhanCoc not found');
  await pool.request().batch(reviewBatch);
  const bankSql = await readFile(new URL('SP_DatCoc/dat-coc-xac-nhan-thanh-toan.sql', root), 'utf8');
  const bankBatch = bankSql.split(/^\s*GO\s*$/gim).find(x => /CREATE OR ALTER PROCEDURE dbo\.SP_DanhSachChoXacNhanThanhToan\b/.test(x));
  if (!bankBatch) throw new Error('SP_DanhSachChoXacNhanThanhToan not found');
  await pool.request().batch(bankBatch);
  const saleSql = await readFile(new URL('SP_DatCoc/dat-coc-gui-yeu-cau.sql', root), 'utf8');
  const saleBatch = saleSql.split(/^\s*GO\s*$/gim).find(x => /CREATE OR ALTER PROCEDURE dbo\.SP_DanhSachDatCocSale\b/.test(x));
  if (!saleBatch) throw new Error('SP_DanhSachDatCocSale not found');
  await pool.request().batch(saleBatch);
  const receiptSql = await readFile(new URL('SP_DatCoc/dat-coc-thanh-toan.sql', root), 'utf8');
  const receiptBatch = receiptSql.split(/^\s*GO\s*$/gim).find(x => /CREATE OR ALTER PROCEDURE dbo\.SP_DanhSachChoGhiNhanChungTu\b/.test(x));
  if (!receiptBatch) throw new Error('SP_DanhSachChoGhiNhanChungTu not found');
  await pool.request().batch(receiptBatch);
  console.log('Deposit flow migration and procedures applied.');
} catch (error) {
  console.error('Deposit flow migration failed:', error.message);
  process.exitCode = 1;
} finally {
  if (pool) await pool.close();
}
