import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export const financialProcedures=['dbo.SP_TraPhong_KeToan_XacNhanHoanCoc','dbo.SP_TraPhong_KeToan_XacNhanThuThem','dbo.SP_TraPhong_ThuThemQuaViMoPhong'];
export const legacyProcedures=['dbo.SP_TraPhong_QuanLy_XacNhanThanhLy','dbo.SP_TraPhong_QuanLy_GhiNhanBanGiaoRa'];
// SQL Server stores CREATE OR ALTER as "CREATE PROCEDURE", so a re-run must rewrite the header
// even when the body is already patched; otherwise the second migrate fails with "already an object".
const asCreateOrAlter=source=>source.replace(/^[ \t]*(?:CREATE(?:\s+OR\s+ALTER)?|ALTER)\s+PROC(?:EDURE)?\b/gmi,"CREATE OR ALTER PROCEDURE");
export function patchLegacyProcedure(name,source) {
  if(!legacyProcedures.includes(name))throw new Error('Unexpected legacy procedure.');
  if(source.includes('C4_LEGACY_CONTRACT_BLOCK'))return asCreateOrAlter(source);
  const marker=/SET NOCOUNT ON\s*;/i;
  if(!marker.test(source))throw new Error('Legacy procedure drifted.');
  return source.replace(marker,match=>match+`\n    -- C4_LEGACY_CONTRACT_BLOCK: leave deposit-only cancellations unchanged.\n    IF EXISTS(SELECT 1 FROM dbo.PhieuTraPhong WHERE MaPhieuTra=@MaPhieuTra AND MaHopDong IS NOT NULL)\n      THROW 50909,N'Hợp đồng dùng tự thanh lý và thao tác Đã thu chìa khóa.',1;`)
    .replace(/^[ \t]*(?:CREATE(?:\s+OR\s+ALTER)?|ALTER)\s+PROC(?:EDURE)?\b/gmi,'CREATE OR ALTER PROCEDURE');
}
export function patchFinancialProcedure(name,source) {
  if(!financialProcedures.includes(name))throw new Error('Unexpected financial procedure.');
  let result=source;
  if(!result.includes('EXEC dbo.SP_C4_AssertMoney')) {
    const transaction=/BEGIN TRANSACTION\s*;/gi;
    if([...result.matchAll(transaction)].length!==1)throw new Error('Payment transaction drifted.');
    result=result.replace(transaction,match=>match+'\n        EXEC dbo.SP_C4_AssertMoney @SettlementId=@MaDoiSoat;');
  }
  if(name.endsWith('XacNhanHoanCoc')) {
    const old=/IF @MaHopDong IS NOT NULL AND ISNULL\(@TrangThaiHopDong, N''\) <> N'Đã thanh lý'\s*BEGIN\s*THROW 50603, N'Hợp đồng thuê chưa được thanh lý\.', 1;\s*END/;
    const replacement="IF @MaHopDong IS NOT NULL AND NULLIF(LTRIM(RTRIM(@ChungTuThanhToan)), '') IS NULL\n            THROW 50603, N'Cần chứng từ chi hoàn cọc trước khi đóng hợp đồng.', 1;";
    if(old.test(result))result=result.replace(old,replacement);
    else if(!result.includes('Cần chứng từ chi hoàn cọc trước khi đóng hợp đồng.'))throw new Error('Refund procedure drifted; inspect before migrating.');
    result=result.replace("IF @TrangThaiPhieuTra <> N'Chờ hoàn cọc'","IF @TrangThaiPhieuTra NOT IN (N'Chờ hoàn cọc', N'Chờ ký biên bản')");
  }
  if(!result.includes('ThoiDiemThanhToan = SYSUTCDATETIME()')) {
    const date=/NgayThanhToan = (?:@NgayThanhToan|CAST\(SYSDATETIME\(\) AS DATE\)),/g;
    if([...result.matchAll(date)].length!==1)throw new Error('Payment date assignment drifted.');
    result=result.replace(date,match=>match+'\n            ThoiDiemThanhToan = SYSUTCDATETIME(),');
  }
  const header=/^[ \t]*(?:CREATE(?:\s+OR\s+ALTER)?|ALTER)\s+PROC(?:EDURE)?\b/gmi;
  if([...result.matchAll(header)].length!==1)throw new Error('Unexpected procedure header.');
  return result.replace(header,'CREATE OR ALTER PROCEDURE');
}

async function main() {
  const mode=process.argv[2]||'check';
  if(!['check','migrate'].includes(mode)||process.argv.length>3)throw new Error('Usage: checkout-lifecycle-db.mjs check|migrate');
  const {getPool,sql}=await import('../database/connection.js');
  const pool=await getPool();let transaction;
  try {
    const plan=[];
    for(const name of [...financialProcedures,...legacyProcedures]){
      const r=await pool.request().input('name',sql.NVarChar(128),name).query('SELECT OBJECT_DEFINITION(OBJECT_ID(@name)) AS definition');
      const old=r.recordset[0]?.definition;if(!old)throw new Error('Missing financial procedure: '+name);
      plan.push({name,definition:financialProcedures.includes(name)?patchFinancialProcedure(name,old):patchLegacyProcedure(name,old)});
    }
    console.log(JSON.stringify({mode,financialProcedures:plan.map(r=>r.name),businessRowsChanged:false}));
    if(mode==='check')return;
    const ddl=await readFile(new URL('../../../database/migrations/20261112_checkout_lifecycle.sql',import.meta.url),'utf8');
    transaction=new sql.Transaction(pool);await transaction.begin();
    for(const batch of ddl.split(/^\s*GO\s*$/mi).filter(s=>s.trim()))await new sql.Request(transaction).batch(batch);
    for(const item of plan)await new sql.Request(transaction).batch(item.definition);
    await transaction.commit();transaction=null;
    console.log('C4 schema/procedures installed. Existing contracts/receipts/rooms were not updated.');
  } catch(e){if(transaction)await transaction.rollback().catch(()=>{});throw e;}
  finally {await pool.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
