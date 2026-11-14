import test from 'node:test';
import assert from 'node:assert/strict';
import { patchDemoViewingTime } from '../scripts/demo-viewing-time-db.mjs';
import { boQuaGioHenKhiDemo } from '../services/demoMode.js';
import { ghiNhanKetQuaBuoiXem } from '../services/ketQuaBuoiXem.service.js';

const def = 'CREATE PROCEDURE dbo.SP_GhiNhanKetQuaBuoiXem @KetQua nvarchar(30), @GhiChu nvarchar(500) = NULL AS BEGIN\n IF @Time > GETDATE() OR @X = 1 THROW 1,N\'a\',1; END';
test('demo patch is idempotent and keeps default behaviour', () => {
  const once = patchDemoViewingTime(def);
  assert.match(once, /@BoQuaGioHen bit = 0/); assert.match(once, /\(@Time > GETDATE\(\) AND @BoQuaGioHen = 0\) OR/);
  assert.equal(patchDemoViewingTime(once), once);
  assert.throws(() => patchDemoViewingTime('CREATE PROCEDURE x AS SELECT 1'));
});
test('demo flag is off by default and only passes BoQuaGioHen when on', async () => {
  const user = { vaiTro: 'NhanVien', chucVu: 'Sale', maNguoiDung: 'NV0001', maChiNhanh: 'CN01' };
  const seen = [];
  const run = async (_n, params) => { seen.push(params.map((p) => p.name)); return { recordset: [{}] }; };
  const old = process.env.DEMO_BO_QUA_GIO_HEN;
  try {
    delete process.env.DEMO_BO_QUA_GIO_HEN; assert.equal(boQuaGioHenKhiDemo(), false);
    await ghiNhanKetQuaBuoiXem('DK0001-1', { thaoTac: 'da-xem' }, user, run);
    process.env.DEMO_BO_QUA_GIO_HEN = '1'; assert.equal(boQuaGioHenKhiDemo(), true);
    await ghiNhanKetQuaBuoiXem('DK0001-1', { thaoTac: 'da-xem' }, user, run);
  } finally { if (old === undefined) delete process.env.DEMO_BO_QUA_GIO_HEN; else process.env.DEMO_BO_QUA_GIO_HEN = old; }
  assert.ok(!seen[0].includes('BoQuaGioHen')); assert.ok(seen[1].includes('BoQuaGioHen'));
});
