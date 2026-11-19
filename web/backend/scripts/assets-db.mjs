import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const requiredObjects = [
  ['dbo.KhoTaiSanChiNhanh', 'U'],
  ['dbo.PhieuDieuChuyenTaiSan', 'U'],
  ['dbo.Seq_DieuChuyenTaiSan', 'SO'],
  ['dbo.SP_DieuPhoiTaiSan_Chuyen', 'P'],
  ['dbo.SP_DieuPhoiTaiSan_DanhSachKho', 'P'],
  ['dbo.SP_DieuPhoiTaiSan_DanhSachPhong', 'P'],
  ['dbo.SP_DieuPhoiTaiSan_LichSu', 'P'],
];

async function inspect(pool, sql) {
  const request = pool.request();
  requiredObjects.forEach(([name], index) => request.input(`name${index}`, sql.NVarChar(128), name));
  const unions = requiredObjects.map(([, type], index) =>
    `SELECT @name${index} AS name, CAST(CASE WHEN OBJECT_ID(@name${index}, N'${type}') IS NULL THEN 0 ELSE 1 END AS bit) AS installed`
  );
  const result = await request.query(unions.join('\nUNION ALL\n'));
  return result.recordset;
}
export async function run(mode = 'migrate') {
  if (!['check', 'migrate'].includes(mode)) throw new Error('Usage: assets-db.mjs check|migrate');
  const { getPool, sql } = await import('../database/connection.js');
  const pool = await getPool();
  let transaction;
  try {
    const before = await inspect(pool, sql);
    if (mode === 'check') {
      console.log(JSON.stringify({ mode, objects: before }, null, 2));
      if (before.some((item) => !item.installed)) process.exitCode = 2;
      return;
    }

    const migration = await readFile(
      new URL('../../../database/migrations/20261119_asset_transfer.sql', import.meta.url),
      'utf8'
    );
    transaction = new sql.Transaction(pool);
    await transaction.begin();
    for (const batch of migration.split(/^\s*GO\s*$/mi).filter((text) => text.trim())) {
      await new sql.Request(transaction).batch(batch);
    }
    await transaction.commit();
    transaction = null;

    const after = await inspect(pool, sql);
    if (after.some((item) => !item.installed)) throw new Error('Migration finished but one or more asset-transfer objects are missing.');
    console.log(JSON.stringify({ mode, objects: after }, null, 2));
    console.log('D-076 asset transfer schema installed. No existing room assets or contracts were changed.');
  } catch (error) {
    if (transaction) await transaction.rollback().catch(() => {});
    throw error;
  } finally {
    await pool.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  run(process.argv[2] || 'migrate').catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

