import { randomBytes } from 'node:crypto';
import { getAddress, verifyMessage, zeroHash } from 'viem';
import { documentHash, createEvidence, validateStatement, validateHandover, policyVersion } from '@homestaydorm/settlement/evidence';
import { confirmationData } from '@homestaydorm/settlement/confirmation';
const hash = () => '0x' + randomBytes(32).toString('hex');
const fail = (message, statusCode = 400) => { throw Object.assign(new Error(message), { statusCode }); };
const clone = value => structuredClone(value);
const document = payload => ({ payload, salt: hash() });
const text = (value, max, label) => {
  const s = String(value ?? '').trim();
  if (s.length > max) fail(`${label} tối đa ${max} ký tự.`);
  return s;
};
export function publicCase(record) {
  const copy = clone(record);
  if (copy.pending) copy.pending = { hash: copy.pending.hash, event: copy.pending.event };
  return copy;
}
export const currentDraft = c => c.drafts[c.drafts.length - 1];
/**
 * D-010: the handover is reviewed and revised in Web2 (drafts kept in SQL); only the revision the
 * tenant confirms is proposed on-chain, immediately before the tenant signs it.
 * D-012: emails only notify; they never change state or stand in for the tenant's signature.
 */
export class AvalancheService {
  constructor({ store, sources, chain, origin, notify = async () => ({ status: 'skipped' }), clock = () => Date.now(), isClosed=async()=>false, afterConfirmed=async()=>{} }) {
    Object.assign(this, { store, sources, chain, origin, notify, clock, isClosed, afterConfirmed });
    this.tail = Promise.resolve();
  }
  // One worker per deployment: serializes operator nonces and case writes.
  exclusive(fn) {
    const next = this.tail.then(fn);
    this.tail = next.catch(() => {});
    return next;
  }
  now() { return new Date(this.clock()).toISOString(); }
  async assertOpen(c) {if(await this.isClosed(c.contractId))fail('Hồ sơ đã đóng; không được phát hành hoặc xác nhận thêm.',409);}
  async finishLifecycle(c) {
    try {await this.afterConfirmed(c);return c;}
    catch {return {...c,lifecycleWarning:'Xác nhận đã được ghi nhận; phần xử lý kết thúc chưa đồng bộ. Vui lòng đồng bộ lại hồ sơ.'};}
  }
  staff(user, role) {
    if (user.vaiTro !== 'NhanVien' || user.chucVu !== role || !user.maChiNhanh) fail('Bạn không có quyền thực hiện thao tác này.', 403);
  }
  owner(user, c) {
    if (user.vaiTro !== 'KhachHang' || user.maNguoiDung !== c.customerId) fail('Chỉ khách thuê của hợp đồng được thực hiện thao tác này.', 403);
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
  async unpublished(user) {
    this.staff(user, 'Quản lý');
    return this.sources.unpublishedHandovers ? this.sources.unpublishedHandovers(user.maChiNhanh) : [];
  }
  /** Called automatically after the manager records the Web2 handover (and manually for older records). */
  async publish(user, sourceId, input = {}) {
    return this.exclusive(async () => {
      this.staff(user, 'Quản lý');
      const source = await this.sources.handover(sourceId, user);
      if (!source || source.branchId !== user.maChiNhanh) fail('Không tìm thấy biên bản trong chi nhánh.', 404);
      if (!/^(0|[1-9][0-9]*)$/.test(source.depositVnd || '') || BigInt(source.depositVnd) > BigInt(Number.MAX_SAFE_INTEGER)) fail('Chưa xác định được tiền cọc của hợp đồng trong hệ thống.', 409);
      if (!String(source.policy || '').trim()) fail('Chưa có chính sách hoàn cọc trong hệ thống.', 409);
      const id = hash();
      let c;
      try {
        c = await this.store.saveCase({
          id, contractId: source.contractId, customerId: source.customerId, branchId: source.branchId,
          sourceId, depositHeldVnd: source.depositVnd, deployment: this.chain.deployment,
          drafts: [this.draft(id, 1, source.depositVnd, source.policy, {
            inventory: source.inventory, notes: source.notes || '', attachments: validateAttachments(input.attachments || []),
            contractTerms: source.contractTerms, signedContract: source.signedContract, policyVersion: source.policyVersion,
          }, user)],
          handover: null, tenant: null, state: 'review', versions: [], receipts: [], notifications: [],
        });
      } catch (error) {
        if (/duplicate|unique/i.test(error.message)) fail('Hợp đồng này đã có hồ sơ xác nhận.', 409);
        throw error;
      }
      c = await this.notified(c, 'handover-published');
      return publicCase(c);
    });
  }
  draft(id, revision, depositHeldVnd, policyText, content, user) {
    const policy = { schema: 'homestaydorm.policy.v1', text: policyText, version: policyVersion(policyText) };
    const payload = { schema: 'homestaydorm.handover.v2', agreementId: id, revision, depositHeldVnd, ...content };
    try { validateHandover(payload, policy); }
    catch { fail('Chưa đủ điều khoản, chính sách hoặc ảnh hợp đồng hợp lệ để phát hành bàn giao v2.', 409); }
    return {
      revision, publishedAt: this.now(), publishedBy: user.maNguoiDung, changeRequest: null, resolution: null,
      policy: document(policy),
      handover: document(payload),
    };
  }
  async requestChange(user, id, reason) {
    return this.exclusive(async () => {
      const c = await this.accessible(user, id);
      await this.assertOpen(c);
      this.owner(user, c);
      if (c.state !== 'review') fail('Biên bản không còn ở bước chờ bạn xem.', 409);
      reason = text(reason, 2000, 'Nội dung cần chỉnh sửa');
      if (!reason) fail('Hãy ghi rõ nội dung cần chỉnh sửa.');
      currentDraft(c).changeRequest = { reason, at: this.now() };
      return publicCase(await this.store.saveCase({ ...c, state: 'change-requested' }, c.revision));
    });
  }
  async revise(user, id, input = {}) {
    return this.exclusive(async () => {
      this.staff(user, 'Quản lý');
      let c = await this.accessible(user, id);
      await this.assertOpen(c);
      if (!['review', 'change-requested'].includes(c.state) || c.pending || c.handover) fail('Biên bản đã được khách xác nhận hoặc đang ghi nhận; không sửa được.', 409);
      const previous = currentDraft(c), payload = previous.handover.payload;
      // Upgrade an unbound v1 review only after D-034 prerequisites are met; never rewrite locked v1 evidence.
      const source = await this.sources.handover(c.sourceId, user);
      if (!source || source.contractId !== c.contractId || source.branchId !== c.branchId || source.customerId !== c.customerId
        || source.depositVnd !== c.depositHeldVnd) fail('Nguồn hợp đồng đã thay đổi, cần kiểm tra trước khi phát hành.', 409);
      const resolution = text(input.resolution, 1000, 'Nội dung đã điều chỉnh');
      if (!resolution) fail('Hãy ghi lại nội dung đã điều chỉnh để khách xem.');
      const inventory = input.inventory === undefined ? payload.inventory : validateInventory(input.inventory);
      const notes = input.notes === undefined ? payload.notes : text(input.notes, 2000, 'Ghi chú chung');
      const attachments = input.attachments === undefined ? payload.attachments : validateAttachments(input.attachments);
      const next = this.draft(c.id, previous.revision + 1, c.depositHeldVnd, source.policy, {
        inventory, notes, attachments, contractTerms: source.contractTerms,
        signedContract: source.signedContract, policyVersion: source.policyVersion,
      }, user);
      next.resolution = resolution;
      c = await this.store.saveCase({ ...c, drafts: [...c.drafts, next], state: 'review' }, c.revision);
      return publicCase(await this.notified(c, 'handover-revised'));
    });
  }
  async remind(user, id) {
    this.staff(user, 'Quản lý');
    const c = await this.accessible(user, id);
    if (!['review', 'handover-pending', 'settlement-pending'].includes(c.state)) fail('Hồ sơ không ở bước chờ khách xác nhận.', 409);
    return publicCase(await this.exclusive(async () => this.notified(await this.store.getCase(id), 'reminder')));
  }
  async notified(c, kind) {
    let result;
    try { result = await this.notify(kind, c); } catch (error) { result = { status: 'failed', error: String(error.message || error).slice(0, 200) }; }
    const entry = { kind, at: this.now(), status: result?.status || 'skipped' };
    try { return await this.store.saveCase({ ...c, notifications: [...(c.notifications || []), entry] }, c.revision); }
    catch { return c; }
  }
  async statements(user, id) {
    this.staff(user, 'Kế toán');
    const c = await this.accessible(user, id);
    const used = new Set(c.versions.map(v => v.sourceId));
    return (await this.sources.statements(c.contractId)).map(s => ({ ...s, published: used.has(s.sourceId) }));
  }
  async propose(user, id, sourceId) {
    return this.exclusive(async () => {
      this.staff(user, 'Kế toán');
      let c = await this.accessible(user, id);
      await this.assertOpen(c);
      c = await this.syncRecord(c);
      const a = await this.chain.read('getAgreement', [id]);
      if (![2, 4].includes(a.status)) fail('Cần bàn giao đã xác nhận hoặc đối soát bị phản đối.', 409);
      const version = a.latestVersion + 1;
      const payload = await this.sources.statement(sourceId, c, version);
      if (!payload) fail('Đối soát không thuộc hợp đồng này.', 404);
      validateStatement(payload);
      const bundle = createEvidence(c.deployment, 'settlement', id, { statement: document(payload) }, version);
      c = await this.submit(c, 'accountant', 'proposeSettlement',
        [id, BigInt(payload.deductionsVnd), documentHash(payload, bundle.documents.statement.salt)],
        'SettlementProposed', { agreementId: id, version }, { type: 'settlement', bundle, sourceId });
      return publicCase(await this.notified(c, 'settlement-published'));
    });
  }
  /** Proposes the reviewed revision on-chain (operator pays gas), then returns typed data for the tenant. */
  async proposeReviewed(c, revision) {
    const draft = currentDraft(c);
    if (draft.handover.payload.schema !== 'homestaydorm.handover.v2') fail('Hồ sơ cũ cần được quản lý bổ sung và phát hành bàn giao v2 trước khi xác nhận.', 409);
    if (revision !== undefined && Number(revision) !== draft.revision) fail('Biên bản vừa được cập nhật. Hãy xem lại bản mới nhất.', 409);
    const tenant = await this.store.getWallet(c.customerId);
    if (!tenant) fail('Tài khoản đang được thiết lập xác nhận. Vui lòng thử lại sau giây lát.', 409);
    const handover = { payload: { ...draft.handover.payload, tenant }, salt: draft.handover.salt };
    const bundle = createEvidence(c.deployment, 'handover', c.id, { policy: draft.policy, handover }, undefined);
    c = { ...c, tenant, handover: { ...bundle, revision: draft.revision } };
    return this.submit(c, 'manager', 'proposeHandover', [
      c.id, tenant, BigInt(c.depositHeldVnd), documentHash(draft.policy.payload, draft.policy.salt), documentHash(handover.payload, handover.salt),
    ], 'HandoverProposed', { agreementId: c.id, tenant }, { type: 'handover' });
  }
  async prepare(user, id, action, reason, revision) {
    return this.exclusive(async () => {
      let c = await this.accessible(user, id);
      await this.assertOpen(c);
      this.owner(user, c);
      if (c.pending) c = await this.syncRecord(c);
      if (action === 1 && c.state === 'change-requested') fail('Bạn đã yêu cầu chỉnh sửa. Vui lòng chờ quản lý phát hành bản mới.', 409);
      if (action === 1 && c.state === 'review') c = await this.proposeReviewed(c, revision);
      if (action === 1 && revision !== undefined && Number(revision) !== c.handover?.revision) fail('Biên bản vừa được cập nhật. Hãy xem lại bản mới nhất.', 409);
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
    });
  }
  async confirm(user, id, request) {
    return this.exclusive(async () => {
      let c = await this.accessible(user, id);
      await this.assertOpen(c);
      this.owner(user, c);
      if (c.pending) fail('Đang có giao dịch chờ. Hãy đồng bộ lại.', 409);
      const m = request.message;
      if (!m || m.agreementId !== id || ![1, 2, 3].includes(m.action)) fail('Dữ liệu xác nhận không hợp lệ.');
      if (m.action === 3 && documentHash(request.dispute?.payload, request.dispute?.salt) !== m.reasonHash) fail('Lý do phản đối không khớp chữ ký.');
      const typed = confirmationData(c.deployment, m);
      if (!await this.chain.publicClient.verifyTypedData({ address: c.tenant, ...typed, signature: request.signature })) fail('Chữ ký không thuộc khách của hồ sơ.');
      const names = { 1: 'HandoverAccepted', 2: 'SettlementAccepted', 3: 'SettlementDisputed' };
      const eventArgs = { agreementId: id, ...(m.action === 1 ? { tenant: c.tenant, commitment: m.commitment } :
        { version: m.version, ...(m.action === 2 ? { commitment: m.commitment } : { reasonHash: m.reasonHash }) }) };
      c = await this.submit(c, 'relayer', 'confirm', [m, request.signature], names[m.action], eventArgs,
        { type: 'confirmation', action: m.action, version: m.version, dispute: request.dispute || null });
      c=await this.notified(c, { 1: 'handover-confirmed', 2: 'settlement-confirmed', 3: 'settlement-disputed' }[m.action]);
      return publicCase(await this.finishLifecycle(c));
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
    return this.exclusive(async () => publicCase(await this.finishLifecycle(await this.syncRecord(await this.accessible(user, id)))));
  }
  async syncRecord(c) {
    if (!c.pending) return c;
    const receipt = await this.chain.settle(c.pending);
    if (receipt.failed) {
      const reset = c.pending.effect.type === 'handover' ? { handover: null, tenant: null } : {};
      await this.store.saveCase({ ...c, ...reset, pending: null, failedTransaction: receipt.hash }, c.revision);
      fail('Giao dịch bị từ chối trên chain. Snapshot được giữ; tải lại trước khi gửi lại.', 409);
    }
    const recordedReceipt = { ...receipt, at: this.now() };
    const e = c.pending.effect;
    if (e.type === 'handover') { c.handover.receipt = recordedReceipt; c.state = 'handover-pending'; }
    if (e.type === 'settlement') { c.versions.push({ sourceId: e.sourceId, bundle: { ...e.bundle, receipt: recordedReceipt }, accepted: false }); c.state = 'settlement-pending'; }
    if (e.type === 'confirmation') {
      if (e.action === 1) { c.handover.confirmationReceipt = recordedReceipt; c.state = 'active'; }
      else {
        const v = c.versions.find(v => v.bundle.version === e.version);
        if (!v) fail('Thiếu snapshot tương ứng sự kiện.', 409);
        if (e.action === 2) { v.accepted = true; v.bundle.confirmationReceipt = recordedReceipt; c.state = 'accepted'; }
        else { v.dispute = e.dispute; v.disputeReceipt = recordedReceipt; c.state = 'disputed'; }
      }
    }
    c.receipts.push({ ...recordedReceipt, event: c.pending.event });
    return this.store.saveCase({ ...c, pending: null }, c.revision);
  }
}
export function validateInventory(items) {
  if (!Array.isArray(items) || !items.length || items.length > 100) fail('Danh sách tài sản không hợp lệ.');
  return items.map(item => {
    const quantity = Number(item?.quantity);
    if (!item || typeof item.item !== 'string' || !item.item.trim() || item.item.length > 200 || !Number.isSafeInteger(quantity) || quantity < 0) fail('Dòng tài sản không hợp lệ.');
    return { item: item.item.trim(), quantity, condition: text(item.condition, 500, 'Tình trạng tài sản') || 'Không có ghi chú' };
  });
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
