import test from 'node:test';
import assert from 'node:assert/strict';
import { xuLyYeuCauCocQuaHan } from '../services/yeuCauCocQuaHan.service.js';

test('D-023: 12h job notifies only IDs returned by SQL and can repeat safely', async () => {
  const calls = [];
  let run = 0;
  const deps = {
    execute: async name => {
      assert.equal(name, 'dbo.SP_TuChoiYeuCauCocQuaHan');
      return { recordsets: [run++ === 0 ? [{ maDangKy: 'DKTEST', outcome: 'rejected' }] : []] };
    },
    query: async () => ({ recordset: [] }),
    notify: async (...args) => calls.push(args),
  };
  assert.equal(await xuLyYeuCauCocQuaHan(deps), 1);
  assert.equal(await xuLyYeuCauCocQuaHan(deps), 0);
  assert.deepEqual(calls, [['rejected', 'DKTEST', 'Quản lý chưa xử lý trong 12 giờ']]);
});

test('D-023: a failed request and email do not block later requests or manager reminders', async () => {
  const warned = [];
  const calls = [];
  const count = await xuLyYeuCauCocQuaHan({
    execute: async () => ({ recordsets: [[
      { maDangKy: 'DKFAIL', outcome: 'failed', errorNumber: 50208, errorMessage: 'Missing room' },
      { maDangKy: 'DKGOOD', outcome: 'rejected' },
      { maDangKy: 'DKGOOD2', outcome: 'rejected' },
    ]] }),
    query: async () => ({ recordset: [{ maDangKy: 'DKREM1' }, { maDangKy: 'DKREM2' }] }),
    notify: async (kind, id) => { calls.push([kind, id]); if (id === 'DKGOOD' || id === 'DKREM1') throw new Error('SMTP failed'); },
    log: { warn: message => warned.push(message) },
  });
  assert.equal(count, 2);
  assert.deepEqual(calls, [
    ['rejected', 'DKGOOD'], ['rejected', 'DKGOOD2'],
    ['manager-reminder', 'DKREM1'], ['manager-reminder', 'DKREM2'],
  ]);
  assert.equal(warned.length, 3);
});
