import assert from 'node:assert/strict';
import { it } from 'node:test';
import { randomBytes } from 'node:crypto';
import { SqlStore } from '../../web/backend/integrations/avalanche/store.js';
import { getPool } from '../../web/backend/database/connection.js';
it('SQL Server persists wallet challenges and immutable case revisions with CAS', { skip: process.env.TEST_SQL !== 'true' }, async () => {
  const store = new SqlStore();
  const userId = 'Z' + randomBytes(3).toString('hex').slice(0, 5);
  const id = '0x' + randomBytes(32).toString('hex');
  const address = '0x' + randomBytes(20).toString('hex');
  const challengeId = randomBytes(24).toString('hex');
  const challenge = { id: challengeId, userId, address, message: 'Synthetic repository test', expiresAt: new Date(Date.now() + 60000).toISOString() };
  try {
    await store.challenge(challenge);
    assert.equal((await store.getChallenge(challengeId)).used, false);
    await store.link(challenge);
    assert.equal((await store.getWallet(userId)).toLowerCase(), address);
    await assert.rejects(store.link(challenge));
    const c = await store.saveCase({ id, contractId: userId, customerId: userId, branchId: userId, versions: [], state: 'draft' });
    assert.equal(c.revision, 0);
    const updated = await store.saveCase({ ...c, state: 'active', pending: { signer: address } }, 0);
    assert.equal(updated.revision, 1);
    assert.equal(await store.pendingForSigner(address), id);
    await assert.rejects(store.saveCase(c, 0));
    assert.equal((await store.getCase(id)).state, 'active');
    const list = await store.listCases({ vaiTro: 'KhachHang', maNguoiDung: userId });
    assert.equal(list.length, 1);
  } finally {
    // Exact synthetic keys only, no changes to existing Web2 tables.
    await store.query('DELETE dbo.AvalancheCase WHERE Id=@id', { id });
    await store.query('DELETE dbo.AvalancheChallenge WHERE Id=@id', { id: challengeId });
    await store.query('DELETE dbo.AvalancheWallet WHERE UserId=@userId AND Address=@address', { userId, address });
    await (await getPool()).close();
  }
});
