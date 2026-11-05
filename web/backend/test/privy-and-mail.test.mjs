import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generateKeyPairSync, createPublicKey, verify } from 'node:crypto';
import { createPrivyIssuer, loadPrivyKey } from '../integrations/avalanche/privy-jwt.js';
import { createMailer } from '../integrations/mail/mailer.js';
import { createNotifier } from '../integrations/avalanche/notifications.js';
const pem = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' });
const decode = part => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
describe('Privy JWT-based auth (D-011)', () => {
  it('issues short-lived RS256 tokens for tenants only, verifiable with the published JWKS', () => {
    const key = loadPrivyKey({ PRIVY_JWT_PRIVATE_KEY: pem.replace(/\n/g, '\\n') });
    const issuer = createPrivyIssuer({ key, appId: 'app-test', clock: () => 1_800_000_000_000 });
    const token = issuer.issue({ vaiTro: 'KhachHang', maNguoiDung: 'KH0001' });
    const [h, p, s] = token.split('.');
    assert.deepEqual(decode(h), { alg: 'RS256', typ: 'JWT', kid: key.kid });
    assert.deepEqual(decode(p), { sub: 'KH0001', iss: 'homestaydorm', aud: 'app-test', iat: 1_800_000_000, exp: 1_800_000_600 });
    const jwk = issuer.jwks().keys[0];
    assert.equal(jwk.kid, key.kid); assert.equal(jwk.d, undefined);
    assert.ok(verify('RSA-SHA256', Buffer.from(h + '.' + p), createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(s, 'base64url')));
    assert.throws(() => issuer.issue({ vaiTro: 'NhanVien', maNguoiDung: 'NV0001' }), /Chỉ khách thuê/);
    assert.throws(() => createPrivyIssuer({ key: null }).issue({ vaiTro: 'KhachHang', maNguoiDung: 'KH0001' }), /chưa được cấu hình/);
  });
});
describe('Email thông báo (D-009/D-012)', () => {
  it('redirects demo mail, never sends without a recipient, and attaches evidence only after confirmation', async () => {
    const sent = [];
    const transport = { async sendMail(m) { sent.push(m); return { messageId: 'x' }; } };
    const mailer = createMailer({ MAIL_REDIRECT_TO: 'demo@example.test' }, transport);
    const notify = createNotifier({ mailer, contact: async () => ({ name: 'An', email: 'seed@mail.com' }), origin: 'https://app.example/' });
    const c = { contractId: 'HD0001', drafts: [{}], versions: [], handover: { schema: 'homestaydorm.evidence.v1' } };
    assert.equal((await notify('handover-published', c)).status, 'sent');
    assert.equal(sent[0].to, 'demo@example.test');
    assert.match(sent[0].text, /https:\/\/app\.example\/khach-hang\?tab=hop-dong/);
    assert.match(sent[0].text, /không thay cho xác nhận/);
    assert.equal(sent[0].attachments.length, 0);
    await notify('handover-confirmed', c);
    assert.equal(sent[1].attachments[0].filename, 'ban-giao-HD0001.json');
    const silent = createNotifier({ mailer: createMailer({}, transport), contact: async () => null, origin: 'https://app.example' });
    assert.equal((await silent('reminder', c)).status, 'skipped');
    assert.equal(sent.length, 2);
  });
});
