import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeAbiParameters, encodeEventTopics } from 'viem';
import { abi } from '@homestaydorm/settlement/abi';
import { compareWithDatabase, decodeLogs, fetchContractLogs, rebuildAgreements, recoverFromChain } from '../integrations/avalanche/recoverFromChain.js';

const ADDRESS = '0x70bF83f4742BEE4093Aa51622b0BCb53Ed91389C';
const id = (n) => `0x${String(n).padStart(64, '0')}`;
const tenant = '0x7bb2e96898Db7e387e118eB92a9C390E29f54B2f';
const commit = id(99);
let n = 0;
function log(eventName, args, block, address = ADDRESS) {
  const def = abi.find((item) => item.type === 'event' && item.name === eventName);
  const topics = encodeEventTopics({ abi, eventName, args: Object.fromEntries(def.inputs.filter((i) => i.indexed).map((i) => [i.name, args[i.name]])) });
  const data = encodeAbiParameters(def.inputs.filter((i) => !i.indexed), def.inputs.filter((i) => !i.indexed).map((i) => args[i.name]));
  n += 1;
  return { address, topics, data, blockNumber: `0x${block.toString(16)}`, logIndex: '0x0', transactionHash: id(1000 + n), timeStamp: '0x6900' };
}
const LOGS = [
  log('HandoverProposed', { agreementId: id(1), tenant, commitment: commit }, 10),
  log('HandoverAccepted', { agreementId: id(1), tenant, commitment: commit }, 11),
  log('HandoverProposed', { agreementId: id(2), tenant, commitment: commit }, 12),
  log('SettlementProposed', { agreementId: id(1), version: 1, commitment: commit, refundDue: 0n, topUpDue: 2640000n }, 20),
  log('SettlementDisputed', { agreementId: id(1), version: 1, reasonHash: commit }, 21),
  log('SettlementProposed', { agreementId: id(1), version: 2, commitment: commit, refundDue: 0n, topUpDue: 2000000n }, 22),
  log('SettlementAccepted', { agreementId: id(1), version: 2, commitment: commit }, 23),
  log('HandoverProposed', { agreementId: id(3), tenant, commitment: commit }, 30, '0x0000000000000000000000000000000000000001'),
];

test('rebuilds each agreement from chain events only; logs of other contracts are ignored', () => {
  const agreements = rebuildAgreements(decodeLogs(LOGS, ADDRESS));
  assert.equal(agreements.length, 2);
  const a1 = agreements.find((a) => a.agreementId === id(1));
  assert.equal(a1.handover, 'khách đã xác nhận');
  assert.deepEqual(a1.settlement, { version: 2, status: 'khách đồng ý', refundDue: '0', topUpDue: '2000000' });
  assert.equal(a1.events.length, 6);
  assert.equal(agreements.find((a) => a.agreementId === id(2)).handover, 'đã phát hành, chờ khách');
});

test('compares with the database both ways', async () => {
  const agreements = rebuildAgreements(decodeLogs(LOGS, ADDRESS));
  const query = async () => ({ recordset: [{ id: id(1), contractId: 'HD0001' }, { id: id(9), contractId: 'HD0009' }] });
  const result = await compareWithDatabase(agreements, query);
  assert.equal(result.agreements.find((a) => a.agreementId === id(1)).contractId, 'HD0001');
  assert.deepEqual(result.onlyOnChain, [id(2)]);
  assert.deepEqual(result.onlyInDatabase, ['HD0009']);
});

test('reads logs through the explorer API; errors are reported; works without a database', async () => {
  const fetchImpl = async (url) => { assert.match(url, /fromBlock=60882820&toBlock=latest/); return { ok: true, json: async () => ({ status: '1', result: LOGS }) }; };
  const result = await recoverFromChain({ env: { AVALANCHE_CONTRACT_ADDRESS: ADDRESS, AVALANCHE_DEPLOY_BLOCK: '60882820' }, fetchImpl });
  assert.equal(result.events, LOGS.length);
  assert.equal(result.agreements.length, 2);
  await assert.rejects(fetchContractLogs({ address: ADDRESS, fromBlock: 0, fetchImpl: async () => ({ ok: false, status: 503 }) }), /HTTP 503/);
  await assert.rejects(fetchContractLogs({ address: ADDRESS, fromBlock: 0, fetchImpl: async () => ({ ok: true, json: async () => ({ status: '0', message: 'NOTOK', result: 'rate limit' }) }) }), /NOTOK/);
  await assert.rejects(recoverFromChain({ env: {} }), /AVALANCHE_CONTRACT_ADDRESS/);
});
