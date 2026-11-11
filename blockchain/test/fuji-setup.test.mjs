import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseEnv } from 'node:util';
import { privateKeyToAccount } from 'viem/accounts';
import { parseEther } from 'viem';
import { fundFuji, loadFujiFunding } from '../scripts/fuji-fund.mjs';

test('keygen prints only three addresses, keeps unrelated config and refuses to replace keys', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'homestaydorm-fuji-'));
  try {
    await writeFile(join(dir, '.env'), 'UNRELATED=keep\nFUJI_DEPLOYER_PRIVATE_KEY=\n');
    const script = new URL('../scripts/fuji-keygen.mjs', import.meta.url);
    const run = () => spawnSync(process.execPath, [fileURLToPath(script)], { cwd: dir, encoding: 'utf8' });
    const result = run();
    assert.equal(result.status, 0, 'keygen should succeed');
    assert.equal(result.stderr, '');
    assert.equal(result.stdout.trim().split('\n').length, 3);
    assert.equal(result.stdout.match(/0x[0-9a-fA-F]{40}\b/g)?.length, 3);
    assert.equal(/0x[0-9a-fA-F]{64}/.test(result.stdout + result.stderr), false);
    const original = await readFile(join(dir, '.env'), 'utf8');
    const backendOriginal = await readFile(join(dir, '.fuji-backend-env.local'), 'utf8');
    const env = parseEnv(original), backend = parseEnv(backendOriginal);
    assert.equal(env.UNRELATED, 'keep');
    // Compare addresses only; assertion diagnostics must never contain private keys.
    assert.equal(privateKeyToAccount(env.FUJI_DEPLOYER_PRIVATE_KEY).address, env.FUJI_MANAGER_ADDRESS);
    assert.equal(privateKeyToAccount(backend.AVALANCHE_MANAGER_PRIVATE_KEY).address, env.FUJI_MANAGER_ADDRESS);
    assert.equal(privateKeyToAccount(backend.AVALANCHE_ACCOUNTANT_PRIVATE_KEY).address, env.FUJI_ACCOUNTANT_ADDRESS);
    const config = await loadFujiFunding(dir);
    assert.equal(new Set(Object.values(config.addresses)).size, 3);
    const second = run();
    assert.equal(second.status, 1);
    assert.match(second.stderr, /Refusing/);
    assert.equal(/0x[0-9a-fA-F]{64}/.test(second.stdout + second.stderr), false);
    assert.ok(await readFile(join(dir, '.env'), 'utf8') === original, 'existing deployer file preserved');
    assert.ok(await readFile(join(dir, '.fuji-backend-env.local'), 'utf8') === backendOriginal, 'existing backend file preserved');
    await writeFile(join(dir, '.env'), 'FUJI_DEPLOYER_PRIVATE_KEY=\n');
    assert.equal(run().status, 1, 'existing backend wallet file must also prevent replacement');
  } finally {
    assert.ok(dirname(resolve(dir)) === resolve(tmpdir()) && dir.includes('homestaydorm-fuji-'), 'cleanup stays in generated temporary directory');
    await rm(dir, { recursive: true, force: true });
  }
});

function fixture(balance = parseEther('1'), chainId = 43113, status = 'success') {
  const calls = [], output = [];
  const addresses = { deployer: '0x' + '1'.repeat(40), accountant: '0x' + '2'.repeat(40), relayer: '0x' + '3'.repeat(40) };
  const balances = { [addresses.deployer]: balance, [addresses.accountant]: 0n, [addresses.relayer]: 0n };
  return {
    calls, output, addresses, balances,
    log: line => output.push(line),
    client: {
      getChainId: async () => chainId,
      getBalance: async ({ address }) => balances[address],
      getGasPrice: async () => 1_000_000_000n,
      estimateGas: async () => 21000n,
      waitForTransactionReceipt: async () => {
        if (status === 'success') {
          const tx = calls.at(-1);
          balances[tx.to] += tx.value;
          balances[addresses.deployer] -= tx.value;
        }
        return { status };
      },
    },
    wallet: { account: { address: addresses.deployer }, sendTransaction: async tx => { calls.push(tx); return '0x' + 'a'.repeat(64); } },
  };
}

test('funding refuses wrong network, zero or insufficient balance before any transfer', async () => {
  for (const [balance, chainId, message] of [[parseEther('1'), 1, /not Avalanche Fuji/], [0n, 43113, /no test AVAX/], [parseEther('0.2'), 43113, /plus gas/]]) {
    const f = fixture(balance, chainId);
    await assert.rejects(fundFuji(f), message);
    assert.equal(f.calls.length, 0);
  }
});

test('funding tops each wallet up to 0.1 and a successful rerun sends nothing', async () => {
  const f = fixture();
  await fundFuji(f);
  assert.deepEqual(f.calls.map(({ to, value }) => ({ to, value })), [
    { to: f.addresses.accountant, value: parseEther('0.1') },
    { to: f.addresses.relayer, value: parseEther('0.1') },
  ]);
  assert.equal(f.balances[f.addresses.accountant], parseEther('0.1'));
  assert.equal(f.balances[f.addresses.relayer], parseEther('0.1'));
  f.balances[f.addresses.deployer] = 0n;
  await fundFuji(f);
  assert.equal(f.calls.length, 2, 'already funded wallets do not need another transfer or deployer gas');
});

test('funding skips an existing wallet, tops up a partial balance and supports check only', async () => {
  const f = fixture();
  f.balances[f.addresses.accountant] = parseEther('0.2');
  f.balances[f.addresses.relayer] = parseEther('0.04');
  await fundFuji({ ...f, dryRun: true });
  assert.equal(f.calls.length, 0);
  await fundFuji(f);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].to, f.addresses.relayer);
  assert.equal(f.calls[0].value, parseEther('0.06'));
});

test('failed receipt stops the next funding transfer and leaves its hash in diagnostics', async () => {
  const failed = fixture(parseEther('1'), 43113, 'reverted');
  await assert.rejects(fundFuji(failed), /transaction failed/);
  assert.equal(failed.calls.length, 1);
  assert.ok(failed.output.some(line => line.includes('Broadcast')));
});
