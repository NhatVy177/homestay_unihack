import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export const procedures = [
  'dbo.SP_KhachMoi_DanhSachLichXem', 'dbo.SP_KhachMoi_ChiTietLichXem',
  'dbo.SP_KiemTraDieuKienThue', 'dbo.SP_CapNhatKetQuaXuLyHoSo',
  'dbo.SP_DanhSachPhongDaXem', 'dbo.SP_ChonPhongKhachChot',
  'dbo.SP_GuiYeuCauDatCoc', 'dbo.SP_LapPhieuDatCoc',
];

// Remove only the legacy automatic UPDATE statement, preserving the deployed
// procedure's remaining implementation (later migrations may have changed it).
export function patchAutoViewed(definition) {
  const pattern = /^[ \t]*UPDATE (?:dbo\.LichXemPhong|lxp)\s*\r?\n[ \t]*SET (?:lxp\.)?TrangThai = N'Đã xem'\r?\n(?:(?!;)[\s\S])*?(?:lxp\.)?ThoiGianHen <= GETDATE\(\);\r?\n/gmi;
  const matches = [...definition.matchAll(pattern)];
  let patched = definition.replace(pattern, '');
  if (/SET\s+(?:lxp\.)?TrangThai\s*=\s*N'Đã xem'/i.test(patched)) {
    throw new Error('Unexpected automatic viewing update; inspect the deployed definition before migrating.');
  }
  if (matches.length) {
    const header = /^[ \t]*(?:CREATE(?:\s+OR\s+ALTER)?|ALTER)\s+PROC(?:EDURE)?\b/gmi;
    if ([...patched.matchAll(header)].length !== 1) throw new Error('Unexpected procedure header.');
    patched = patched.replace(header, 'CREATE OR ALTER PROCEDURE');
  }
  return { definition: patched, removed: matches.length };
}

async function main() {
  const mode = process.argv[2] || 'check';
  if (!['check', 'migrate'].includes(mode) || process.argv.length > 3) throw new Error('Usage: viewing-status-db.mjs check|migrate');
  const { getPool, sql } = await import('../database/connection.js');
  const pool = await getPool();
  let transaction;
  try {
    const plan = [];
    for (const name of procedures) {
      const r = await pool.request().input('name', sql.NVarChar(128), name)
        .query('SELECT OBJECT_DEFINITION(OBJECT_ID(@name)) AS definition');
      if (!r.recordset[0]?.definition) throw new Error(`Missing or unreadable procedure: ${name}`);
      plan.push({ name, ...patchAutoViewed(r.recordset[0].definition) });
    }
    console.log(JSON.stringify({ mode, procedures: plan.map(({name,removed})=>({name,removed})) }));
    if (mode === 'check') return;
    transaction = new sql.Transaction(pool);
    await transaction.begin();
    for (const item of plan) {
      if (item.removed) await new sql.Request(transaction).batch(item.definition);
    }
    const migration = await readFile(new URL('../../../database/migrations/20261111_manual_viewing_outcome.sql', import.meta.url), 'utf8');
    for (const batch of migration.split(/^\s*GO\s*$/mi).filter(s=>s.trim())) await new sql.Request(transaction).batch(batch);
    await transaction.commit();
    transaction = null;
    console.log('C5-a ready: legacy automatic updates removed; Sale outcome procedure installed. No business rows updated.');
  } catch (error) {
    if (transaction) await transaction.rollback().catch(()=>{});
    throw error;
  } finally { await pool.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error=>{ console.error(error.message); process.exitCode=1; });
}
