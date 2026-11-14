import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export function patchViewingOutcomeConfirmation(definition) {
  if (!definition || !/WITH\s*\(UPDLOCK,\s*HOLDLOCK\)/i.test(definition)) throw new Error('Missing locked viewing-outcome procedure; inspect before migrating.');
  const normalized=definition.replace(/^\s*(?:CREATE(?:\s+OR\s+ALTER)?|ALTER)\s+PROC(?:EDURE)?\b/i,'CREATE OR ALTER PROCEDURE');
  if (definition.includes('-- D-045 confirmed viewing gate')) return normalized;
  const anchor = '    UPDATE dbo.LichXemPhong SET TrangThai = @KetQua,';
  if (definition.split(anchor).length !== 2 || !/BEGIN TRANSACTION/i.test(definition)) throw new Error('Unknown viewing-outcome definition; refusing to overwrite it.');
  const gate = `    -- D-045 confirmed viewing gate
    IF NOT EXISTS (SELECT 1 FROM dbo.LichXemPhong
      WHERE MaDangKy=@MaDangKy AND STTLich=@STTLich
        AND KhachXacNhanPhienBan=PhienBanLich AND ThoiGianKhachXacNhan IS NOT NULL)
      THROW 50403, N'Khách chưa xác nhận phiên bản lịch hiện tại. Chưa được ghi kết quả buổi xem.', 1;
`;
  return normalized.replace(anchor,gate+anchor);
}
export async function migrateViewingConfirmation(pool, sql, expectedDatabase) {
  const db=(await pool.request().query('SELECT DB_NAME() AS name')).recordset[0]?.name;
  if(db!==expectedDatabase || !/^(HOMEDORM4|HOMEDORM_CONFIRM_TEST_\d+)$/.test(db)) throw new Error('Unexpected migration database.');
  const definition=(await pool.request().query("SELECT OBJECT_DEFINITION(OBJECT_ID(N'dbo.SP_GhiNhanKetQuaBuoiXem')) AS definition")).recordset[0]?.definition;
  const patched=patchViewingOutcomeConfirmation(definition);
  const source=await readFile(new URL('../../../database/migrations/20261114_viewing_confirmation.sql',import.meta.url),'utf8');
  const transaction=new sql.Transaction(pool);await transaction.begin();
  try {
    for(const batch of source.split(/^\s*GO\s*$/mi).filter(s=>s.trim())) await new sql.Request(transaction).batch(batch);
    await new sql.Request(transaction).batch(patched);await transaction.commit();
  } catch(error) { if(!transaction._aborted) await transaction.rollback().catch(()=>{});throw error; }
}
async function main(){
  const mode=process.argv[2]||'check';
  if(!['check','migrate'].includes(mode)||process.argv.length>3)throw new Error('Usage: viewing-confirmation-db.mjs check|migrate');
  const {getPool,sql}=await import('../database/connection.js');const pool=await getPool();
  try {
    if(mode==='migrate')await migrateViewingConfirmation(pool,sql,process.env.DB_NAME||'HOMEDORM4');
    const result=await pool.request().query(`SELECT DB_NAME() AS databaseName,
      COL_LENGTH('dbo.LichXemPhong','PhienBanLich') AS versionColumn,
      COL_LENGTH('dbo.LichXemPhong','KhachXacNhanPhienBan') AS confirmedVersionColumn,
      COL_LENGTH('dbo.LichXemPhong','ThoiGianKhachXacNhan') AS confirmedAtColumn,
      OBJECT_ID('dbo.SP_KhachXacNhanLichXem','P') AS confirmationProcedure,
      (SELECT is_disabled FROM sys.triggers WHERE object_id=OBJECT_ID('dbo.TR_LichXemPhong_DoiGioXacNhan')) AS resetTriggerDisabled,
      CHARINDEX('-- D-045 confirmed viewing gate',OBJECT_DEFINITION(OBJECT_ID('dbo.SP_GhiNhanKetQuaBuoiXem'))) AS outcomeGate`);
    const state=result.recordset[0];
    const ready=Boolean(state?.versionColumn&&state.confirmedVersionColumn&&state.confirmedAtColumn&&state.confirmationProcedure&&(state.resetTriggerDisabled===false||state.resetTriggerDisabled===0)&&state.outcomeGate>0);
    console.log(JSON.stringify({mode,...state,ready}));if(!ready)process.exitCode=1;
  }finally{await pool.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
