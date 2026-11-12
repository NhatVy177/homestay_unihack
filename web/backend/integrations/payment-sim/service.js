import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
// D-013: self-hosted e-wallet payment SIMULATOR. It follows the usual gateway pattern
// (create order → payment page → signed IPN → idempotent update) but no real provider is called
// and no money moves. The UI must always label it "mô phỏng".
const fail = (message, statusCode = 400) => { throw Object.assign(new Error(message), { statusCode }); };
const FIELDS = ['orderId', 'amountVnd', 'resultCode', 'transId', 'responseTime'];
export const ipnString = body => FIELDS.map(key => `${key}=${body[key]}`).join('&');
export class PaymentSimulator {
  constructor({ store, deposits, firstCharges, topUps, secret, clock = () => Date.now(), notifyDepositPaid = async () => {}, notifyFirstChargePaid = async () => {}, beforeTopUpPaid=async()=>{}, afterTopUpPaid=async()=>{} }) {
    if (!secret || secret.length < 16) throw new Error('PAYMENT_SIM_SECRET must be at least 16 characters.');
    Object.assign(this, { store, deposits, firstCharges, topUps, secret, clock, notifyDepositPaid, notifyFirstChargePaid, beforeTopUpPaid, afterTopUpPaid });
  }
  sign(body) { return createHmac('sha256', this.secret).update(ipnString(body)).digest('hex'); }
  verify(body) {
    const expected = Buffer.from(this.sign(body), 'hex');
    const actual = Buffer.from(String(body.signature || ''), 'hex');
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
  customer(user) { if (user?.vaiTro !== 'KhachHang') fail('Chỉ khách hàng thanh toán qua cổng này.', 403); }
  async owned(user, id) {
    this.customer(user);
    const order = await this.store.get(String(id || ''));
    if (!order || order.customerId !== user.maNguoiDung) fail('Không tìm thấy đơn thanh toán.', 404);
    return order;
  }
  async createDepositOrder(user, maPhieuCoc) {
    this.customer(user);
    const deposit = await this.deposits.get(String(maPhieuCoc || '').trim());
    if (!deposit || deposit.customerId !== user.maNguoiDung) fail('Không tìm thấy phiếu đặt cọc của bạn.', 404);
    if (deposit.status !== 'Chờ TT') fail('Phiếu đặt cọc không ở trạng thái chờ thanh toán.', 409);
    if (!deposit.accountantId) fail('Phiếu đặt cọc chưa được kế toán chốt, chưa thể thanh toán.', 409);
    if (deposit.expiresAt && new Date(deposit.expiresAt).getTime() < this.clock()) fail('Phiếu đặt cọc đã hết hạn thanh toán.', 409);
    if (!Number.isSafeInteger(deposit.amountVnd) || deposit.amountVnd <= 0) fail('Số tiền cọc không hợp lệ.', 409);
    const existing = await this.store.findPending('dat-coc', deposit.id, user.maNguoiDung);
    if (existing && existing.amountVnd === deposit.amountVnd) return existing;
    // J-035: không ghi phương thức lúc mở ví; khách đổi ý vẫn trả tiền mặt/chuyển khoản tay được.
    const order = { id: 'SIM' + randomBytes(12).toString('hex').toUpperCase(), purpose: 'dat-coc', refId: deposit.id,
      customerId: user.maNguoiDung, amountVnd: deposit.amountVnd, status: 'Pending' };
    await this.store.create(order);
    return order;
  }
  async firstChargeQuote(user, maHopDong) {
    this.customer(user);
    const id = String(maHopDong || '').trim();
    const contract = await this.firstCharges.get(id);
    if (!contract || contract.customerId !== user.maNguoiDung) fail('Không tìm thấy hợp đồng của bạn.', 404);
    const base = { purpose: 'thu-nhan-phong', refId: id };
    if (contract.status !== 'Hiệu lực') return { ...base, status: 'Unavailable' };
    if (contract.paid) return { ...base, status: 'Paid' };
    let amountVnd;
    try { amountVnd = await this.firstCharges.amount(id); }
    catch (error) {
      if ((await this.firstCharges.get(id))?.paid) return { ...base, status: 'Paid' };
      throw error;
    }
    if (!Number.isFinite(amountVnd) || amountVnd <= 0) return { ...base, status: 'Accounting' };
    if (Math.round(amountVnd * 100) / 100 !== amountVnd) fail('Số tiền kỳ đầu không hợp lệ, vui lòng liên hệ kế toán.', 409);
    return { ...base, status: 'Pending', amountVnd };
  }
  async createFirstChargeOrder(user, maHopDong) {
    const quote = await this.firstChargeQuote(user, maHopDong);
    if (quote.status === 'Paid') fail('Hóa đơn kỳ đầu đã được thanh toán.', 409);
    if (quote.status === 'Accounting') fail('Khoản thu kỳ đầu không cần thanh toán qua ví, vui lòng liên hệ kế toán.', 409);
    if (quote.status !== 'Pending') fail('Hợp đồng chưa ở trạng thái chờ thu kỳ đầu.', 409);
    const existing = await this.store.findPending(quote.purpose, quote.refId, user.maNguoiDung);
    if (existing && existing.amountVnd === quote.amountVnd) return existing;
    const order = { id: 'SIM' + randomBytes(12).toString('hex').toUpperCase(), ...quote,
      customerId: user.maNguoiDung };
    await this.store.create(order);
    return order;
  }
  // C3 / D-030 (3): the tenant pays the agreed settlement top-up. refId is the settlement (DoiSoat) id,
  // so the unique "one Paid order per purpose/refId" index blocks paying the same settlement twice.
  async topUpQuote(user, maHopDong) {
    this.customer(user);
    const id = String(maHopDong || '').trim();
    const row = this.topUps && await this.topUps.get(id);
    if (!row || row.customerId !== user.maNguoiDung) fail('Không tìm thấy hợp đồng của bạn.', 404);
    const base = { purpose: 'thu-them-doi-soat', refId: row.settlementId || null, contractId: id };
    if (row.status === 'Đã quyết toán' && row.amountVnd > 0) return { ...base, status: 'Paid', amountVnd: row.amountVnd };
    if (row.status !== 'Chờ thanh toán thêm' || row.returnStatus !== 'Chờ ký biên bản' || !(row.amountVnd > 0)) return { ...base, status: 'Unavailable' };
    if (Math.round(row.amountVnd * 100) / 100 !== row.amountVnd) fail('Số tiền thu thêm không hợp lệ, vui lòng liên hệ kế toán.', 409);
    return { ...base, status: 'Pending', amountVnd: row.amountVnd };
  }
  async createTopUpOrder(user, maHopDong) {
    const { contractId, ...quote } = await this.topUpQuote(user, maHopDong);
    if (quote.status === 'Paid') fail('Khoản thu thêm đã được thanh toán.', 409);
    if (quote.status !== 'Pending') fail('Đối soát chưa ở bước chờ thanh toán thêm.', 409);
    const existing = await this.store.findPending(quote.purpose, quote.refId, user.maNguoiDung);
    if (existing && existing.amountVnd === quote.amountVnd) return existing;
    const order = { id: 'SIM' + randomBytes(12).toString('hex').toUpperCase(), ...quote, customerId: user.maNguoiDung };
    await this.store.create(order);
    return order;
  }
  async getOrder(user, id) { return this.owned(user, id); }
  async cancel(user, id) {
    const order = await this.owned(user, id);
    if (order.status !== 'Pending') fail('Đơn thanh toán không còn ở trạng thái chờ.', 409);
    await this.store.transition(order.id, 'Pending', 'Cancelled');
    return this.store.get(order.id);
  }
  /** The simulated wallet app approved the payment: emit the gateway's signed IPN. */
  async pay(user, id) {
    const order = await this.owned(user, id);
    if (order.status === 'Paid') return order;
    if (order.status !== 'Pending') fail('Đơn thanh toán không còn ở trạng thái chờ.', 409);
    const body = { orderId: order.id, amountVnd: order.amountVnd, resultCode: 0,
      transId: 'SIMTX' + randomBytes(8).toString('hex').toUpperCase(), responseTime: this.clock() };
    return this.handleIpn({ ...body, signature: this.sign(body) });
  }
  async handleIpn(body) {
    if (!this.verify(body)) fail('Chữ ký IPN không hợp lệ.', 401);
    const order = await this.store.get(String(body.orderId));
    if (!order) fail('Không tìm thấy đơn thanh toán.', 404);
    if (Number(body.amountVnd) !== order.amountVnd) fail('Số tiền IPN không khớp đơn thanh toán.', 400);
    if (order.status === 'Paid') return { ...order, duplicate: true };
    if (Number(body.resultCode) !== 0) {
      await this.store.transition(order.id, 'Pending', 'Failed', { lastError: 'Ví mô phỏng báo thanh toán không thành công.' });
      return this.store.get(order.id);
    }
    // Atomic claim: a repeated or concurrent IPN cannot confirm either purpose twice.
    if (!await this.store.transition(order.id, 'Pending', 'Processing')) return { ...await this.store.get(order.id), duplicate: true };
    try {
      const receipt = `cong-thanh-toan-mo-phong:${order.id}:${body.transId}`;
      if (order.purpose === 'dat-coc') {
        await this.deposits.markPaid(order.refId, receipt);
        await this.store.transition(order.id, 'Processing', 'Paid', { transId: String(body.transId) });
        try { await this.notifyDepositPaid(order.refId); }
        catch (error) { console.warn('[deposit-mail] paid:', error.message); }
      } else if (order.purpose === 'thu-nhan-phong') {
        // The SQL adapter commits the invoice and Paid order together.
        await this.firstCharges.markPaid(order, receipt, String(body.transId));
        try { await this.notifyFirstChargePaid(order.refId); }
        catch (error) { console.warn('[checkin-mail] first-charge-paid:', error.message); }
      }
      else if (order.purpose === 'thu-them-doi-soat') {
        // The SQL adapter runs the top-up procedure and marks the order Paid in one transaction.
        await this.beforeTopUpPaid(order.refId);
        await this.topUps.markPaid(order, receipt, String(body.transId));
        try {await this.afterTopUpPaid(order.refId);} catch { /* receipt is committed; reconciliation can retry */ }
      }
      else fail('Loại đơn thanh toán không hợp lệ.', 409);
    } catch (error) {
      await this.store.transition(order.id, 'Processing', 'Failed', { lastError: String(error.message).slice(0, 500) });
      throw error;
    }
    return this.store.get(order.id);
  }
}
