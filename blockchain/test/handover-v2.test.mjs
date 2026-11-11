import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomBytes, createHash } from 'node:crypto';
import { createEvidence, documentHash, policyVersion, validateHandover, verifyEvidence, writeConfirmed } from '../src/evidence.js';
import { localChain } from '../scripts/local-chain.mjs';

const hash = () => '0x' + randomBytes(32).toString('hex');
function documents(agreementId, tenant, version = 2) {
  const text = 'Chính sách hoàn cọc tiếng Việt: hoàn 80% trước ký giấy.';
  const policy = { payload: { schema: 'homestaydorm.policy.v1', text }, salt: hash() };
  const handover = { payload: { schema: `homestaydorm.handover.v${version}`, agreementId, tenant, revision: 1,
    depositHeldVnd: '3000000', inventory: [], notes: '', attachments: [] }, salt: hash() };
  if (version === 2) {
    policy.payload.version = policyVersion(text);
    Object.assign(handover.payload, {
      policyVersion: policy.payload.version,
      contractTerms: { contractId: 'HD0001', rentVnd: '1500000', startDate: '2026-01-01', endDate: '2027-01-01', paymentCycle: 'Hàng tháng', depositVnd: '3000000' },
      signedContract: { name: 'hop-dong-HD0001-test.pdf', sha256: createHash('sha256').update('%PDF-test signed paper').digest('hex') },
    });
  }
  return { policy, handover };
}

test('C1: v2 binds every contract term, policy label and signed scan hash; v1 remains verifiable on the same unchanged contract', async () => {
  const c = await localChain();
  try {
    for (const version of [1, 2]) {
      const agreementId = hash(), docs = documents(agreementId, c.addresses[2], version);
      const bundle = createEvidence(c.deployment, 'handover', agreementId, docs);
      await writeConfirmed(c.client, c.wallets[0], c.deployment, 'proposeHandover', [agreementId, c.addresses[2], 3000000n,
        documentHash(docs.policy.payload, docs.policy.salt), documentHash(docs.handover.payload, docs.handover.salt)]);
      assert.equal((await verifyEvidence(c.client, c.deployment, bundle)).valid, true);
      if (version === 1) continue;
      for (const change of [
        p => { p.contractTerms.rentVnd = '1600000'; },
        p => { p.contractTerms.contractId = 'HD0002'; },
        p => { p.contractTerms.startDate = '2026-02-01'; },
        p => { p.contractTerms.endDate = '2028-01-01'; },
        p => { p.contractTerms.paymentCycle = 'Hàng quý'; },
        p => { p.contractTerms.depositVnd = '1'; },
        p => { p.policyVersion = 'ffffffff'; },
        p => { p.signedContract.sha256 = 'b'.repeat(64); },
      ]) {
        const altered = structuredClone(bundle); change(altered.documents.handover.payload);
        assert.equal((await verifyEvidence(c.client, c.deployment, altered)).valid, false);
      }
      const changedPolicy = structuredClone(bundle);
      changedPolicy.documents.policy.payload.text += ' changed';
      assert.equal((await verifyEvidence(c.client, c.deployment, changedPolicy)).valid, false);
    }
  } finally { await c.close(); }
});

test('C1: v2 rejects personal terms, file contents, invalid dates and missing metadata', () => {
  const { handover, policy } = documents(hash(), '0x' + '1'.repeat(40));
  assert.doesNotThrow(() => validateHandover(handover.payload, policy.payload));
  for (const edit of [
    p => { p.contractTerms.cccd = 'personal'; },
    p => { p.signedContract.dataBase64 = 'private'; },
    p => { p.signedContract.name = '../private.pdf'; },
    p => { p.contractTerms.startDate = '2026-02-30'; },
    p => { delete p.contractTerms; },
  ]) {
    const copy = structuredClone(handover.payload); edit(copy);
    assert.throws(() => validateHandover(copy, policy.payload));
  }
});
