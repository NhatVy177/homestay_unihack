import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemberInviteNotifier, loadInviteMembers, memberInviteMail } from '../integrations/mail/nhanPhongNotifications.js';

const member = { memberId: 'TV0001', memberName: 'Lan', memberEmail: ' lan+x@example.com ', customerName: 'An' };

test('invite mail links to a prefilled optional sign-up and says it is not required', () => {
  const mail = memberInviteMail(member, 'http://localhost:5173');
  assert.equal(mail.link, 'http://localhost:5173/?dangKy=1&email=lan%2Bx%40example.com');
  assert.match(mail.text, /không bắt buộc/); assert.match(mail.text, /An đã khai bạn/);
});

test('each member is invited once and a failure does not stop the others', async () => {
  const sent = [], marks = new Map(), claimed = new Set();
  const mailer = { send: async ({ to }) => { if (to.startsWith('bad')) throw new Error('smtp'); sent.push(to); return { status: 'sent' }; } };
  const notify = createMemberInviteNotifier({
    members: async () => [member, { ...member, memberId: 'TV0002', memberEmail: 'bad@example.com' }, { ...member, memberId: 'TV0003', memberEmail: 'ok@example.com' }],
    reserve: async (key) => !claimed.has(key) && claimed.add(key), mark: async (key, status) => marks.set(key, status),
    mailer, origin: 'http://x', log: { warn() {} },
  });
  const first = await notify('HS0001');
  assert.deepEqual(sent, [' lan+x@example.com ', 'ok@example.com']);
  assert.equal(first.TV0002, 'failed'); assert.equal(marks.get('member-invite:HS0001:TV0002'), 'Failed');
  const again = await notify('HS0001');
  assert.equal(again.TV0001, 'duplicate'); assert.equal(sent.length, 2);
});

test('only approved members with an email and no existing account are selected', async () => {
  let sqlText = '';
  await loadInviteMembers('HS0001', async (text) => { sqlText = text; return { recordset: [] }; });
  assert.match(sqlText, /TrangThaiHoSo=N'Đã duyệt cư trú'/); assert.match(sqlText, /TrangThai<>N'Bị từ chối'/);
  assert.match(sqlText, /NOT EXISTS \(SELECT 1 FROM dbo\.NguoiDung u WHERE LOWER\(u\.Email\)/);
});
