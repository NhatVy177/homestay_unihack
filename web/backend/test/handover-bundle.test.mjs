import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { ContractEvidence, fileExtension } from '../integrations/avalanche/contractEvidence.js';
import { policyVersion } from '@homestaydorm/settlement/evidence';
import { createDepositNotifier } from '../integrations/mail/datCocNotifications.js';
import express from 'express';
import { signedUpload } from '../controllers/contractEvidence.controller.js';

const tenant = { vaiTro: 'KhachHang', maNguoiDung: 'KH0001' };
const sale = { vaiTro: 'NhanVien', chucVu: 'Sale', maNguoiDung: 'NV0001', maChiNhanh: 'CN0001' };
const contract = { contractId: 'HD0001', depositId: 'DC0001', customerId: 'KH0001', branchId: 'CN0001',
  rentVnd: 1500000, depositVnd: 3000000, startDate: '2026-11-01', endDate: '2027-11-01', paymentCycle: 'Hàng tháng',
  hoTen: 'PERSONAL-NAME-MUST-NOT-LEAK', cccd: 'PERSONAL-ID-MUST-NOT-LEAK', phone: 'PERSONAL-PHONE-MUST-NOT-LEAK' };
class Repository {
  policy = null; fileData = null; case = null; version = 80;
  async slip(id) { return id === 'DC0001' ? contract : null; }
  async contract(id) { return id === 'HD0001' ? contract : null; }
  async rules() { return [{ TenQuyDinh: 'Đã cọc, chưa ký', TyLeHoanCoc: this.version }]; }
  async saved() { return this.policy && structuredClone(this.policy); }
  async snapshot(id, text, version) {
    this.policy ||= { text, version, requiresConfirmation: true, confirmedAt: null };
    return structuredClone(this.policy);
  }
  async confirm(id, version, userId) { this.policy.confirmedAt = '2026-11-11T00:00:00.000Z'; this.confirmedBy = userId; }
  async file() { return this.fileData; }
  async saveFile(id, file) { this.fileData = file; }
  async caseForContract() { return this.case; }
}

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'homestaydorm-contract-'));
  t.after(async () => {
    assert.ok(dirname(resolve(directory)) === resolve(tmpdir()) && directory.includes('homestaydorm-contract-'));
    await rm(directory, { recursive: true, force: true });
  });
  const repository = new Repository();
  return { directory, repository, service: new ContractEvidence({ repository, directory }) };
}
const pdf = () => ({ mimetype: 'application/pdf', buffer: Buffer.from('%PDF-1.7\nSynthetic signed test document\n%%EOF') });

test('C1: policy label is SHA-256 UTF-8; immutable legacy policy needs its owner acknowledgment', async t => {
  const { service, repository } = await fixture(t);
  const policy = await service.policy(tenant, 'DC0001');
  assert.equal(policy.version, createHash('sha256').update(policy.text, 'utf8').digest('hex').slice(0, 8));
  assert.equal(policy.ready, false);
  repository.version = 50;
  assert.equal((await service.policy(tenant, 'DC0001')).text, policy.text, 'later admin edits must not replace a deposit policy');
  await assert.rejects(service.policy({ ...tenant, maNguoiDung: 'KH9999' }, 'DC0001'), e => e.statusCode === 403);
  await assert.rejects(service.confirm(sale, 'DC0001', policy.version), e => e.statusCode === 403);
  await assert.rejects(service.confirm(tenant, 'DC0001', '00000000'), /đã đổi/);
  assert.equal((await service.confirm(tenant, 'DC0001', policy.version)).ready, true);
  assert.equal(repository.confirmedBy, tenant.maNguoiDung);
  assert.equal(policyVersion(policy.text), policy.version);
});

test('C1: source is blocked without legacy acknowledgment or signed scan; authorized upload yields only nonpersonal terms/hash', async t => {
  const { service, repository, directory } = await fixture(t);
  await assert.rejects(service.source('HD0001'), /xác nhận chính sách/);
  const policy = await service.policy(tenant, 'DC0001');
  await service.confirm(tenant, 'DC0001', policy.version);
  await assert.rejects(service.source('HD0001'), /tải ảnh hợp đồng/);
  await assert.rejects(service.upload(tenant, 'HD0001', pdf()), e => e.statusCode === 403);
  await assert.rejects(service.upload({ ...sale, maChiNhanh: 'CN9999' }, 'HD0001', pdf()), e => e.statusCode === 403);
  const file = await service.upload(sale, 'HD0001', pdf());
  assert.equal(file.sha256, createHash('sha256').update(pdf().buffer).digest('hex'));
  assert.ok((await readFile(join(directory, file.name))).equals(pdf().buffer));
  const source = await service.source('HD0001');
  assert.equal(source.contractTerms.depositVnd, '3000000', 'D-034: keep slip deposit without partial-refund adjustment');
  assert.deepEqual(Object.keys(source.contractTerms).sort(), ['contractId', 'depositVnd', 'endDate', 'paymentCycle', 'rentVnd', 'startDate']);
  assert.deepEqual(Object.keys(source.signedContract).sort(), ['name', 'sha256']);
  assert.equal(/PERSONAL-|base64|buffer|uploads/.test(JSON.stringify(source)), false);
  repository.case = { drafts: [{ handover: { payload: { schema: 'homestaydorm.handover.v2' } } }] };
  await assert.rejects(service.upload(sale, 'HD0001', pdf()), /đã phát hành/);
  await writeFile(join(directory, file.name), Buffer.from('altered'));
  await assert.rejects(service.source('HD0001'), /đã thay đổi/);
});

