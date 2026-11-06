import test from 'node:test';
import assert from 'node:assert/strict';
import { createDepositNotifier } from '../integrations/mail/datCocNotifications.js';

const row = {
  maDangKy: 'DKTEST', maPhieuDatCoc: 'DCTEST', khach: 'Khach mau',
  emailKhach: 'customer@example.invalid', sale: 'Sale mau',
  emailSale: 'sale@example.invalid', sdt: '0900000000', maPhong: 'P101',
  giuongs: 'G01', hinhThucThue: 'Ghep giuong', soTienCoc: 1000000,
  thoiHanThanhToan: new Date('2026-11-08T03:00:00Z'),
};

function setup(record = row, sendResult = { status: 'sent' }) {
  const messages = [];
  const states = new Map();
  const notifier = createDepositNotifier({
    load: async () => record,
    loadManagers: async () => [{ id: 'NV0003', email: 'manager-branch1@example.invalid' }],
    reserve: async key => { if (states.has(key)) return false; states.set(key, 'Sending'); return true; },
    mark: async (key, status) => states.set(key, status),
    mailer: { send: async message => {
      messages.push(message);
      if (sendResult instanceof Error) throw sendResult;
      return sendResult;
    } },
    appOrigin: 'https://demo.example.invalid',
    bank: { nganHang: 'Ngan hang demo', soTaiKhoan: '123456', chuTaiKhoan: 'Tai khoan demo' },
    log: { warn() {} },
  });
  return { notifier, messages, states };
}

test('D-023: issue mail goes to sale/customer with payment link and transfer content', async () => {
  const { notifier, messages } = setup();
  await notifier('issued', 'DCTEST');
  assert.deepEqual(messages.map(x => x.to), ['sale@example.invalid', 'customer@example.invalid']);
  assert.match(messages[0].text, /DCTEST/);
  assert.match(messages[0].text, /P101/);
  assert.match(messages[1].text, /\/khach-hang\?tab=dat-coc&phieu=DCTEST/);
  assert.match(messages[1].text, /DCTEST 0900000000/);
  assert.match(messages[1].html, /Thanh to[aá]n ngay/);
});

test('D-023: request and 8h reminder go to manager of selected room branch once', async () => {
  const { notifier, messages, states } = setup({ ...row, giuongYeuCau: 'G01', guiLuc: new Date('2026-11-07T01:00:00Z') });
  await notifier('request', 'DKTEST');
  await notifier('manager-reminder', 'DKTEST');
  await notifier('manager-reminder', 'DKTEST');
  assert.deepEqual(messages.map(x => x.to), [
    'manager-branch1@example.invalid', 'manager-branch1@example.invalid',
  ]);
  assert.match(messages[0].text, /DKTEST/);
  assert.match(messages[0].text, /P101/);
  assert.match(messages[0].text, /nhan-vien-quan-ly\?tab=xac-nhan-nhan-phong/);
  assert.match(messages[1].subject, /8 giờ/);
  assert.equal(states.get(`manager-reminder:DKTEST:${new Date('2026-11-07T01:00:00Z').getTime()}:manager:NV0003`), 'Sent');
});

test('D-023: a request sent again after rejection starts a new mail event', async () => {
  const record = { ...row, guiLuc: new Date('2026-11-07T01:00:00Z') };
  const { notifier, messages } = setup(record);
  await notifier('request', 'DKTEST');
  record.guiLuc = new Date('2026-11-07T02:00:00Z');
  await notifier('request', 'DKTEST');
  assert.equal(messages.length, 2);
});

test('D-023: rejected, paid, reminder and expired have distinct content and dedupe', async () => {
  for (const kind of ['rejected', 'paid', 'reminder', 'expired']) {
    const { notifier, messages, states } = setup();
    await notifier(kind, 'DCTEST', 'Ly do demo');
    await notifier(kind, 'DCTEST', 'Ly do demo');
    assert.equal(messages.length, 2, kind);
    const eventId = kind === 'rejected' ? 'DCTEST:legacy' : 'DCTEST';
    assert.equal(states.get(`${kind}:${eventId}:customer`), 'Sent');
    assert.equal(states.get(`${kind}:${eventId}:sale`), 'Sent');
    assert.match(messages[1].text, /DCTEST|DKTEST/);
    if (kind === 'rejected') assert.match(messages[1].text, /Ly do demo/);
    if (kind === 'reminder') assert.match(messages[1].text, /3/);
    if (kind === 'expired') assert.match(messages[1].text, /24/);
  }
});

test('D-023: missing email is skipped and send failure does not fail workflow', async () => {
  const missing = setup({ ...row, emailKhach: null });
  const result = await missing.notifier('issued', 'DCTEST');
  assert.equal(result.khachThieuEmail, true);
  assert.equal(missing.messages.length, 1);
  assert.equal(missing.states.get('issued:DCTEST:customer'), 'Skipped');

  const failed = setup(row, new Error('SMTP unavailable'));
  const outcome = await failed.notifier('paid', 'DCTEST');
  assert.equal(outcome.sale, 'failed');
  assert.equal(outcome.customer, 'failed');
  assert.equal(failed.states.get('paid:DCTEST:customer'), 'Failed');
});
