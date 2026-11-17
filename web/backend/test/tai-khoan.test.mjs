import test from 'node:test';
import assert from 'node:assert/strict';
import { datLaiMatKhau, doiMatKhau, quenMatKhau, resolveLoginName } from '../services/taiKhoan.service.js';

const account = { tenDangNhap: 'kh0001', maNguoiDung: 'ND0001', trangThai: 'Hoạt động' };
const fakeQuery = (rows = [account], log = []) => async (sql, params = []) => { log.push({ sql, params }); return { recordset: rows, rowsAffected: [rows.length] }; };

test('login by email resolves to the single account, usernames pass through, shared email is refused', async () => {
  assert.equal(await resolveLoginName('kh0001', fakeQuery()), 'kh0001');
  assert.equal(await resolveLoginName('A@x.com', fakeQuery()), 'kh0001');
  assert.equal(await resolveLoginName('none@x.com', fakeQuery([])), 'none@x.com');
  await assert.rejects(resolveLoginName('a@x.com', fakeQuery([account, account])), /nhiều tài khoản/);
});

test('forgot password: OTP mailed once, wrong code rejected, right code resets, code is single use', async () => {
  const sent = [], log = [];
  const mailer = { send: async (m) => { sent.push(m); } };
  let t = 1000;
  const opts = { query: fakeQuery([account], log), mailer, now: () => t, random: () => '123456' };
  await assert.rejects(quenMatKhau({ email: 'x' }, opts), /không hợp lệ/);
  await quenMatKhau({ email: 'a@x.com' }, opts);
  assert.match(sent[0].text, /123456/);
  await assert.rejects(quenMatKhau({ email: 'a@x.com' }, opts), /đợi/);
  await assert.rejects(datLaiMatKhau({ email: 'a@x.com', otp: '000000', matKhauMoi: 'abcdef' }, opts), /không đúng/);
  await assert.rejects(datLaiMatKhau({ email: 'a@x.com', otp: '123456', matKhauMoi: 'abc' }, opts), /ít nhất/);
  await datLaiMatKhau({ email: 'a@x.com', otp: '123456', matKhauMoi: 'abcdef' }, opts);
  assert.match(log.at(-1).sql, /UPDATE dbo.TaiKhoan/);
  assert.equal(log.at(-1).params[0].value, 'BEF57EC7F53A6D40BEB640A780A639C83BC29AC8A9816F1FC6C5C6DCD93C4721');
  await assert.rejects(datLaiMatKhau({ email: 'a@x.com', otp: '123456', matKhauMoi: 'abcdef' }, opts), /hết hạn/);
});

test('OTP expires and locks after too many wrong tries', async () => {
  let t = 0;
  const opts = { query: fakeQuery(), mailer: { send: async () => {} }, now: () => t, random: () => '111111' };
  await quenMatKhau({ email: 'b@x.com' }, opts);
  t = 11 * 60 * 1000;
  await assert.rejects(datLaiMatKhau({ email: 'b@x.com', otp: '111111', matKhauMoi: 'abcdef' }, opts), /hết hạn/);
  t = 20 * 60 * 1000;
  await quenMatKhau({ email: 'b@x.com' }, opts);
  for (let i = 0; i < 5; i++) await assert.rejects(datLaiMatKhau({ email: 'b@x.com', otp: '222222', matKhauMoi: 'abcdef' }, opts), /không đúng/);
  await assert.rejects(datLaiMatKhau({ email: 'b@x.com', otp: '111111', matKhauMoi: 'abcdef' }, opts), /quá nhiều/);
});

test('change password requires the current password to match', async () => {
  const user = { tenDangNhap: 'kh0001' };
  await assert.rejects(doiMatKhau(user, { matKhauHienTai: 'old123', matKhauMoi: 'old123' }, { query: fakeQuery() }), /khác/);
  await assert.rejects(doiMatKhau(user, { matKhauHienTai: 'old123', matKhauMoi: 'new123' }, { query: async () => ({ rowsAffected: [0] }) }), /không đúng/);
  assert.deepEqual(await doiMatKhau(user, { matKhauHienTai: 'old123', matKhauMoi: 'new123' }, { query: async () => ({ rowsAffected: [1] }) }), { ok: true });
});
