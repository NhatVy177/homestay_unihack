import { randomBytes } from 'node:crypto';
import { getAddress, verifyMessage, zeroHash } from 'viem';
import { documentHash, createEvidence, validateStatement } from '@homestaydorm/settlement/evidence';
import { confirmationData } from '@homestaydorm/settlement/confirmation';
const hash = () => '0x' + randomBytes(32).toString('hex');
const fail = (message, statusCode = 400) => { throw Object.assign(new Error(message), { statusCode }); };
const clone = value => structuredClone(value);
const document = payload => ({ payload, salt: hash() });
export function publicCase(record) {
  const copy = clone(record);
  if (copy.pending) copy.pending = { hash: copy.pending.hash, event: copy.pending.event };
  return copy;
}
export class AvalancheService {
  constructor({ store, sources, chain, origin, clock = () => Date.now() }) {
    Object.assign(this, { store, sources, chain, origin, clock });
    this.tail = Promise.resolve();
  }
  // One worker per deployment: serializes operator nonces and case writes.
  exclusive(fn) {
    const next = this.tail.then(fn);
    this.tail = next.catch(() => {});
    return next;
  }
  staff(user, role) {
    if (user.vaiTro !== 'NhanVien' || user.chucVu !== role || !user.maChiNhanh) fail('Bạn không có quyền thực hiện thao tác này.', 403);
  }
  async accessible(user, id) {
    const c = await this.store.getCase(id);
    if (!c) fail('Không tìm thấy hồ sơ.', 404);
    if (user.vaiTro === 'KhachHang' ? user.maNguoiDung !== c.customerId :
      user.vaiTro !== 'NhanVien' || !['Quản lý', 'Kế toán'].includes(user.chucVu) || user.maChiNhanh !== c.branchId) fail('Hồ sơ không thuộc quyền truy cập của bạn.', 403);
    if (c.deployment.chainId !== this.chain.deployment.chainId || c.deployment.address.toLowerCase() !== this.chain.deployment.address.toLowerCase()) fail('Deployment đã đổi. Cần dùng cấu hình hồ sơ cũ để phục hồi.', 409);
    return c;
  }
  async list(user) {
    if (user.vaiTro !== 'KhachHang') this.staff(user, user.chucVu === 'Quản lý' ? 'Quản lý' : 'Kế toán');
    return (await this.store.listCases(user)).map(publicCase);
  }
  async challenge(user, address) {
    if (user.vaiTro !== 'KhachHang') fail('Chỉ khách thuê cần liên kết ví xác nhận.', 403);
    address = getAddress(address);
    const current = await this.store.getWallet(user.maNguoiDung);
    if (current && current.toLowerCase() !== address.toLowerCase()) fail('Tài khoản đã liên kết ví khác; không tự thay người ký hồ sơ cũ.', 409);
    const id = randomBytes(24).toString('hex');
    const expiresAt = new Date(this.clock() + 5 * 60000).toISOString();
    const message = ['HomeStayDorm — Liên kết ví xác nhận', this.origin,
      'Tài khoản: ' + user.maNguoiDung, 'Ví: ' + address, 'Nonce: ' + id,
      'Hết hạn: ' + expiresAt, 'Chỉ liên kết ví, không chuyển tiền.'].join('\n');
    await this.store.challenge({ id, userId: user.maNguoiDung, address, message, expiresAt });
    return { id, message, expiresAt };
  }
  async link(user, id, signature) {
    const c = await this.store.getChallenge(id);
    if (!c || c.used || c.userId !== user.maNguoiDung || new Date(c.expiresAt).getTime() <= this.clock()) fail('Yêu cầu liên kết đã hết hạn hoặc đã dùng.');
    if (!await verifyMessage({ address: c.address, message: c.message, signature })) fail('Chữ ký liên kết không đúng.');
    await this.store.link(c);
    return { address: c.address };
  }
  async create(user, input) {
    return this.exclusive(async () => {
      this.staff(user, 'Quản lý');
      const source = await this.sources.handover(input.sourceId);
      if (!source || source.branchId !== user.maChiNhanh) fail('Không tìm thấy biên bản trong chi nhánh.', 404);
      const tenant = await this.store.getWallet(source.customerId);
      if (!tenant) fail('Khách cần thiết lập xác nhận trong tài khoản trước.');
      if (input.depositConfirmed !== true || !/^(0|[1-9][0-9]*)$/.test(input.depositHeldVnd || '') || BigInt(input.depositHeldVnd) > BigInt(Number.MAX_SAFE_INTEGER)) fail('Cần xác nhận cọc thực tế còn giữ (VND nguyên).');
      const policy = String(input.policy || '').trim();
      if (!policy || policy.length > 8000) fail('Cần nội dung chính sách đầu kỳ, tối đa 8000 ký tự.');
      const attachments = validateAttachments(input.attachments || []);
      const id = hash();
      const docs = {
        policy: document({ schema: 'homestaydorm.policy.v1', text: policy }),
        handover: document({
          schema: 'homestaydorm.handover.v1', agreementId: id, tenant,
          depositHeldVnd: input.depositHeldVnd, inventory: source.inventory, notes: source.notes || '', attachments,
        }),
      };
      let c = await this.store.saveCase({
        id, contractId: source.contractId, customerId: source.customerId, branchId: source.branchId,
        sourceId: input.sourceId, depositHeldVnd: input.depositHeldVnd, tenant,
        deployment: this.chain.deployment, handover: createEvidence(this.chain.deployment, 'handover', id, docs),
        versions: [], state: 'draft', receipts: [],
      });
      return publicCase(await this.publishHandover(c));
    });
  }
  async publishHandover(c) {
    const docs = c.handover.documents;
    return this.submit(c, 'manager', 'proposeHandover', [
      c.id, c.tenant, BigInt(c.depositHeldVnd), documentHash(docs.policy.payload, docs.policy.salt),
      documentHash(docs.handover.payload, docs.handover.salt),
    ], 'HandoverProposed', { agreementId: c.id, tenant: c.tenant }, { type: 'handover' });
  }
  async propose(user, id, sourceId) {
    return this.exclusive(async () => {
      this.staff(user, 'Kế toán');
      let c = await this.accessible(user, id);
      c = await this.syncRecord(c);
      const a = await this.chain.read('getAgreement', [id]);
      if (![2, 4].includes(a.status)) fail('Cần bàn giao đã xác nhận hoặc đối soát bị phản đối.', 409);
      const version = a.latestVersion + 1;
      const payload = await this.sources.statement(sourceId, c, version);
      if (!payload) fail('Đối soát không thuộc hợp đồng này.', 404);
      validateStatement(payload);
      const bundle = createEvidence(c.deployment, 'settlement', id, { statement: document(payload) }, version);
      return publicCase(await this.submit(c, 'accountant', 'proposeSettlement',
        [id, BigInt(payload.deductionsVnd), documentHash(payload, bundle.documents.statement.salt)],
        'SettlementProposed', { agreementId: id, version }, { type: 'settlement', bundle, sourceId }));
    });
  }
  async prepare(user, id, action, reason) {
    let c = await this.accessible(user, id);
    if (user.vaiTro !== 'KhachHang' || user.maNguoiDung !== c.customerId) fail('Chỉ khách của hồ sơ được ký.', 403);
    if (c.pending) fail('Giao dịch trước đang chờ đồng bộ.', 409);
    const a = await this.chain.read('getAgreement', [id]);
    const version = action === 1 ? 0 : a.latestVersion;
    if (action === 1 ? a.status !== 1 : ![2, 3].includes(action) || a.status !== 3) fail('Hành động không phù hợp trạng thái.', 409);
    const bundle = action === 1 ? c.handover : c.versions.find(v => v.bundle.version === version)?.bundle;
    if (!bundle) fail('Thiếu snapshot bằng chứng.', 409);
    const commitment = action === 1 ? a.handoverCommitment : (await this.chain.read('getSettlement', [id, version])).commitment;
    let dispute;
    if (action === 3) {
      if (!String(reason || '').trim() || String(reason).length > 2000) fail('Cần lý do phản đối (tối đa 2000 ký tự).');
      dispute = document({ reason: String(reason).trim() });
    }
    return {
      bundle, dispute, typedData: confirmationData(c.deployment, {
        action, agreementId: id, version, commitment,
        reasonHash: dispute ? documentHash(dispute.payload, dispute.salt) : zeroHash,
        nonce: (await this.chain.read('nonces', [c.tenant])).toString(),
        deadline: String(Math.floor(this.clock() / 1000) + 600),
      }),
    };
  }
  async confirm(user, id, request) {
    return this.exclusive(async () => {
      const c = await this.accessible(user, id);
      if (user.vaiTro !== 'KhachHang' || c.customerId !== user.maNguoiDung) fail('Chỉ khách của hồ sơ được xác nhận.', 403);
      if (c.pending) fail('Đang có giao dịch chờ. Hãy đồng bộ lại.', 409);
      const m = request.message;
      if (!m || m.agreementId !== id || ![1, 2, 3].includes(m.action)) fail('Dữ liệu xác nhận không hợp lệ.');
      if (request.savedCopy !== true) fail('Hãy lưu và xác nhận đã giữ bản sao trước khi ký.');
      if (m.action === 3 && documentHash(request.dispute?.payload, request.dispute?.salt) !== m.reasonHash) fail('Lý do phản đối không khớp chữ ký.');
      const typed = confirmationData(c.deployment, m);
      if (!await this.chain.publicClient.verifyTypedData({ address: c.tenant, ...typed, signature: request.signature })) fail('Chữ ký không thuộc khách của hồ sơ.');
      const names = { 1: 'HandoverAccepted', 2: 'SettlementAccepted', 3: 'SettlementDisputed' };
      const eventArgs = { agreementId: id, ...(m.action === 1 ? { tenant: c.tenant, commitment: m.commitment } :
        { version: m.version, ...(m.action === 2 ? { commitment: m.commitment } : { reasonHash: m.reasonHash }) }) };
      return publicCase(await this.submit(c, 'relayer', 'confirm', [m, request.signature], names[m.action], eventArgs,
        { type: 'confirmation', action: m.action, version: m.version, dispute: request.dispute || null }));
    });
  }
  async submit(c, role, name, args, event, eventArgs, effect) {
    if (c.pending) fail('Hồ sơ đang có giao dịch chờ.', 409);
    const pending = { ...await this.chain.prepare(role, name, args, event, eventArgs), effect };
    if (await this.store.pendingForSigner(pending.signer)) fail('Ví vận hành còn giao dịch chờ ở hồ sơ khác. Cần đồng bộ hồ sơ đó trước khi gửi tiếp.', 409);
    // Durable signed bytes and expected effect BEFORE broadcast; SQL failure after receipt is recoverable.
    c = await this.store.saveCase({ ...c, pending }, c.revision);
    return this.syncRecord(c);
  }
  async sync(user, id) {
    return this.exclusive(async () => {
      let c = await this.accessible(user, id);
      if (c.state === 'draft' && !c.pending) { this.staff(user, 'Quản lý'); c = await this.publishHandover(c); }
      else c = await this.syncRecord(c);
      return publicCase(c);
    });
  }
  async syncRecord(c) {
    if (!c.pending) return c;
    const receipt = await this.chain.settle(c.pending);
    if (receipt.failed) {
      await this.store.saveCase({ ...c, pending: null, failedTransaction: receipt.hash }, c.revision);
      fail('Giao dịch bị từ chối trên chain. Snapshot được giữ; tải lại trước khi gửi lại.', 409);
    }
    const e = c.pending.effect;
    if (e.type === 'handover') { c.handover.receipt = receipt; c.state = 'handover-pending'; }
    if (e.type === 'settlement') { c.versions.push({ sourceId: e.sourceId, bundle: { ...e.bundle, receipt }, accepted: false }); c.state = 'settlement-pending'; }
    if (e.type === 'confirmation') {
      if (e.action === 1) { c.handover.confirmationReceipt = receipt; c.state = 'active'; }
      else {
        const v = c.versions.find(v => v.bundle.version === e.version);
        if (!v) fail('Thiếu snapshot tương ứng sự kiện.', 409);
        if (e.action === 2) { v.accepted = true; v.bundle.confirmationReceipt = receipt; c.state = 'accepted'; }
        else { v.dispute = e.dispute; v.disputeReceipt = receipt; c.state = 'disputed'; }
      }
    }
    c.receipts.push({ ...receipt, event: c.pending.event });
    return this.store.saveCase({ ...c, pending: null }, c.revision);
  }
}
export function validateAttachments(items) {
  if (!Array.isArray(items) || items.length > 10) fail('Tối đa 10 file đính kèm.');
  let size = 0;
  return items.map(item => {
    if (!item || typeof item.name !== 'string' || item.name.length > 200 || typeof item.dataBase64 !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(item.dataBase64)) fail('File đính kèm không hợp lệ.');
    const content = Buffer.from(item.dataBase64, 'base64');
    size += content.length;
    if (!content.length || size > 4 * 1024 * 1024) fail('Tổng file đính kèm tối đa 4 MB.');
    return { name: item.name, mediaType: String(item.mediaType || 'application/octet-stream').slice(0, 100), dataBase64: content.toString('base64') };
  });
}
