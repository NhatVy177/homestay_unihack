import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
// D-013: self-hosted e-wallet payment SIMULATOR. It follows the usual gateway pattern
// (create order → payment page → signed IPN → idempotent update) but no real provider is called
// and no money moves. The UI must always label it "mô phỏng".
const fail = (message, statusCode = 400) => { throw Object.assign(new Error(message), { statusCode }); };
const FIELDS = ['orderId', 'amountVnd', 'resultCode', 'transId', 'responseTime'];
export const ipnString = body => FIELDS.map(key => `${key}=${body[key]}`).join('&');
export class PaymentSimulator {
  constructor({ store, deposits, secret, clock = () => Date.now() }) {
    if (!secret || secret.length < 16) throw new Error('PAYMENT_SIM_SECRET must be at least 16 characters.');
    Object.assign(this, { store, deposits, secret, clock });
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
    await this.deposits.chooseTransfer(deposit.id);
    const order = { id: 'SIM' + randomBytes(12).toString('hex').toUpperCase(), purpose: 'dat-coc', refId: deposit.id,
      customerId: user.maNguoiDung, amountVnd: deposit.amountVnd, status: 'Pending' };
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
    // Atomic claim: a repeated or concurrent IPN cannot confirm the deposit twice.
    if (!await this.store.transition(order.id, 'Pending', 'Processing')) return { ...await this.store.get(order.id), duplicate: true };
    try {
      await this.deposits.markPaid(order.refId, `cong-thanh-toan-mo-phong:${order.id}:${body.transId}`);
      await this.store.transition(order.id, 'Processing', 'Paid', { transId: String(body.transId) });
    } catch (error) {
      await this.store.transition(order.id, 'Processing', 'Failed', { lastError: String(error.message).slice(0, 500) });
      throw error;
    }
    return this.store.get(order.id);
  }
}
