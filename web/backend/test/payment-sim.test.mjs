import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PaymentSimulator } from '../integrations/payment-sim/service.js';
const customer = { vaiTro: 'KhachHang', maNguoiDung: 'KH0001' };
function fixture(deposit = {}) {
  const orders = new Map(), calls = [];
  const store = {
    async get(id) { return orders.has(id) ? structuredClone(orders.get(id)) : null; },
    async findPending(purpose, refId, customerId) { return [...orders.values()].find(o => o.purpose === purpose && o.refId === refId && o.customerId === customerId && o.status === 'Pending') || null; },
    async create(o) { orders.set(o.id, structuredClone(o)); },
    async transition(id, from, to, extra = {}) {
      const o = orders.get(id);
      if (!o || o.status !== from) return false;
      Object.assign(o, { status: to, ...(extra.transId ? { transId: extra.transId } : {}), ...(extra.lastError ? { lastError: extra.lastError } : {}) });
      return true;
    },
  };
  const state = { id: 'PC0001', customerId: 'KH0001', amountVnd: 3000000, status: 'Chờ TT', accountantId: 'NV0002', expiresAt: new Date(Date.now() + 3600000), ...deposit };
  const deposits = {
    async get(id) { return id === state.id ? { ...state } : null; },
    async chooseTransfer(id) { calls.push(['choose', id]); },
    async markPaid(id, receipt) {
      if (state.status !== 'Chờ TT') throw Object.assign(new Error('Phiếu đặt cọc không ở trạng thái "Chờ TT".'), { statusCode: 409 });
      calls.push(['paid', id, receipt]); state.status = 'Đã TT';
    },
  };
  return { sim: new PaymentSimulator({ store, deposits, secret: 'test-secret-0123456789' }), orders, calls, state };
}
describe('Cổng ví điện tử mô phỏng (D-013)', () => {
  it('creates one order per deposit, pays it once and confirms the deposit through Web2', async () => {
    const f = fixture();
    const order = await f.sim.createDepositOrder(customer, 'PC0001');
    assert.equal(order.amountVnd, 3000000);
    assert.equal((await f.sim.createDepositOrder(customer, 'PC0001')).id, order.id);
    const paid = await f.sim.pay(customer, order.id);
    assert.equal(paid.status, 'Paid');
    assert.equal(f.state.status, 'Đã TT');
    assert.equal(f.calls.filter(c => c[0] === 'paid').length, 1);
    assert.match(f.calls.find(c => c[0] === 'paid')[2], /^cong-thanh-toan-mo-phong:SIM/);
    assert.equal((await f.sim.pay(customer, order.id)).status, 'Paid');
    assert.equal(f.calls.filter(c => c[0] === 'paid').length, 1);
  });
  it('rejects forged, wrong-amount and replayed IPNs', async () => {
    const f = fixture();
    const order = await f.sim.createDepositOrder(customer, 'PC0001');
    const body = { orderId: order.id, amountVnd: order.amountVnd, resultCode: 0, transId: 'T1', responseTime: 1 };
    await assert.rejects(f.sim.handleIpn({ ...body, signature: '00'.repeat(32) }), /Chữ ký/);
    const wrongAmount = { ...body, amountVnd: 1 };
    await assert.rejects(f.sim.handleIpn({ ...wrongAmount, signature: f.sim.sign(wrongAmount) }), /Số tiền/);
    assert.equal(f.state.status, 'Chờ TT');
    const signed = { ...body, signature: f.sim.sign(body) };
    const results = await Promise.all([f.sim.handleIpn(signed), f.sim.handleIpn(signed)]);
    // The losing concurrent IPN sees the claimed order (Processing/Paid) and is reported as a duplicate.
    assert.equal(results.filter(r => r.duplicate).length, 1);
    assert.equal(f.calls.filter(c => c[0] === 'paid').length, 1);
    assert.equal(f.orders.get(order.id).status, 'Paid');
    assert.equal((await f.sim.handleIpn(signed)).duplicate, true);
  });
  it('enforces ownership, deposit state and cancellation', async () => {
    const f = fixture();
    await assert.rejects(f.sim.createDepositOrder({ vaiTro: 'KhachHang', maNguoiDung: 'KH0002' }, 'PC0001'), /phiếu đặt cọc/);
    await assert.rejects(f.sim.createDepositOrder({ vaiTro: 'NhanVien', maNguoiDung: 'NV0001' }, 'PC0001'), /Chỉ khách hàng/);
    const order = await f.sim.createDepositOrder(customer, 'PC0001');
    await assert.rejects(f.sim.getOrder({ vaiTro: 'KhachHang', maNguoiDung: 'KH0002' }, order.id));
    assert.equal((await f.sim.cancel(customer, order.id)).status, 'Cancelled');
    await assert.rejects(f.sim.pay(customer, order.id), /không còn/);
    assert.equal(f.state.status, 'Chờ TT');
    await assert.rejects(fixture({ accountantId: null }).sim.createDepositOrder(customer, 'PC0001'), /chưa được kế toán chốt/);
    await assert.rejects(fixture({ status: 'Đã TT' }).sim.createDepositOrder(customer, 'PC0001'), /chờ thanh toán/);
    await assert.rejects(fixture({ expiresAt: new Date(Date.now() - 1000) }).sim.createDepositOrder(customer, 'PC0001'), /hết hạn/);
  });
  it('marks the order failed when Web2 refuses to confirm the deposit', async () => {
    const f = fixture();
    const order = await f.sim.createDepositOrder(customer, 'PC0001');
    f.state.status = 'Hết hạn';
    await assert.rejects(f.sim.pay(customer, order.id), /Chờ TT/);
    assert.equal(f.orders.get(order.id).status, 'Failed');
  });
});
