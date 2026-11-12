import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { CheckoutClosure } from '../services/checkoutClosure.service.js';
import { ClosureProofs } from '../services/checkoutClosure.proofs.js';
import { DAY, moneyState, exceptionEligibility, responseState, assertAccess } from '../services/checkoutClosure.rules.js';
import { remindPendingCases } from '../services/checkoutLifecycleScheduler.service.js';
import { patchFinancialProcedure, patchLegacyProcedure, patchRefundList } from '../scripts/checkout-lifecycle-db.mjs';

const manager={vaiTro:'NhanVien',chucVu:'Quản lý',maNguoiDung:'NV0001',maChiNhanh:'CN0001'};
test('C4/D-041: refund list permits payment before closure, preserving return/status/branch filters',()=>{
  const source="CREATE PROCEDURE dbo.SP_TraPhong_KeToan_DanhSachChoHoanCoc AS SELECT ds.* FROM dbo.DoiSoat ds JOIN dbo.PhieuTraPhong pt ON pt.MaPhieuTra=ds.MaPhieuTra LEFT JOIN dbo.HopDongThue hd ON hd.MaHopDong=pt.MaHopDong WHERE ds.TrangThai = N'Chờ hoàn cọc' AND pt.TrangThai = N'Chờ hoàn cọc' AND (pt.MaHopDong IS NULL OR hd.TrangThai = N'Đã thanh lý')\n AND (@MaChiNhanh IS NULL OR p.MaChiNhanh = @MaChiNhanh);";
  const patched=patchRefundList(source);
  assert.ok(!patched.includes("hd.TrangThai = N'Đã thanh lý'"));
  for(const predicate of ["ds.TrangThai = N'Chờ hoàn cọc'","pt.TrangThai = N'Chờ hoàn cọc'",'(@MaChiNhanh IS NULL OR p.MaChiNhanh = @MaChiNhanh)']) assert.ok(patched.includes(predicate));
  assert.equal(patchRefundList(patched),patched);
  assert.equal(patchRefundList(patched.replace('CREATE OR ALTER PROCEDURE','CREATE PROCEDURE')),patched);
  assert.throws(()=>patchRefundList('CREATE PROCEDURE dbo.X AS SELECT 1'),/drifted/);
});
const now=Date.parse('2026-11-12T08:00:00Z');
const waiting={state:'review',drafts:[{revision:1,publishedAt:new Date(now-8*DAY).toISOString()}],versions:[]};
const contact={id:'proof',sha256:'a'.repeat(64)};
function fixture(overrides={}) {
  const row={contractId:'HD0001',returnId:'PT0001',settlementId:'DS0001',customerId:'KH0001',branchId:'CN0001',
    refundDueVnd:100,topUpDueVnd:0,paymentStatus:'Chờ hoàn cọc',case:structuredClone(waiting),...overrides};
  let closes=0,keys=0,verified=0,mailed=0;
  const repository={context:async()=>row,moneySnapshot:r=>({id:r.contractId}),
    prepareException:async(r,u,reason,p)=>Object.assign(row,{exceptionReason:reason,contactProof:p,preparedSettlementId:r.settlementId,preparedRefund:r.refundDueVnd,preparedTopUp:r.topUpDueVnd}),
    accepted:async()=>{},disputed:async()=>{},close:async(r,b)=>{closes++;row.closedAt='closed';row.bundle=b.bundle;},
    returnKeys:async()=>{keys++;row.keysReturnedAt='returned';},claimMail:async()=>row.closedAt?row:null,finishMail:async()=>{},contractForSettlement:async()=>row.contractId};
  const proof={sha256:'b'.repeat(64),amountVnd:String(row.refundDueVnd||row.topUpDueVnd),direction:row.refundDueVnd?'refund':'top-up',paidAt:'2026-11-12T07:00:00Z',bytes:Buffer.from('%PDF-1.7'),name:'proof.pdf',mediaType:'application/pdf'};
  const s=new CheckoutClosure({repository,clock:()=>now,proofs:{get:async()=>({meta:contact}),financial:async()=>row.paidAt?proof:null,save:async()=>contact},
    statement:async()=>({x:1}),verifyAccepted:async()=>{verified++;return true;},notify:async()=>{mailed++;return {status:'sent'};}});
  return {s,row,counts:()=>({closes,keys,verified,mailed})};
}
test('C4/D-041: exception cannot close unpaid refund; key return is independent',async()=>{
  const {s,row,counts}=fixture();
  await s.prepareException(manager,row.contractId,'Đã liên hệ nhiều lần','proof');
  assert.equal((await s.status(manager,row.contractId)).canCloseWithoutConsent,false);
  await assert.rejects(s.closeWithoutConsent(manager,row.contractId),/Chưa chi đủ/);
  await s.returnKeys(manager,row.contractId);
  assert.equal(counts().keys,1);assert.equal(counts().closes,0);
  Object.assign(row,{paidAt:'2026-11-12T07:00:00Z',paymentStatus:'Đã quyết toán'});
  assert.equal((await s.status(manager,row.contractId)).canCloseWithoutConsent,true);
  await s.closeWithoutConsent(manager,row.contractId);
  assert.equal(counts().closes,1);assert.equal(counts().verified,0,'exception never checks or writes chain');
  assert.equal(row.bundle.web2.mode,'without-consent');assert.equal(counts().mailed,1);
});
test('C4: accepted refund/top-up closes only after current matching chain agreement and payment',async()=>{
  for(const amounts of [{refundDueVnd:100,topUpDueVnd:0},{refundDueVnd:0,topUpDueVnd:100},{refundDueVnd:0,topUpDueVnd:0}]) {
    const {s,row,counts}=fixture({...amounts,case:{state:'accepted',versions:[{sourceId:'DS0001',accepted:true,bundle:{version:2,confirmationReceipt:{},documents:{statement:{payload:{x:1}}}}}]}});
    await s.reconcile(row.contractId);
    assert.equal(counts().closes,amounts.refundDueVnd||amounts.topUpDueVnd?0:1);
    if(!row.closedAt){Object.assign(row,{paidAt:'2026-11-12T07:00:00Z',paymentStatus:'Đã quyết toán'});await s.reconcile(row.contractId);}
    assert.equal(counts().closes,1);
    await s.reconcile(row.contractId);assert.equal(counts().closes,1,'retry does not close again');
  }
  const {s,row}=fixture({case:{state:'accepted',versions:[{sourceId:'DS0001',accepted:true,bundle:{version:1,confirmationReceipt:{},documents:{statement:{payload:{x:2}}}}}]}});
  await assert.rejects(s.reconcile(row.contractId),/khác bản khách/);
});
test('C4: owner and branch checks; 7 days uses newest sent version, no synthetic consent',()=>{
  assert.throws(()=>assertAccess({...manager,maChiNhanh:'CN0002'},{branchId:'CN0001'},'Quản lý'),e=>e.statusCode===403);
  assert.throws(()=>assertAccess({vaiTro:'KhachHang',maNguoiDung:'KH0002'},{customerId:'KH0001'}),e=>e.statusCode===403);
  assert.equal(exceptionEligibility(waiting,now).allowed,true);
  assert.equal(exceptionEligibility({...waiting,pending:{hash:'0x1'}},now).allowed,false);
  assert.equal(exceptionEligibility({...waiting,drafts:[...waiting.drafts,{revision:2,publishedAt:new Date(now-DAY).toISOString()}]},now).allowed,false);
  assert.equal(exceptionEligibility({state:'disputed'},now).allowed,true);
  assert.deepEqual(responseState(waiting,now).reminders,[24,72]);
  assert.equal(moneyState({settlementId:'DS0001',refundDueVnd:1,topUpDueVnd:2},null).ready,false);
});
test('C4: reminders persisted per phase/version, 24h and 72h once; no chain operation',async()=>{
  let c={id:'case',contractId:'HD0001',revision:1,...structuredClone(waiting),notifications:[]};
  const sent=[];
  const service={exclusive:fn=>fn(),isClosed:async()=>false,store:{getCase:async()=>structuredClone(c),saveCase:async value=>(c={...value,revision:c.revision+1})},
    notified:async(value,kind)=>{sent.push(kind);c={...value,notifications:[...value.notifications,{kind,status:'sent',at:new Date(now).toISOString()}]};}};
  await remindPendingCases(service,[c],now-6*DAY);await remindPendingCases(service,[c],now-6*DAY);
  await remindPendingCases(service,[c],now);await remindPendingCases(service,[c],now);
  assert.deepEqual(sent,['reminder:handover:1:24','reminder:handover:1:72']);assert.equal(c.responseTracking.overdue,true);
  c={...c,state:'active'};await remindPendingCases(service,[c],now+DAY);assert.equal(sent.length,2);
});
test('C4: proof bytes are hashed, scoped and safe; external or another settlement reference refused',async()=>{
  const dir=await mkdtemp(resolve(tmpdir(),'homedorm-proof-'));
  try {
    const uploads=resolve(dir,'uploads');await mkdir(uploads);
    const p=new ClosureProofs({directory:resolve(dir,'private'),uploads});
    const file=Buffer.from('%PDF-1.7\nexample');await writeFile(resolve(uploads,'DS0001_1_file.pdf'),file);
    const row={settlementId:'DS0001',refundDueVnd:100,paymentReference:'/uploads/chung-tu-doi-soat/DS0001_1_file.pdf',paidAt:'2026-11-12T07:00:00Z'};
    const actual=await p.financial(row);assert.equal(actual.amountVnd,'100');assert.equal(actual.sha256.length,64);
    await assert.rejects(p.financial({...row,settlementId:'DS0002'}),/không thuộc/);
    await assert.rejects(p.financial({...row,paymentReference:'https://host/proof.pdf'}),/chưa hợp lệ/);
    await assert.rejects(p.financial({...row,paymentReference:'/uploads/chung-tu-doi-soat/../x'}),/chưa hợp lệ/);
    const saved=await p.contact('HD0001',{buffer:file,originalname:'proof.pdf'});
    assert.equal((await p.get('HD0001',saved.id)).meta.sha256,actual.sha256);
    await assert.rejects(p.get('HD0002',saved.id),/thiếu/);
    await writeFile(resolve(dir,'private','HD0001',saved.id+'.bin'),'changed');
    await assert.rejects(p.get('HD0001',saved.id),/không khớp/);
  } finally {await rm(dir,{recursive:true,force:true});}
});
test('C4: migration patches payment time once, preserves procedure and refuses drift',()=>{
  const input="CREATE PROCEDURE dbo.SP_TraPhong_KeToan_XacNhanThuThem AS BEGIN BEGIN TRANSACTION; UPDATE DoiSoat SET NgayThanhToan = @NgayThanhToan, TrangThai=N'Đã quyết toán'; COMMIT; END";
  const patched=patchFinancialProcedure('dbo.SP_TraPhong_KeToan_XacNhanThuThem',input);
  assert.match(patched,/ThoiDiemThanhToan = SYSUTCDATETIME\(\)/);
  assert.equal(patchFinancialProcedure('dbo.SP_TraPhong_KeToan_XacNhanThuThem',patched),patched);
  assert.throws(()=>patchFinancialProcedure('dbo.SP_TraPhong_KeToan_XacNhanThuThem','CREATE PROCEDURE x AS SELECT 1'),/drifted/);
});

test('C4: re-running the migration on an already patched legacy procedure keeps CREATE OR ALTER',()=>{
  const stored="CREATE   PROCEDURE dbo.SP_TraPhong_QuanLy_XacNhanThanhLy @MaPhieuTra varchar(6) AS BEGIN SET NOCOUNT ON; SELECT 1; END";
  const once=patchLegacyProcedure('dbo.SP_TraPhong_QuanLy_XacNhanThanhLy',stored);
  const deployed=once.replace('CREATE OR ALTER PROCEDURE','CREATE   PROCEDURE');
  const twice=patchLegacyProcedure('dbo.SP_TraPhong_QuanLy_XacNhanThanhLy',deployed);
  assert.match(twice,/^CREATE OR ALTER PROCEDURE/);
  assert.equal(twice.split('C4_LEGACY_CONTRACT_BLOCK').length,2,'the guard is inserted once');
});
