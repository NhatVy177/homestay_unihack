import test from 'node:test';
import assert from 'node:assert/strict';
import { nhaChoCocHetHan } from '../services/datCocHetHan.service.js';

test('D-023: expiry mail scans only slips whose payment deadline was within 48 hours', async () => {
  const sent = [];
  let expiredQuerySeen = false;
  const count = await nhaChoCocHetHan({
    query: async statement => {
      if (statement.includes('COUNT(*) AS soPhieu')) return { recordset: [{ soPhieu: 2 }] };
      if (statement.includes("TrangThaiThanhToan=N'Hết hạn'")) {
        expiredQuerySeen = true;
        assert.match(statement, /ThoiHanThanhToan BETWEEN DATEADD\(HOUR,-48,GETDATE\(\)\) AND GETDATE\(\)/);
        return { recordset: [{ id: 'DCRECENT' }] };
      }
      return { recordset: [{ id: 'DCREMIND' }] };
    },
    execute: async name => assert.equal(name, 'dbo.SP_NhaChoCocHetHan'),
    notify: async (...args) => sent.push(args),
  });
  assert.equal(count, 2);
  assert.equal(expiredQuerySeen, true);
  assert.deepEqual(sent, [['expired', 'DCRECENT'], ['reminder', 'DCREMIND']]);
});
