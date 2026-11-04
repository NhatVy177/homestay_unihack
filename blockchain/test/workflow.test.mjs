import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createWalletClient, custom, zeroHash } from 'viem';
import { generatePrivateKey, privateKeyToAccount, mnemonicToAccount } from 'viem/accounts';
import { hardhat } from 'viem/chains';
import { localChain } from '../scripts/local-chain.mjs';
import { verifyEvidence, canonicalize, documentHash } from '../src/evidence.js';
import { confirmationData } from '../src/confirmation.js';
import { AvalancheService } from '../../web/backend/integrations/avalanche/service.js';
import { makeChain } from '../../web/backend/integrations/avalanche/chain.js';
import { checkSnapshot } from '../../web/frontend/src/lib/avalanche/evidence.js';
import { abi } from '../src/abi.js';

class MemoryStore {
  wallets = new Map(); challenges = new Map(); cases = new Map(); failFinalize = false;
  async getWallet(id) { return this.wallets.get(id); }
  async challenge(c) { this.challenges.set(c.id, structuredClone(c)); }
  async getChallenge(id) { return structuredClone(this.challenges.get(id)); }
  async link(c) {
    const record = this.challenges.get(c.id);
    if (record.used || Date.parse(record.expiresAt) < Date.now()) throw new Error('Used/expired');
    if ([...this.wallets].some(([id, a]) => id !== c.userId && a === c.address)) throw new Error('Duplicate wallet');
    record.used = true; this.wallets.set(c.userId, c.address);
  }
  async getCase(id) { return structuredClone(this.cases.get(id)); }
  async pendingForSigner(signer) { return [...this.cases.values()].find(c => c.pending?.signer?.toLowerCase() === signer.toLowerCase())?.id; }
  async listCases(u) { return [...this.cases.values()].filter(c => u.vaiTro === 'KhachHang' ? c.customerId === u.maNguoiDung : c.branchId === u.maChiNhanh).map(v => structuredClone(v)); }
  async saveCase(c, expected = null) {
    const old = this.cases.get(c.id);
    if (expected === null && [...this.cases.values()].some(x => x.contractId === c.contractId)) throw new Error('Duplicate contract');
    if (expected !== null && old?.revision !== expected) throw new Error('CAS conflict');
    if (this.failFinalize && old?.pending && !c.pending) { this.failFinalize = false; throw new Error('SQL unavailable after receipt'); }
    const next = structuredClone({ ...c, revision: expected === null ? 0 : expected + 1 });
    this.cases.set(c.id, next); return structuredClone(next);
  }
}
const manager = { maNguoiDung: 'NV0001', maChiNhanh: 'CN0001', vaiTro: 'NhanVien', chucVu: 'Quản lý' };
const accountant = { ...manager, maNguoiDung: 'NV0002', chucVu: 'Kế toán' };
const tenant = { maNguoiDung: 'KH0001', vaiTro: 'KhachHang' };
const outsider = { maNguoiDung: 'KH0002', vaiTro: 'KhachHang' };
async function fixture() {
  const ctx = await localChain();
  // Public Hardhat TEST mnemonic. Never used outside isolated local test chain.
  const wallets = Object.fromEntries([['manager', 0], ['accountant', 1], ['relayer', 3]].map(([role, addressIndex]) => [
    role, createWalletClient({ account: mnemonicToAccount('test test test test test test test test test test test junk', { addressIndex }), chain: hardhat, transport: custom(ctx.provider) }),
  ]));
  const chain = makeChain(ctx.deployment, ctx.client, wallets);
  const store = new MemoryStore(), customerWallet = privateKeyToAccount(generatePrivateKey());
  let deductions = '900000';
  const sources = {
    async handover() { return { contractId: 'HD0001', customerId: tenant.maNguoiDung, branchId: manager.maChiNhanh, inventory: [{ item: 'Nệm', quantity: 1, condition: 'Đã rách lúc nhận phòng' }] }; },
    async statement(sourceId, c, version) {
      return { schema: 'homestaydorm.settlement.v1', agreementId: c.id, version, depositHeldVnd: c.depositHeldVnd,
        items: [{ category: 'repair', description: 'Khoản trừ đang đề xuất', amountVnd: deductions }],
        deductionsVnd: deductions, refundDueVnd: String(Math.max(Number(c.depositHeldVnd) - Number(deductions), 0)),
        topUpDueVnd: String(Math.max(Number(deductions) - Number(c.depositHeldVnd), 0)) };
    },
  };
  const service = new AvalancheService({ store, sources, chain, origin: 'https://local.example' });
  const challenge = await service.challenge(tenant, customerWallet.address);
  await service.link(tenant, challenge.id, await customerWallet.signMessage({ message: challenge.message }));
  const create = () => service.create(manager, { sourceId: 'BG0001', depositHeldVnd: '3000000', policy: 'Hợp đồng đủ hạn; trừ nợ và chi phí hai bên đồng ý.', depositConfirmed: true });
  const confirm = async (id, action, reason) => {
    const r = await service.prepare(tenant, id, action, reason);
    const signature = await customerWallet.signTypedData(r.typedData);
    return service.confirm(tenant, id, { message: r.typedData.message, dispute: r.dispute, signature, savedCopy: true });
  };
  return { ...ctx, service, store, chain, customerWallet, challenge, create, confirm, revise: value => { deductions = value; } };
}
describe('Integrated account → tenant signature → relayer → contract → evidence (local)', () => {
  it('runs handover, dispute v1, revision v2, acceptance and independent verification without tenant gas', async () => {
    const c = await fixture();
    try {
      assert.equal(await c.client.getBalance({ address: c.customerWallet.address }), 0n);
      let r = await c.create();
      assert.equal(r.state, 'handover-pending');
      assert.equal((await verifyEvidence(c.client, c.deployment, r.handover)).accepted, false);
      const preview = await c.service.prepare(tenant, r.id, 1);
      await checkSnapshot(c.client, c.deployment, abi, preview.bundle, preview.typedData.message);
      const alteredPreview = structuredClone(preview.bundle);
      alteredPreview.documents.handover.payload.inventory[0].condition = 'Nguyên vẹn';
      await assert.rejects(checkSnapshot(c.client, c.deployment, abi, alteredPreview, preview.typedData.message));
      r = await c.confirm(r.id, 1);
      assert.equal(r.state, 'active');
      r = await c.service.propose(accountant, r.id, 'DS0001');
      assert.equal(r.versions[0].bundle.documents.statement.payload.refundDueVnd, '2100000');
      r = await c.confirm(r.id, 3, 'Nệm đã rách trong biên bản đầu kỳ.');
      c.revise('500000');
      r = await c.service.propose(accountant, r.id, 'DS0001');
      assert.equal(r.versions.length, 2);
      r = await c.confirm(r.id, 2);
      assert.equal(r.state, 'accepted');
      const old = await verifyEvidence(c.client, c.deployment, r.versions[0].bundle);
      const latest = await verifyEvidence(c.client, c.deployment, r.versions[1].bundle);
      assert.equal(old.valid, true); assert.equal(old.superseded, true); assert.equal(old.disputed, true);
      assert.equal(latest.valid, true); assert.equal(latest.accepted, true); assert.equal(latest.refundDueVnd, '2500000');
      assert.equal((await verifyEvidence(c.client, c.deployment, r.handover)).accepted, true);
      await assert.rejects(c.service.propose(accountant, r.id, 'DS0001'));
      assert.equal(await c.client.getBalance({ address: c.customerWallet.address }), 0n);
      const edited = structuredClone(r.versions[1].bundle);
      edited.documents.statement.payload.items[0].amountVnd = '1';
      assert.equal((await verifyEvidence(c.client, c.deployment, edited)).valid, false);
    } finally { await c.close(); }
  });
  it('enforces account/branch/role access and one-time wallet binding', async () => {
    const c = await fixture();
    try {
      await assert.rejects(c.service.link(tenant, c.challenge.id, await c.customerWallet.signMessage({ message: c.challenge.message })));
      await assert.rejects(c.service.create(accountant, {}));
      await assert.rejects(c.service.create({ ...manager, maChiNhanh: 'CN9999' }, { sourceId: 'BG0001' }));
      const r = await c.create();
      assert.equal((await c.service.list(outsider)).length, 0);
      assert.equal((await c.service.list(tenant)).length, 1);
      await assert.rejects(c.service.prepare(outsider, r.id, 1));
      await assert.rejects(c.service.prepare(manager, r.id, 1));
      await assert.rejects(c.service.sync({ ...manager, maChiNhanh: 'CN9999' }, r.id));
      await assert.rejects(c.service.challenge(tenant, privateKeyToAccount(generatePrivateKey()).address));
    } finally { await c.close(); }
  });
  it('rejects replay, wrong signer/domain/action/commitment and expired confirmations on-chain', async () => {
    const c = await fixture();
    try {
      const r = await c.create(), prepared = await c.service.prepare(tenant, r.id, 1), m = prepared.typedData.message;
      const attempt = async (message, signer = c.customerWallet, deployment = c.deployment) => {
        const signature = await signer.signTypedData(confirmationData(deployment, message));
        return c.chain.prepare('relayer', 'confirm', [message, signature], 'HandoverAccepted', {});
      };
      await assert.rejects(attempt(m, privateKeyToAccount(generatePrivateKey())));
      await assert.rejects(attempt(m, c.customerWallet, { ...c.deployment, chainId: 43113 }));
      await assert.rejects(attempt(m, c.customerWallet, { ...c.deployment, address: c.addresses[3] }));
      await assert.rejects(attempt({ ...m, deadline: '1' }));
      await assert.rejects(attempt({ ...m, commitment: zeroHash }));
      await assert.rejects(attempt({ ...m, action: 2 }));
      const sig = await c.customerWallet.signTypedData(prepared.typedData);
      await c.service.confirm(tenant, r.id, { message: m, signature: sig, savedCopy: true });
      await assert.rejects(attempt(m));
    } finally { await c.close(); }
  });
  it('rejects stale versions and altered reason hashes', async () => {
    const c = await fixture();
    try {
      const r = await c.create(); await c.confirm(r.id, 1);
      await c.service.propose(accountant, r.id, 'DS0001');
      const old = await c.service.prepare(tenant, r.id, 2);
      await c.confirm(r.id, 3, 'Phản đối');
      c.revise('500000'); await c.service.propose(accountant, r.id, 'DS0001');
      const sig = await c.customerWallet.signTypedData(old.typedData);
      await assert.rejects(c.service.confirm(tenant, r.id, { message: old.typedData.message, signature: sig, savedCopy: true }));
      const p = await c.service.prepare(tenant, r.id, 3, 'Nội dung gốc');
      const signature = await c.customerWallet.signTypedData(p.typedData);
      await assert.rejects(c.service.confirm(tenant, r.id, { message: p.typedData.message, signature, savedCopy: true, dispute: { ...p.dispute, payload: { reason: 'Bị sửa' } } }));
    } finally { await c.close(); }
  });
  it('recovers chain-success/SQL-failure exactly once from durable signed bytes', async () => {
    const c = await fixture();
    try {
      const r = await c.create(), prepared = await c.service.prepare(tenant, r.id, 1);
      const signature = await c.customerWallet.signTypedData(prepared.typedData);
      c.store.failFinalize = true;
      await assert.rejects(c.service.confirm(tenant, r.id, { message: prepared.typedData.message, signature, savedCopy: true }), /SQL unavailable/);
      const before = await c.store.getCase(r.id);
      assert.ok(before.pending.rawTransaction);
      const fixed = await c.service.sync(tenant, r.id);
      assert.equal(fixed.state, 'active'); assert.equal(fixed.pending, null);
      const count = fixed.receipts.length;
      assert.equal((await c.service.sync(tenant, r.id)).receipts.length, count);
    } finally { await c.close(); }
  });
  it('handles refund/top-up/zero balances and canonical document validation', async () => {
    const c = await fixture();
    try {
      assert.deepEqual(await c.chain.read('calculateBalance', [3000000n, 3500000n]), [0n, 500000n]);
      assert.deepEqual(await c.chain.read('calculateBalance', [3000000n, 3000000n]), [0n, 0n]);
      assert.equal(canonicalize({ b: 2, a: 1 }), canonicalize({ a: 1, b: 2 }));
      assert.throws(() => canonicalize({ n: 1.2 }));
      const r = await c.create();
      const bad = structuredClone(r.handover);
      delete bad.documents.policy.salt;
      assert.equal((await verifyEvidence(c.client, c.deployment, bad)).valid, false);
      bad.documents.policy.salt = '0x' + 'ff'.repeat(32);
      assert.equal((await verifyEvidence(c.client, c.deployment, bad)).valid, false);
    } finally { await c.close(); }
  });
  it('holds a signer nonce until a pending transaction from another case is reconciled', async () => {
    const c = await fixture();
    try {
      const r = await c.create();
      const signer = c.addresses[3];
      await c.store.saveCase({ id: 'other-case', contractId: 'HD0002', pending: { signer } });
      await assert.rejects(c.confirm(r.id, 1), /ví vận hành/i);
      c.store.cases.delete('other-case');
      assert.equal((await c.confirm(r.id, 1)).state, 'active');
    } finally { await c.close(); }
  });
});
