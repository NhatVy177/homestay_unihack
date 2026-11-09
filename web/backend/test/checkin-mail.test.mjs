import test from 'node:test';
import assert from 'node:assert/strict';
import { createNhanPhongNotifier } from '../integrations/mail/nhanPhongNotifications.js';
import { nhacThuDauKy } from '../services/nhacThuDauKy.service.js';

function fixture({ failTo = null, paid = true } = {}) {
  const sent = [], events = new Map();
  const review = { sentAt: '2026-11-07T01:00:00.000Z' };
  const notify = createNhanPhongNotifier({
    residence: async () => ({ customerName: 'Khách thử', customerEmail: 'guest@example.test',
      saleId: 'NV0001', saleEmail: 'sale@example.test', rejected: 'Thành viên A: CCCD không hợp lệ',
      reason: 'CCCD trùng trong hồ sơ', reviewSentAt: review.sentAt }),
    contract: async () => ({ customerName: 'Khách thử', customerEmail: 'guest@example.test',
      checkinDate: '2026-11-08', paid }),
    managers: async () => [{ id: 'NV0002', email: 'branch@example.test' }],
    amount: async () => 1234567,
    reserve: async key => { if (events.has(key)) return false; events.set(key, 'Sending'); return true; },
    mark: async (key, status) => events.set(key, status),
    mailer: { send: async message => {
      if (message.to === failTo) throw new Error('SMTP unavailable');
      sent.push(message); return { status: 'sent' };
    } },
    origin: 'https://demo.example.test', log: { warn() {} }
  });
  return { notify, sent, events, review };
}

test('residence exception emails only managers of the selected branch and deduplicates', async () => {
  const { notify, sent } = fixture();
  await notify('residence-review', 'CT0001');
  await notify('residence-review', 'CT0001');
  assert.deepEqual(sent.map(item => item.to), ['branch@example.test']);
  assert.match(sent[0].text, /CCCD trùng trong hồ sơ/);
  assert.match(sent[0].text, /duyet-cu-tru/);
});

test('rejected member goes to customer and Sale with both next choices', async () => {
  const { notify, sent } = fixture();
  await notify('member-rejected', 'CT0001');
  assert.deepEqual(sent.map(item => item.to), ['guest@example.test', 'sale@example.test']);
  assert.match(sent[0].text, /thành viên còn lại đủ điều kiện hoặc dừng đăng ký/);
});

test('a corrected residence submission sends manager and member rejection emails again', async () => {
  const { notify, sent, review } = fixture();
  await notify('residence-review', 'CT0001');
  await notify('member-rejected', 'CT0001');
  review.sentAt = '2026-11-07T02:00:00.000Z';
  await notify('residence-review', 'CT0001');
  await notify('member-rejected', 'CT0001');
  assert.deepEqual(sent.map(item => item.to), [
    'branch@example.test', 'guest@example.test', 'sale@example.test',
    'branch@example.test', 'guest@example.test', 'sale@example.test',
  ]);
});

test('contract email includes first charge and payment button; paid email goes to branch manager', async () => {
  const { notify, sent } = fixture();
  await notify('contract-created', 'HD0001');
  assert.match(sent[0].text, /1\.234\.567 đ/);
  assert.match(sent[0].html, />Thanh toán ngay<\/a>/);
  await notify('first-charge-paid', 'HD0001');
  await notify('first-charge-paid', 'HD0001');
  assert.deepEqual(sent.map(item => item.to), ['guest@example.test', 'guest@example.test', 'branch@example.test']);
  assert.match(sent[2].text, /sẵn sàng bàn giao/);
});

test('one failed recipient does not block another recipient', async () => {
  const { notify, sent, events } = fixture({ failTo: 'guest@example.test' });
  await notify('member-rejected', 'CT0002');
  assert.deepEqual(sent.map(item => item.to), ['sale@example.test']);
  assert.equal(events.get(`member-rejected:CT0002:${Date.parse('2026-11-07T01:00:00.000Z')}:customer`), 'Failed');
});

test('first charge reminder targets only pending contracts within one day and runs once', async () => {
  const { notify, sent } = fixture({ paid: false });
  const query = async statement => {
    assert.match(statement, /hd\.NgayBatDau > GETDATE\(\)/);
    assert.match(statement, /DATEADD\(DAY,1,GETDATE\(\)\)/);
    assert.match(statement, /NOT EXISTS/);
    return { recordset: [{ id: 'HD0003' }] };
  };
  // The scheduler chooses pending contracts; the notifier guards duplicate sends.
  assert.equal(await nhacThuDauKy({ query, notify }), 1);
  assert.equal(await nhacThuDauKy({ query, notify }), 1);
  assert.equal(sent.length, 1);
});
