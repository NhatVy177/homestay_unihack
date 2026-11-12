import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PaymentSimulator } from '../integrations/payment-sim/service.js';

const customer = { vaiTro: 'KhachHang', maNguoiDung: 'KH0001' };
function fixture(row = {}) {
  const orders = new Map(), calls = [];
  const store = {
    async get(id) { return orders.has(id) ? structuredClone(orders.get(id)) : null; },
    async findPending(purpose, refId, customerId) { return [...orders.values()].find(o => o.purpose === purpose && o.refId === refId && o.customerId === customerId && o.status === 'Pending') || null; },
    async create(o) { orders.set(o.id, structuredClone(o)); },
    async transition(id, from, to, extra = {}) {
      const o = orders.get(id);
      if (!o || o.status !== from) return false;
      Object.assign(o, { status: to, ...extra });
      return true;
    },
  };
  const state = { customerId: 'KH0001', settlementId: 'DS0001', status: 'Chờ thanh toán thêm', returnStatus: 'Chờ ký biên bản', amountVnd: 400000, ...row };
  const topUps = {
    async get(id) { return id === 'HD0001' ? { ...state } : null; },
    async markPaid(order, receipt, transId) {
      // Mirrors SP_TraPhong_ThuThemQuaViMoPhong: one payment, exact amount, owner only.
      if (state.status !== 'Chờ thanh toán thêm') throw Object.assign(new Error('Phiếu đối soát không còn ở bước chờ thanh toán thêm.'), { statusCode: 409 });
      if (order.amountVnd !== state.amountVnd) throw new Error('Số tiền thanh toán không khớp số tiền cần thu thêm.');
      calls.push(['topup-paid', order.refId, order.amountVnd, receipt]);
      state.status = 'Đã quyết toán';
      await store.transition(order.id, 'Processing', 'Paid', { transId });
    },
  };
  const sim = new PaymentSimulator({ store, deposits: {}, firstCharges: {}, topUps, secret: 'test-secret-0123456789' });
  return { sim, orders, calls, state };
}

test('C3: only the contract owner gets a quote; nothing to pay before the agreed top-up', async () => {
  const { sim, state } = fixture();
  await assert.rejects(sim.topUpQuote({ ...customer, maNguoiDung: 'KH9999' }, 'HD0001'), e => e.statusCode === 404);
  await assert.rejects(sim.topUpQuote({ vaiTro: 'NhanVien', maNguoiDung: 'NV0001' }, 'HD0001'), e => e.statusCode === 403);
  assert.deepEqual(await sim.topUpQuote(customer, 'HD0001'),
    { purpose: 'thu-them-doi-soat', refId: 'DS0001', contractId: 'HD0001', status: 'Pending', amountVnd: 400000 });
  state.status = 'Chờ xác nhận';
  assert.equal((await sim.topUpQuote(customer, 'HD0001')).status, 'Unavailable', 'tenant has not agreed yet');
  await assert.rejects(sim.createTopUpOrder(customer, 'HD0001'), /chưa ở bước/);
});

test('C3: paying settles the statement once; a repeated IPN does not pay twice', async () => {
  const { sim, calls, state } = fixture();
  const order = await sim.createTopUpOrder(customer, 'HD0001');
  assert.equal(order.refId, 'DS0001');
  assert.equal((await sim.createTopUpOrder(customer, 'HD0001')).id, order.id, 'reuse the pending order');
  const body = { orderId: order.id, amountVnd: order.amountVnd, resultCode: 0, transId: 'TX1', responseTime: 1 };
  const signed = { ...body, signature: sim.sign(body) };
  assert.equal((await sim.handleIpn(signed)).status, 'Paid');
  assert.equal((await sim.handleIpn(signed)).duplicate, true);
  assert.equal(calls.length, 1);
  assert.match(calls[0][3], /^cong-thanh-toan-mo-phong:/);
  assert.equal(state.status, 'Đã quyết toán');
  assert.equal((await sim.topUpQuote(customer, 'HD0001')).status, 'Paid');
  await assert.rejects(sim.createTopUpOrder(customer, 'HD0001'), /đã được thanh toán/);
});

test('C3: wrong amount or forged signature is refused; a failed settlement marks the order Failed', async () => {
  const { sim, orders, state } = fixture();
  const order = await sim.createTopUpOrder(customer, 'HD0001');
  const body = { orderId: order.id, amountVnd: 1, resultCode: 0, transId: 'TX2', responseTime: 1 };
  await assert.rejects(sim.handleIpn({ ...body, signature: sim.sign(body) }), /không khớp/);
  const good = { ...body, amountVnd: order.amountVnd };
  await assert.rejects(sim.handleIpn({ ...good, signature: 'ab'.repeat(32) }), e => e.statusCode === 401);
  state.status = 'Đã quyết toán'; // paid at the counter meanwhile
  await assert.rejects(sim.handleIpn({ ...good, signature: sim.sign(good) }), /không còn ở bước/);
  assert.equal(orders.get(order.id).status, 'Failed');
});
