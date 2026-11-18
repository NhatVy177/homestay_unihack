import test from 'node:test';
import assert from 'node:assert/strict';
import { invoiceReminderEmail, nhacHoaDon } from '../services/nhacHoaDon.service.js';

const due = [
  { id: 'HD0101', ky: '2026-12', han: '2026-12-10T00:00:00Z', tongTien: 2650000, maHopDong: 'HD0001', hoTen: 'Khách A', email: 'a@example.com' },
  { id: 'HD0102', ky: '2026-12', han: '2026-12-10T00:00:00Z', tongTien: 1000000, maHopDong: 'HD0002', hoTen: 'Khách B', email: null },
];
function fakeDb(claimed = new Set()) {
  const statuses = {};
  const query = async (text, params = []) => {
    if (text.includes('FROM dbo.HoaDon h')) return { recordset: due };
    const key = params.find((p) => p.name === 'key')?.value;
    if (text.includes('INSERT dbo.DepositMailEvent')) { const ok = !claimed.has(key); claimed.add(key); return { recordset: [{ claimed: ok ? 1 : 0 }] }; }
    if (text.includes('UPDATE dbo.DepositMailEvent')) { statuses[key] = params.find((p) => p.name === 'status').value; return { recordset: [] }; }
    throw new Error('unexpected');
  };
  return { query, statuses, claimed };
}

test('reminds each due invoice once; missing email is skipped; second run sends nothing', async () => {
  const sent = [], mailer = { send: async (m) => { sent.push(m); } };
  const db = fakeDb();
  assert.deepEqual(await nhacHoaDon({ query: db.query, mailer }), { due: 2, sent: 1 });
  assert.equal(sent[0].to, 'a@example.com');
  assert.deepEqual(db.statuses, { 'invoice-reminder:HD0101': 'Sent', 'invoice-reminder:HD0102': 'Skipped' });
  assert.deepEqual(await nhacHoaDon({ query: db.query, mailer }), { due: 2, sent: 0 });
  assert.equal(sent.length, 1);
});

test('mail failure is recorded and does not stop the batch', async () => {
  const db = fakeDb(), warnings = [];
  const result = await nhacHoaDon({ query: db.query, mailer: { send: async () => { throw new Error('smtp down'); } }, log: { warn: (m) => warnings.push(m) } });
  assert.deepEqual(result, { due: 2, sent: 0 });
  assert.equal(db.statuses['invoice-reminder:HD0101'], 'Failed');
  assert.match(warnings[0], /smtp down/);
});

test('email text has the amount, due date and a link to the invoices tab', () => {
  const mail = invoiceReminderEmail(due[0], 'https://homestaydorm.vn');
  assert.match(mail.subject, /kỳ 2026-12/);
  assert.match(mail.text, /2\.650\.000 đ/);
  assert.match(mail.text, /10\/12\/2026/);
  assert.match(mail.text, /https:\/\/homestaydorm\.vn\/khach-hang\?tab=dat-coc/);
});
