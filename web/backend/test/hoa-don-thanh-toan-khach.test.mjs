import test from 'node:test';
import assert from 'node:assert/strict';
import { PaymentSimulator } from '../integrations/payment-sim/service.js';
import { luuChungTuHoaDon } from '../services/kyDauChungTu.service.js';

const khach = { vaiTro: 'KhachHang', maNguoiDung: 'KH0001' };

function sim(invoice) {
  const orders = new Map(), paid = [];
  const store = {
    async get(id) { return orders.get(id) ? { ...orders.get(id) } : null; },
    async findPending(purpose, refId, customerId) { return [...orders.values()].find((o) => o.purpose === purpose && o.refId === refId && o.customerId === customerId && o.status === 'Pending') || null; },
    async create(o) { orders.set(o.id, { ...o }); },
    async transition(id, from, to, extra = {}) { const o = orders.get(id); if (!o || o.status !== from) return false; Object.assign(o, { status: to, ...extra }); return true; },
  };
  const invoices = {
    async get(id) { return id === 'HO0003' ? { ...invoice } : null; },
    async markPaid(order, receipt, transId) { paid.push([order.refId, order.amountVnd]); invoice.status = 'Đã TT'; await store.transition(order.id, 'Processing', 'Paid', { transId }); },
  };
  return { s: new PaymentSimulator({ store, deposits: {}, firstCharges: {}, invoices, secret: 'test-secret-0123456789' }), paid };
}

test('a customer pays a monthly invoice through the simulated wallet once', async () => {
  const { s, paid } = sim({ customerId: 'KH0001', status: 'Chưa TT', amountVnd: 8298000 });
  const order = await s.createInvoiceOrder(khach, 'HO0003');
  assert.equal(order.purpose, 'hoa-don');
  assert.equal((await s.createInvoiceOrder(khach, 'HO0003')).id, order.id);
  assert.equal((await s.pay(khach, order.id)).status, 'Paid');
  assert.deepEqual(paid, [['HO0003', 8298000]]);
  await assert.rejects(s.createInvoiceOrder(khach, 'HO0003'), /không ở trạng thái chờ/);
});

test('wallet invoice orders are refused for other customers or unknown invoices', async () => {
  const { s } = sim({ customerId: 'KH0002', status: 'Nợ', amountVnd: 100 });
  await assert.rejects(s.createInvoiceOrder(khach, 'HO0003'), /Không tìm thấy hóa đơn/);
  await assert.rejects(s.createInvoiceOrder(khach, 'HO9999'), /Không tìm thấy hóa đơn/);
});

test('invoice proof upload checks ownership and unpaid status', async () => {
  const file = { filename: 'HO0003-1.png', originalname: 'ck.png' };
  const q = (row) => async (text) => (/MERGE/.test(text) ? { recordset: [] } : /FROM dbo\.ChungTuHoaDon c/.test(text)
    ? { recordset: [{ maHoaDon: 'HO0003', duongDan: '/uploads/chung-tu/HO0003-1.png', tenTep: 'ck.png' }] } : { recordset: row ? [row] : [] });
  assert.equal((await luuChungTuHoaDon(khach, 'HO0003', file, { query: q({ maKhachHang: 'KH0001', trangThai: 'Nợ' }) })).tenTep, 'ck.png');
  await assert.rejects(luuChungTuHoaDon(khach, 'HO0003', file, { query: q({ maKhachHang: 'KH0002', trangThai: 'Chưa TT' }) }), /Không tìm thấy/);
  await assert.rejects(luuChungTuHoaDon(khach, 'HO0003', file, { query: q({ maKhachHang: 'KH0001', trangThai: 'Đã TT' }) }), /không còn ở trạng thái/);
  await assert.rejects(luuChungTuHoaDon(khach, 'HO0003', null, { query: q(null) }), /chọn ảnh/);
});
