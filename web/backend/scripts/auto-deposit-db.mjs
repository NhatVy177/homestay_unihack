import { readFile } from 'node:fs/promises';
import { getPool } from '../database/connection.js';
// D-019: tài khoản "Hệ thống tự động" + công tắc TU_DONG_DUYET_COC, và ẩn tài khoản đó khỏi danh sách
// nhân viên của Admin (áp lại đúng batch SP_Admin_DanhSachNhanVien từ file SP gốc).
const root = new URL('../../../database/', import.meta.url);
async function adminListProcedure() {
  const text = await readFile(new URL('SP_Admin/admin.sql', root), 'utf8');
  const batch = text.split(/^\s*GO\s*$/m).find(part => /CREATE OR ALTER PROCEDURE dbo\.SP_Admin_DanhSachNhanVien\b/.test(part));
  if (!batch) throw new Error('SP_Admin_DanhSachNhanVien batch not found');
  return batch;
}
let pool;
try {
  pool = await getPool();
  await pool.request().query(await readFile(new URL('migrations/20261106c_auto_deposit.sql', root), 'utf8'));
  await pool.request().batch(await adminListProcedure());
  const result = await pool.request().query(`SELECT
    (SELECT COUNT(*) FROM dbo.NhanVien WHERE MaNhanVien = 'NVAUTO') AS taiKhoanHeThong,
    (SELECT GiaTri FROM dbo.ThamSoHeThong WHERE MaThamSo = 'TU_DONG_DUYET_COC') AS tuDongDuyetCoc`);
  console.log(JSON.stringify(result.recordset[0]));
} catch (error) {
  console.error('Auto deposit migration failed:', error.code || error.name, error.message);
  process.exitCode = 1;
} finally { if (pool) await pool.close(); }
