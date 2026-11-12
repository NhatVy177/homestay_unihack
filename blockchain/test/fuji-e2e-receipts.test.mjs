import assert from 'node:assert/strict';
import { test } from 'node:test';
import { encodeAbiParameters, encodeEventTopics, encodeFunctionData, getAbiItem, zeroHash } from 'viem';
import { abi } from '../src/abi.js';
import { collectReceipts, receiptTable } from '../scripts/fuji-e2e-receipts.mjs';

function fixture() {
  const address = digit => '0x' + digit.repeat(40);
  const manifest = { chainId: 43113, address: address('5'), manager: address('1'), accountant: address('2'), fundingTransactions: [{ role: 'relayer', address: address('3') }] };
  const id = '0x' + 'a'.repeat(64), commitment = '0x' + 'b'.repeat(64), reason = '0x' + 'c'.repeat(64), tenant = address('4');
  const hashes = [1, 2, 3, 4, 5, 6].map(value => '0x' + String(value).repeat(64));
  const names = ['HandoverProposed', 'HandoverAccepted', 'SettlementProposed', 'SettlementDisputed', 'SettlementProposed', 'SettlementAccepted'];
  const versions = [0, 0, 1, 1, 2, 2], actions = [null, 1, null, 3, null, 2];
  const receipts = hashes.map((hash, i) => {
    const args = { agreementId: id, tenant, commitment, version: versions[i], reasonHash: reason, refundDue: 50n, topUpDue: 0n };
    const event = getAbiItem({ abi, name: names[i] });
    const fields = event.inputs.filter(input => !input.indexed);
    return { status: 'success', blockNumber: BigInt(100 + i), transactionIndex: 0, gasUsed: 21000n, effectiveGasPrice: 160n,
      logs: [{ address: manifest.address, topics: encodeEventTopics({ abi, eventName: names[i], args }), data: encodeAbiParameters(fields, fields.map(field => args[field.name])) }] };
  });
  const transactions = hashes.map((hash, i) => ({
    to: manifest.address, from: actions[i] ? address('3') : i === 0 ? manifest.manager : manifest.accountant,
    input: actions[i] ? encodeFunctionData({ abi, functionName: 'confirm', args: [{ action: actions[i], agreementId: id, version: versions[i], commitment, reasonHash: actions[i] === 3 ? reason : zeroHash, nonce: BigInt(i), deadline: 9999999999n }, '0x'] })
      : encodeFunctionData({ abi, functionName: i === 0 ? 'proposeHandover' : 'proposeSettlement', args: i === 0 ? [id, tenant, 100n, commitment, commitment] : [id, 50n, commitment] }),
  }));
  const client = {
    getChainId: async () => 43113,
    getTransactionReceipt: async ({ hash }) => receipts[hashes.indexOf(hash)],
    getTransaction: async ({ hash }) => transactions[hashes.indexOf(hash)],
    readContract: async ({ functionName, args }) => functionName === 'getAgreement' ? { status: 5, latestVersion: 2, tenant }
      : { accepted: args[1] === 2, disputeHash: args[1] === 1 ? reason : zeroHash },
  };
  return { client, manifest, hashes, receipts, transactions, id };
}

test('six real-shaped receipts produce measured fees and the complete Markdown table', async () => {
  const f = fixture(), report = await collectReceipts(f);
  assert.equal(report.transactions.length, 6);
  assert.equal(report.agreementId, f.id);
  assert.equal(report.totalFeeWei, String(6n * 21000n * 160n));
  assert.equal(report.transactions[0].feeWei, '3360000');
  assert.equal(receiptTable(report).match(/https:\/\/testnet.snowtrace.io\/tx\//g).length, 6);
  assert.equal(receiptTable(report).includes('Khách đồng ý v2'), true);
});

test('collector rejects duplicate hashes, wrong chain, wrong target, actor or failed receipt', async () => {
  const duplicate = fixture(); duplicate.hashes[5] = duplicate.hashes[0];
  await assert.rejects(collectReceipts(duplicate), /six distinct/);
  const wrongChain = fixture(); wrongChain.client.getChainId = async () => 1;
  await assert.rejects(collectReceipts(wrongChain), /Fuji/);
  for (const mutate of [f => { f.transactions[0].to = f.manifest.manager; }, f => { f.transactions[4].from = f.manifest.manager; }, f => { f.receipts[3].status = 'reverted'; }]) {
    const f = fixture(); mutate(f); await assert.rejects(collectReceipts(f), /failed receipt, wrong contract or wrong operator/);
  }
});

test('collector refuses a different agreement, wrong order or missing final acceptance', async () => {
  const different = fixture();
  different.receipts[3].logs[0].topics = encodeEventTopics({ abi, eventName: 'SettlementDisputed', args: { agreementId: zeroHash, version: 1 } });
  await assert.rejects(collectReceipts(different), /different agreements/);
  const wrongVersion = fixture(); wrongVersion.receipts[4].logs = fixture().receipts[2].logs;
  await assert.rejects(collectReceipts(wrongVersion), /version/);
  const order = fixture(); order.receipts[5].blockNumber = 99n;
  await assert.rejects(collectReceipts(order), /order/);
  const pending = fixture(); pending.client.readContract = async () => ({ status: 3, latestVersion: 2, tenant: '0x' + '4'.repeat(40) });
  await assert.rejects(collectReceipts(pending), /Accepted v2/);
});
