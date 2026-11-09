import { readFile } from 'node:fs/promises';
import { getPool } from '../database/connection.js';

const root = new URL('../../../database/', import.meta.url);
let pool;
try {
  pool = await getPool();
  const auto = await pool.request().query("SELECT 1 AS ok FROM dbo.NhanVien WHERE MaNhanVien='NVAUTO'");
  if (!auto.recordset[0]) throw new Error('Chạy npm run auto-deposit:db:migrate trước');
  const events = await pool.request().query("SELECT OBJECT_ID(N'dbo.DepositMailEvent',N'U') AS id");
  if (!events.recordset[0]?.id) throw new Error('Chạy npm run deposit-flow:db:migrate trước');
  const source = await readFile(new URL('SP_NhanPhong/sp_cu_tru_nhan_phong.sql', root), 'utf8');
  const names = ['SP_TraCuuPhieuCocCapNhatCuTru', 'SP_LuuHoSoCuTru',
    'SP_GuiDuyetHoSoCuTru', 'SP_LayChiTietHoSoCuTru'];
  for (const name of names) {
    const batch = source.split(/^\s*GO\s*$/gim).find(part => new RegExp(`CREATE OR ALTER PROCEDURE dbo\\.${name}\\b`).test(part));
    if (!batch) throw new Error(`${name} not found`);
    await pool.request().batch(batch);
  }
  console.log('Residence exception approval procedures applied.');
} catch (error) {
  console.error('Residence migration failed:', error.message);
  process.exitCode = 1;
} finally {
  if (pool) await pool.close();
}
