import { readFile } from 'node:fs/promises';
import { getPool } from '../database/connection.js';

// Thêm cột ChiTietBanGiao.TinhTrang + kiểu TVP_ChiTietBanGiao_V2, rồi áp lại SP_LapBienBanBanGiaoVao và
// SP_LayChiTietBienBanBanGiao từ file SP (nguồn gốc duy nhất). Chạy lại được. Hỏi Vy trước khi chạy lên HOMEDORM4.
const root = new URL('../../../database/', import.meta.url);
const names = ['SP_LapBienBanBanGiaoVao', 'SP_LayChiTietBienBanBanGiao'];
let pool;
try {
  const migration = await readFile(new URL('migrations/20261119_handover_asset_condition.sql', root), 'utf8');
  const spText = await readFile(new URL('SP_NhanPhong/sp_lap_bien_ban_ban_giao.sql', root), 'utf8');
  const batches = spText.split(/^\s*GO\s*$/m);
  const procedures = names.map((name) => {
    const batch = batches.find((part) => new RegExp(`CREATE OR ALTER PROCEDURE ${name}\\b`).test(part));
    if (!batch) throw new Error(`${name} batch not found`);
    return batch;
  });
  pool = await getPool();
  const result = await pool.request().batch(migration);
  console.table(result.recordset);
  for (const batch of procedures) await pool.request().batch(batch);
  console.log('Đã áp dụng tình trạng tài sản bàn giao (cột, kiểu V2, 2 thủ tục).');
} catch (error) {
  console.error('Asset condition migration failed:', error.message);
  process.exitCode = 1;
} finally { if (pool) await pool.close(); }
