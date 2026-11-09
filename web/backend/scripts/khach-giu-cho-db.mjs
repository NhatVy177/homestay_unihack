import { readFile } from 'node:fs/promises';
import { getPool } from '../database/connection.js';

// D-026: luồng giữ chỗ của khách. Đổi 1 ràng buộc CHECK + CREATE OR ALTER procedure, không đụng dữ liệu.
const root = new URL('../../../database/', import.meta.url);
let pool;
try {
  pool = await getPool();
  const need = await pool.request().query(
    "SELECT OBJECT_ID('dbo.SP_GuiYeuCauCocKemLuaChon') AS a, OBJECT_ID('dbo.SP_ChonPhongKhachChot') AS b");
  if (!need.recordset[0].a || !need.recordset[0].b) throw new Error('Chạy npm run deposit-flow:db:migrate trước');
  const run = async text => {
    for (const batch of text.split(/^\s*GO\s*$/gim).map(x => x.trim()).filter(Boolean)) {
      await pool.request().batch(batch);
    }
  };
  await run(await readFile(new URL('SP_DatCoc/trang-thai-buoi-xem-20261110.sql', root), 'utf8'));
  await run(await readFile(new URL('SP_DatCoc/khach-giu-cho-20261110.sql', root), 'utf8'));
  // Nhánh từ chối mới của SP_XacNhanKhaNangNhanCoc (hồ sơ luôn về "Đã xem").
  const review = (await readFile(new URL('SP_DatCoc/dat-coc-xac-nhan-kha-nang.sql', root), 'utf8'))
    .split(/^\s*GO\s*$/gim).find(x => /CREATE OR ALTER PROCEDURE dbo\.SP_XacNhanKhaNangNhanCoc\b/.test(x));
  if (!review) throw new Error('SP_XacNhanKhaNangNhanCoc not found');
  await pool.request().batch(review);
  console.log('Customer hold, viewing status and reject procedures applied.');
} catch (error) {
  console.error('Khach giu cho migration failed:', error.message);
  process.exitCode = 1;
} finally {
  if (pool) await pool.close();
}
