import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { encodeAbiParameters, parseEther, zeroAddress } from 'viem';
import { preflightFuji, verifyRoles } from '../scripts/deployment.mjs';
import { verificationRequest, verifyFuji } from '../scripts/verify-fuji.mjs';

const manager = '0x' + '1'.repeat(40), accountant = '0x' + '2'.repeat(40), address = '0x' + '3'.repeat(40);
const artifact = { sourceName: 'contracts/DormSettlement.sol', contractName: 'DormSettlement', compilerVersion: '0.8.38+commit.test.Emscripten.clang', bytecode: '0x6000', abi: [{ type: 'constructor', inputs: [{ type: 'address', name: 'manager' }, { type: 'address', name: 'accountant' }], stateMutability: 'nonpayable' }] };
const input = { language: 'Solidity', settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: 'cancun' }, sources: {} };
const inputText = JSON.stringify(input);
const manifest = () => ({ chainId: 43113, address, manager, accountant, compilerVersion: artifact.compilerVersion, transactionHash: '0x' + 'a'.repeat(64), standardInputSha256: createHash('sha256').update(inputText).digest('hex'), constructorArguments: encodeAbiParameters([{ type: 'address' }, { type: 'address' }], [manager, accountant]), sourceVerification: 'pending' });

test('deployment preflight rejects wrong chain, invalid roles and insufficient gas without sending', async () => {
  const client = { getChainId: async () => 43113, estimateGas: async () => 1000000n, getGasPrice: async () => 1000000000n, getBalance: async () => parseEther('0.05') };
  const args = { client, wallet: { account: { address: manager } }, artifact, manager, accountant, log: () => {} };
  assert.equal((await preflightFuji(args)).reserve, parseEther('0.002'));
  await assert.rejects(preflightFuji({ ...args, client: { ...client, getChainId: async () => 1 } }), /not Avalanche Fuji/);
  await assert.rejects(preflightFuji({ ...args, accountant: manager }), /distinct nonzero/);
  await assert.rejects(preflightFuji({ ...args, accountant: zeroAddress }), /distinct nonzero/);
  await assert.rejects(preflightFuji({ ...args, client: { ...client, getBalance: async () => 0n } }), /below estimated/);
});

test('deployment roles must agree with the public manifest', async () => {
  await verifyRoles({ readContract: async ({ functionName }) => ({ manager, accountant })[functionName] }, artifact, manifest());
  await assert.rejects(verifyRoles({ readContract: async () => manager }, artifact, manifest()), /roles do not match/);
});

test('source verification pins compiler, standard input, constructor arguments and Fuji target', () => {
  const d = manifest();
  const request = verificationRequest(d, artifact, input, inputText);
  assert.equal(request.compilerVersion, '0.8.38+commit.test');
  assert.equal(request.creationTransactionHash, d.transactionHash);
  assert.throws(() => verificationRequest({ ...d, chainId: 1 }, artifact, input, inputText), /confirmed Fuji/);
  assert.throws(() => verificationRequest(d, artifact, input, inputText + '\n'), /differs from the input/);
  assert.throws(() => verificationRequest({ ...d, constructorArguments: '0x' }, artifact, input, inputText), /Constructor arguments/);
  assert.throws(() => verificationRequest(d, artifact, { ...input, settings: {} }, inputText), /Compiler version or settings/);
});

function verifierFixture({ match = 'exact_match', failed = false } = {}) {
  const deployment = manifest(), calls = [], saves = [];
  let lookups = 0;
  const response = (status, body) => ({ status, ok: status < 400, json: async () => body });
  const fetcher = async (url, options) => {
    calls.push({ url, method: options?.method || 'GET' });
    if (url.includes('/v2/contract/')) return ++lookups === 1 ? response(404, {}) : response(200, { address, chainId: '43113', creationMatch: match, runtimeMatch: match, deployment: { transactionHash: deployment.transactionHash } });
    if (options?.method === 'POST') return response(202, { verificationId: '12345678-1234-1234-1234-123456789abc' });
    return response(200, failed ? { isJobCompleted: true, error: { customCode: 'no_match' } } : { isJobCompleted: true });
  };
  return { deployment, calls, saves, request: {}, fetcher, persist: async value => saves.push(structuredClone(value)), wait: async () => {}, log: () => {} };
}

test('Sourcify ticket is persisted and only exact creation/runtime for the same deployment is marked verified', async () => {
  const f = verifierFixture();
  await verifyFuji(f);
  assert.equal(f.saves[0].sourceVerification, 'pending');
  assert.equal(f.saves.at(-1).sourceVerification, 'verified');
  assert.match(f.saves.at(-1).sourceVerificationUrl, /43113/);
  for (const options of [{ match: 'match' }, { failed: true }]) {
    const rejected = verifierFixture(options);
    await assert.rejects(verifyFuji(rejected), /not marked verified|verification failed/);
    assert.ok(rejected.saves.every(value => value.sourceVerification === 'pending'));
  }
});

test('saved verification job is resumed without another source submission', async () => {
  const f = verifierFixture();
  f.deployment.sourceVerificationJob = '12345678-1234-1234-1234-123456789abc';
  await verifyFuji(f);
  assert.equal(f.calls.filter(call => call.method === 'POST').length, 0);
});
