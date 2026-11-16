import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeAbiParameters, encodeEventTopics } from 'viem';
import { abi } from '@homestaydorm/settlement/abi';
import { createStatsReader, summarize } from '../integrations/avalanche/publicStats.js';

const ADDRESS = '0x70bF83f4742BEE4093Aa51622b0BCb53Ed91389C';
const id = (n) => `0x${String(n).padStart(64, '0')}`;
const tenant = '0x7bb2e96898Db7e387e118eB92a9C390E29f54B2f';
const commit = id(99);

function log(eventName, args, blockNumber, logIndex = 0) {
  const def = abi.find((item) => item.type === 'event' && item.name === eventName);
  const topics = encodeEventTopics({ abi, eventName, args: Object.fromEntries(def.inputs.filter((i) => i.indexed).map((i) => [i.name, args[i.name]])) });
  const data = encodeAbiParameters(def.inputs.filter((i) => !i.indexed), def.inputs.filter((i) => !i.indexed).map((i) => args[i.name]));
  return { address: ADDRESS, topics, data, blockNumber: BigInt(blockNumber), logIndex, transactionHash: id(blockNumber * 10 + logIndex) };
}

const LOGS = [
  log('HandoverProposed', { agreementId: id(1), tenant, commitment: commit }, 5),
  log('HandoverAccepted', { agreementId: id(1), tenant, commitment: commit }, 6),
  log('HandoverProposed', { agreementId: id(2), tenant, commitment: commit }, 7),
  log('SettlementProposed', { agreementId: id(1), version: 1, commitment: commit, refundDue: 2500000n, topUpDue: 0n }, 3000),
  log('SettlementAccepted', { agreementId: id(1), version: 1, commitment: commit }, 3001),
  log('SettlementProposed', { agreementId: id(2), version: 1, commitment: commit, refundDue: 0n, topUpDue: 2640000n }, 5000),
  log('SettlementDisputed', { agreementId: id(2), version: 1, reasonHash: commit }, 5001),
  log('SettlementProposed', { agreementId: id(2), version: 2, commitment: commit, refundDue: 0n, topUpDue: 2000000n }, 5002),
  log('SettlementAccepted', { agreementId: id(2), version: 2, commitment: commit }, 5003),
];

function fakeClient({ logs = LOGS } = {}) {
  const calls = [];
  const byHash = (hash) => logs.filter((l) => l.transactionHash === hash);
  return {
    calls,
    async getTransactionReceipt({ hash }) {
      calls.push(hash);
      const mine = byHash(hash);
      if (!mine.length) throw new Error('not found');
      return { status: 'success', logs: mine };
    },
    async getBlock({ blockNumber }) { return { timestamp: 1_700_000_000n + blockNumber }; },
  };
}
const hashesOf = (logs = LOGS) => () => logs.map((l) => l.transactionHash);

test('totals come only from decoded events of receipts read from the chain, other logs and unknown hashes are ignored', async () => {
  const client = fakeClient();
  const noise = { address: '0x0000000000000000000000000000000000000001', topics: LOGS[0].topics, data: LOGS[0].data, blockNumber: 10n, logIndex: 5, transactionHash: id(1) };
  const withNoise = { ...client, getTransactionReceipt: async (q) => (q.hash === id(1) ? { status: 'success', logs: [noise] } : client.getTransactionReceipt(q)) };
  const reader = createStatsReader({ client: withNoise, address: ADDRESS, listHashes: () => [...hashesOf()(), id(1), id(424242)] });
  const snap = await reader.snapshot({ recent: 3 });
  assert.equal(snap.ready, true);
  assert.deepEqual([snap.handoversPublished, snap.handoversConfirmed, snap.settlementsSent, snap.settlementsAccepted, snap.disputes], [2, 1, 2, 2, 1]);
  assert.equal(snap.acceptedWithoutDispute, 1, 'chỉ hồ sơ 1 được đồng ý ngay không phản hồi');
  assert.equal(snap.refundVnd, '2500000'); assert.equal(snap.topUpVnd, '2000000', 'chỉ tính bản đối soát đã được đồng ý (v2)');
  assert.equal(snap.recent.length, 3); assert.equal(snap.recent[0].type, 'SettlementAccepted'); assert.equal(snap.recent[0].blockNumber, '5003');
  assert.match(snap.recent[0].hash, /^0x[0-9a-f]{64}$/); assert.ok(snap.recent[0].at);
});

test('each transaction receipt is read once; new transactions are picked up later; failures are retried', async () => {
  const client = fakeClient();
  let hashes = LOGS.slice(0, 3).map((l) => l.transactionHash);
  let t = 0;
  const reader = createStatsReader({ client, address: ADDRESS, listHashes: () => hashes, now: () => t, staleMs: 10 });
  assert.equal((await reader.snapshot()).handoversPublished, 2);
  assert.equal(client.calls.length, 3);
  hashes = LOGS.map((l) => l.transactionHash); t = 100;
  await reader.snapshot(); await reader.refresh();
  assert.equal(client.calls.length, 3 + (LOGS.length - 3), 'chỉ đọc thêm các giao dịch mới');
  assert.equal((await reader.snapshot()).settlementsAccepted, 2);
});

test('not ready when no receipt could be read yet; summarize handles an empty chain', async () => {
  const reader = createStatsReader({ client: fakeClient({ logs: [] }), address: ADDRESS, listHashes: () => [id(5)] });
  const snap = await reader.snapshot();
  assert.equal(snap.ready, true); assert.equal(snap.transactions, 0); assert.equal(snap.handoversPublished, 0);
  const failing = createStatsReader({ client: fakeClient(), address: ADDRESS, listHashes: async () => { throw new Error('db down'); } });
  assert.deepEqual(await failing.snapshot(), { ready: false });
  assert.deepEqual(summarize([]), { handoversPublished: 0, handoversConfirmed: 0, settlementsSent: 0, settlementsAccepted: 0, acceptedWithoutDispute: 0, disputes: 0, refundVnd: '0', topUpVnd: '0' });
});