test('C1: a new slip keeps its displayed policy even after the current rules are removed', async t => {
  const { service, repository } = await fixture(t);
  const text = 'Chính sách đã hiển thị trên phiếu mới.';
  repository.policy = { text, version: policyVersion(text), requiresConfirmation: false, confirmedAt: null };
  repository.rules = async () => { throw new Error('Current rules should not be reloaded for an immutable snapshot'); };
  const policy = await service.policy(tenant, 'DC0001');
  assert.equal(policy.text, text);
  assert.equal(policy.ready, true);
  assert.equal(policy.requiresConfirmation, false);
});

test('C1: signed scan accepts actual image/PDF headers and rejects path traversal/spoofed/oversized files', async t => {
  const { service, repository } = await fixture(t);
  assert.equal(fileExtension(pdf()), 'pdf');
  assert.equal(fileExtension({ mimetype: 'image/png', buffer: Buffer.from('89504e470d0a1a0a', 'hex') }), 'png');
  assert.throws(() => fileExtension({ mimetype: 'application/pdf', buffer: Buffer.from('<script>') }), /đúng định dạng/);
  assert.throws(() => fileExtension({ mimetype: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) }), /5 MB/);
  repository.fileData = { name: '../outside.pdf', sha256: 'a'.repeat(64) };
  await assert.rejects(service.read('HD0001'), /Tên file/);
  repository.case = { handover: { documents: {} } };
  await assert.rejects(service.upload(sale, 'HD0001', pdf()), /đã phát hành/);
});

test('C1: issued and paid deposit mail contains the exact saved policy/version and legacy supplemental notice', async () => {
  const sent = [];
  const text = 'Chính sách đã lưu, không lấy bản quy định mới.';
  const notify = createDepositNotifier({
    load: async () => ({ maPhieuDatCoc: 'DC0001', emailKhach: 'synthetic@example.invalid',
      policyInfo: { text, version: policyVersion(text), requiresConfirmation: true } }),
    reserve: async () => true, mark: async () => {}, mailer: { send: async mail => { sent.push(mail); return { status: 'sent' }; } },
  });
  for (const kind of ['issued', 'paid']) await notify(kind, 'DC0001');
  assert.equal(sent.length, 2);
  for (const mail of sent) { assert.ok(mail.text.includes(text)); assert.ok(mail.text.includes(policyVersion(text))); assert.match(mail.text, /bổ sung cho hồ sơ cũ/); }
  assert.ok(sent[0].html.includes(text));
});

test('C1: multipart parser accepts the file field and refuses non-Sale or oversized uploads before storage', async () => {
  // Isolated parser fixture: never mounts a real DB route or starts backend schedulers.
  const app = express();
  app.use((req, res, next) => { req.user = req.headers['x-test-customer'] ? tenant : sale; next(); });
  app.post('/upload', signedUpload, (req, res) => res.json({ size: req.file?.buffer.length }));
  app.use((error, req, res, next) => res.status(error.statusCode || 500).json({ message: error.message }));
  const server = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
  try {
    const url = `http://127.0.0.1:${server.address().port}/upload`;
    const form = () => { const body = new FormData(); body.append('file', new Blob([pdf().buffer], { type: 'application/pdf' }), 'test.pdf'); return body; };
    const valid = await fetch(url, { method: 'POST', body: form() });
    assert.equal(valid.status, 200); assert.equal((await valid.json()).size, pdf().buffer.length);
    assert.equal((await fetch(url, { method: 'POST', body: form(), headers: { 'x-test-customer': 'true' } })).status, 403);
    const large = new FormData(); large.append('file', new Blob([Buffer.alloc(5 * 1024 * 1024 + 1)]), 'large.pdf');
    assert.equal((await fetch(url, { method: 'POST', body: large })).status, 400);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
