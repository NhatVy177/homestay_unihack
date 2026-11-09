import { readFile } from 'node:fs/promises';
import { getPool } from '../database/connection.js';

// D-026: tạo SP_KhachGiuCho. Chỉ CREATE OR ALTER procedure, không đụng dữ liệu.
const root = new URL('../../../database/', import.meta.url);
let pool;
try {
  pool = await getPool();
  const need = await pool.request().query(
    "SELECT OBJECT_ID('dbo.SP_GuiYeuCauCocKemLuaChon') AS a, OBJECT_ID('dbo.SP_ChonPhongKhachChot') AS b");
  if (!need.recordset[0].a || !need.recordset[0].b) throw new Error('Chạy npm run deposit-flow:db:migrate trước');
  const text = await readFile(new URL('SP_DatCoc/khach-giu-cho-20261110.sql', root), 'utf8');
  for (const batch of text.split(/^\s*GO\s*$/gim).map(x => x.trim()).filter(Boolean)) {
    await pool.request().batch(batch);
  }
  console.log('SP_KhachGiuCho applied.');
} catch (error) {
  console.error('Khach giu cho migration failed:', error.message);
  process.exitCode = 1;
} finally {
  if (pool) await pool.close();
}
