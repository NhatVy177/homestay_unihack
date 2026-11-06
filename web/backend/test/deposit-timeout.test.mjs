import test from 'node:test';
import assert from 'node:assert/strict';
import { xuLyYeuCauCocQuaHan } from '../services/yeuCauCocQuaHan.service.js';

test('D-023: 12h job notifies only IDs returned by SQL and can repeat safely', async () => {
  const calls = [];
  let run = 0;
  const deps = {
    execute: async name => {
      assert.equal(name, 'dbo.SP_TuChoiYeuCauCocQuaHan');
      return { recordsets: [run++ === 0 ? [{ maDangKy: 'DKTEST' }] : []] };
    },
    query: async () => ({ recordset: [] }),
    notify: async (...args) => calls.push(args),
  };
  assert.equal(await xuLyYeuCauCocQuaHan(deps), 1);
  assert.equal(await xuLyYeuCauCocQuaHan(deps), 0);
  assert.deepEqual(calls, [['rejected', 'DKTEST', 'Quản lý chưa xử lý trong 12 giờ']]);
});
