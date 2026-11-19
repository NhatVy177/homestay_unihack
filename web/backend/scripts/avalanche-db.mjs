import { readFile } from 'node:fs/promises';
import { getPool } from '../database/connection.js';
const command = process.argv[2] || 'check';
if (!['check', 'migrate'].includes(command)) throw new Error('Usage: node scripts/avalanche-db.mjs check|migrate');
const root = new URL('../../../database/', import.meta.url);
const migrations = ['migrations/20261105_avalanche.sql', 'migrations/20261105b_payment_simulator.sql', 'migrations/20261106_first_charge_payment.sql', 'migrations/20261119_handover_asset_condition.sql'];
// D-012: SP05 no longer requires a paper signature. The SP file stays the single source of truth;
// only its SP_LapBienBanBanGiaoVao batch is re-applied here.
async function handoverProcedure() {
  const text = await readFile(new URL('SP_NhanPhong/sp_lap_bien_ban_ban_giao.sql', root), 'utf8');
  const batch = text.split(/^\s*GO\s*$/m).find(part => /CREATE OR ALTER PROCEDURE SP_LapBienBanBanGiaoVao\b/.test(part));
  if (!batch) throw new Error('SP_LapBienBanBanGiaoVao batch not found');
  return batch;
}
async function firstChargeProcedures() {
  const text = await readFile(new URL('SP_NhanPhong/sp_ghi_nhan_khoan_thu_nhan_phong.sql', root), 'utf8');
  const batches = text.split(/^\s*GO\s*$/m);
  return ['SP_GhiNhanKhoanThuNhanPhong', 'SP_LayChiTietThuNhanPhong'].map(name => {
    const batch = batches.find(part => new RegExp(`CREATE OR ALTER PROCEDURE ${name}\\b`).test(part));
    if (!batch) throw new Error(`${name} batch not found`);
    return batch;
  });
}
let pool;
try {
  pool = await getPool();
  if (command === 'migrate') {
    for (const file of migrations) await pool.request().query(await readFile(new URL(file, root), 'utf8'));
    await pool.request().batch(await handoverProcedure());
    for (const procedure of await firstChargeProcedures()) await pool.request().batch(procedure);
  }
  const result = await pool.request().query(`SELECT DB_NAME() AS databaseName;
    SELECT name FROM sys.tables WHERE name IN ('AvalancheWallet','AvalancheChallenge','AvalancheCase','PaymentSimOrder');
    SELECT CASE WHEN OBJECT_DEFINITION(OBJECT_ID('dbo.SP_LapBienBanBanGiaoVao')) LIKE N'%chưa ký xác nhận biên bản%' THEN 'requires-paper-signature' ELSE 'electronic-confirmation' END AS handoverProcedure;`);
  console.log(JSON.stringify(result.recordsets, null, 2));
} catch (error) {
  console.error('SQL check/migration failed:', error.code || error.name, error.message);
  process.exitCode = 1;
} finally { if (pool) await pool.close(); }
