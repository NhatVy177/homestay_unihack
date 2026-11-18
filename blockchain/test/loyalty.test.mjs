import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createWalletClient, custom, parseAbi, zeroHash } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { hardhat } from 'viem/chains';
import { localChain } from '../scripts/local-chain.mjs';
import { AWARD_POINTS, VOUCHER_POINTS, loyaltyAbi, redemptionData } from '../src/loyalty.js';
import { makeChain } from '../../web/backend/integrations/avalanche/chain.js';
import { LoyaltyService } from '../../web/backend/integrations/loyalty/service.js';

const awardId = '0x' + '01'.repeat(32);
const redeemId = '0x' + '02'.repeat(32);
const customer = 'KH0001';
const contractId = 'HD0001';
const balance = (chain, wallet) => chain.read('balanceOf', [wallet]);

test('loyalty mints once, requires the tenant signature and recovers a redeemed voucher after a lost SQL write', async () => {
  const ctx = await localChain();
  try {
    const transport = custom(ctx.provider);
    const [operator, tenant, outsider] = [0, 2, 3].map(addressIndex =>
      mnemonicToAccount('test test test test test test test test test test test junk', { addressIndex }));
    const artifact = JSON.parse(await readFile(new URL('../artifacts/DormPoints.json', import.meta.url), 'utf8'));
    const hash = await ctx.wallets[0].deployContract({ abi: artifact.abi, bytecode: artifact.bytecode, args: [operator.address] });
    const address = (await ctx.client.waitForTransactionReceipt({ hash })).contractAddress;
    const deployment = { chainId: 31337, address };
    const chain = makeChain(deployment, ctx.client, { relayer: createWalletClient({ account: operator, chain: hardhat, transport }) }, loyaltyAbi);
    const rows = [{ id: awardId, kind: 'Award', invoiceId: 'HO0002', customerId: customer, contractId, status: 'Queued', linkedWallet: tenant.address }];
    let failFinalize = false;
    const store = {
      locked: async (key, action) => action(null),
      discoverAwards: async () => {},
      next: async () => rows.find(row => ['Queued', 'Sent'].includes(row.status)),
      getWallet: async () => tenant.address,
      operation: async (id, owner) => rows.find(row => row.id === id && row.customerId === owner),
      queueRedemption: async (row, signature) => Object.assign(row, { signature, status: 'Queued' }),
      markSent: async (row, pending) => Object.assign(row, { status: 'Sent', pending: JSON.stringify(pending) }),
      finish: async (id, status) => {
        if (failFinalize) { failFinalize = false; throw new Error('SQL temporarily unavailable'); }
        Object.assign(rows.find(row => row.id === id), { status, pending: null });
      },
    };
    const service = new LoyaltyService(deployment, chain, store);
    assert.equal(await service.processOne(), true);
    assert.equal(await balance(chain, tenant.address), BigInt(AWARD_POINTS));
    await assert.rejects(chain.prepare('relayer', 'award', [tenant.address, awardId]));
    await assert.rejects(ctx.client.simulateContract({
      address, abi: loyaltyAbi, functionName: 'award', args: [tenant.address, zeroHash], account: outsider.address,
    }));
    await assert.rejects(ctx.client.simulateContract({
      address, abi: parseAbi(['function transfer(address,uint256) returns (bool)']),
      functionName: 'transfer', args: [outsider.address, 1n], account: tenant.address,
    }));
    const row = { id: redeemId, kind: 'Redeem', customerId: customer, contractId, status: 'Quoted',
      wallet: tenant.address, deadline: Math.floor(Date.now() / 1000) + 900 };
    rows.push(row);
    const typedData = redemptionData(deployment, row);
    const wrongSignature = await outsider.signTypedData(typedData);
    await assert.rejects(service.redeem(customer, redeemId, wrongSignature), /khớp/);
    const expired = { ...row, deadline: 1 };
    const expiredSignature = await tenant.signTypedData(redemptionData(deployment, expired));
    await assert.rejects(chain.prepare('relayer', 'redeem', [tenant.address, redeemId, 1n, expiredSignature]));
    const signature = await tenant.signTypedData(typedData);
    await assert.rejects(service.redeem('KH0002', redeemId, signature), /Không tìm thấy/);
    assert.equal((await service.redeem(customer, redeemId, signature)).status, 'Queued');
    assert.equal((await service.redeem(customer, redeemId, signature)).status, 'Queued');
    failFinalize = true;
    await assert.rejects(service.processOne(), /SQL temporarily unavailable/);
    assert.equal(await balance(chain, tenant.address), BigInt(AWARD_POINTS - VOUCHER_POINTS));
    assert.equal(row.status, 'Sent');
    assert.equal(await service.processOne(), true);
    assert.equal(row.status, 'Confirmed');
    assert.equal(await service.processOne(), false);
    assert.equal(await balance(chain, tenant.address), 0n);
    await assert.rejects(chain.prepare('relayer', 'redeem', [tenant.address, redeemId, BigInt(row.deadline), signature]));
  } finally {
    await ctx.close();
  }
});
