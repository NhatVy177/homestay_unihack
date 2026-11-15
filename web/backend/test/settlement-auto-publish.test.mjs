import test from 'node:test';
import assert from 'node:assert/strict';
import { onWeb2SettlementSent } from '../integrations/avalanche/index.js';

const accountant = { vaiTro: 'NhanVien', chucVu: 'Kế toán', maNguoiDung: 'NV0008', maChiNhanh: 'CN0002' };
const deps = (over = {}) => ({ enabled: () => true, contractOf: async () => 'HD0001', service: () => ({ list: async () => [{ id: '0xabc', contractId: 'HD0001' }], propose: async (_u, id, source) => ({ id, source }) }), ...over });

test('a settlement sent to the customer is proposed on the matching case automatically', async () => {
  let call;
  const result = await onWeb2SettlementSent(accountant, 'DS0001', deps({ service: () => ({ list: async () => [{ id: '0xabc', contractId: 'HD0001' }, { id: '0xdef', contractId: 'HD0002' }], propose: async (...args) => { call = args; return { id: args[1] }; } }) }));
  assert.deepEqual(result, { status: 'published', caseId: '0xabc' });
  assert.deepEqual([call[1], call[2]], ['0xabc', 'DS0001']);
});

test('it skips quietly when Avalanche is off, the return has no contract, or the contract has no confirmation case', async () => {
  assert.equal((await onWeb2SettlementSent(accountant, 'DS0001', deps({ enabled: () => false }))).status, 'disabled');
  assert.deepEqual(await onWeb2SettlementSent(accountant, 'DS0001', deps({ contractOf: async () => null })), { status: 'skipped', reason: 'no-contract' });
  assert.deepEqual(await onWeb2SettlementSent(accountant, 'DS0001', deps({ service: () => ({ list: async () => [], propose: async () => { throw new Error('must not run'); } }) })), { status: 'skipped', reason: 'no-case' });
});

test('chain errors never block Web2 and are reported for the manual fallback', async () => {
  const quiet = console.warn; console.warn = () => {};
  try {
    const result = await onWeb2SettlementSent(accountant, 'DS0001', deps({ service: () => ({ list: async () => [{ id: '0xabc', contractId: 'HD0001' }], propose: async () => { throw new Error('Cần bàn giao đã xác nhận hoặc đối soát bị phản đối.'); } }) }));
    assert.equal(result.status, 'failed'); assert.match(result.message, /bàn giao đã xác nhận/);
  } finally { console.warn = quiet; }
});
