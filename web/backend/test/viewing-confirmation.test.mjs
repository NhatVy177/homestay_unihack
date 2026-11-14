import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { confirmViewing, attachViewingConfirmations } from '../services/viewingConfirmation.service.js';
import { patchViewingOutcomeConfirmation } from '../scripts/viewing-confirmation-db.mjs';
const customer={vaiTro:'KhachHang',maNguoiDung:'KH0001'};
const ready=async()=>({recordset:[{ready:true}]});
test('D-045: only the authenticated customer and a valid schedule version reach confirmation SQL',async()=>{
  let calls=0;const run=async(name,parameters)=>{calls++;assert.equal(name,'dbo.SP_KhachXacNhanLichXem');const p=Object.fromEntries(parameters.map(x=>[x.name,x.value]));assert.deepEqual(p,{MaKhachHang:'KH0001',MaDangKy:'DK0001',STTLich:1,PhienBanLich:2});return{recordset:[{id:'DK0001-1',phienBanLich:2}]};};
  await confirmViewing('DK0001-1',{phienBanLich:2,maKhachHang:'KH9999'},customer,{query:ready,run});assert.equal(calls,1);
  for(const user of [null,{...customer,vaiTro:'NhanVien'},{...customer,maNguoiDung:'NV0001'}])await assert.rejects(confirmViewing('DK0001-1',{phienBanLich:2},user,{query:ready,run}),e=>e.statusCode===403);
  for(const data of [{},{phienBanLich:'2'},{phienBanLich:0},{phienBanLich:2147483648}])await assert.rejects(confirmViewing('DK0001-1',data,customer,{query:ready,run}),e=>e.statusCode===400);
  await assert.rejects(confirmViewing('DK0001-1',{phienBanLich:2},customer,{query:async()=>({recordset:[{ready:false}]}),run}),e=>e.statusCode===503);assert.equal(calls,1);
});
test('D-045: ownership and stale-version errors remain 404/409, never become success',async()=>{
  for(const [number,statusCode] of [[50401,404],[50402,409]])await assert.rejects(confirmViewing('DK0001-1',{phienBanLich:1},customer,{query:ready,run:async()=>{throw Object.assign(new Error('Lịch đã thay đổi'),{number});}}),e=>e.statusCode===statusCode);
});
test('D-045: reads mask attendance permissions until the current version is confirmed; missing migration is safe',async()=>{
  const rows=[1,2,3].map(n=>({id:`DK000${n}-1`,coTheGhiNhanKetQua:true}));
  const query=async(text,params)=>text.includes('AS ready')?ready():({recordset:[{id:'DK0001-1',phienBanLich:2,khachXacNhanPhienBan:2,thoiGianKhachXacNhan:'2026-11-14T01:00Z'},{id:'DK0002-1',phienBanLich:3,khachXacNhanPhienBan:2,thoiGianKhachXacNhan:'2026-11-14T01:00Z'}]});
  const enriched=await attachViewingConfirmations(rows,query);assert.deepEqual(enriched.map(r=>r.coTheGhiNhanKetQua),[true,false,false]);assert.deepEqual(rows.map(r=>r.coTheGhiNhanKetQua),[true,true,true]);
  const unavailable=await attachViewingConfirmations(rows,async()=>({recordset:[{ready:false}]}));assert.ok(unavailable.every(r=>!r.coTheGhiNhanKetQua&&!r.xacNhanLichSanSang));
});
test('D-045 migration preserves deployed outcome rules, is repeatable, and rejects unknown SQL',async()=>{
  const source=await readFile(new URL('../../../database/migrations/20261111_manual_viewing_outcome.sql',import.meta.url),'utf8');
  const definition=source.slice(source.indexOf('CREATE OR ALTER PROCEDURE')).replace(/\s*GO\s*$/,'');
  const patched=patchViewingOutcomeConfirmation(definition);assert.match(patched,/THROW 50403/);assert.ok(patched.indexOf('THROW 50403')<patched.indexOf('UPDATE dbo.LichXemPhong SET TrangThai'));
  assert.equal(patchViewingOutcomeConfirmation(patched),patched);assert.match(patched,/p.MaChiNhanh <> @Branch/);assert.match(patched,/@Time > GETDATE/);
  assert.match(patchViewingOutcomeConfirmation(patched.replace('CREATE OR ALTER PROCEDURE','CREATE PROCEDURE')),/^CREATE OR ALTER PROCEDURE/);
  assert.throws(()=>patchViewingOutcomeConfirmation('CREATE PROCEDURE unknown AS SELECT 1'),/Missing locked/);
  const migration=await readFile(new URL('../../../database/migrations/20261114_viewing_confirmation.sql',import.meta.url),'utf8');assert.match(migration,/PhienBanLich = target.PhienBanLich \+ 1/);assert.match(migration,/KhachXacNhanPhienBan = NULL/);assert.match(migration,/COALESCE\(ThoiGianKhachXacNhan,SYSUTCDATETIME/);
});
