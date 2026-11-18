import test from 'node:test';
import assert from 'node:assert/strict';
import { docMa, moLink, taoLink, taoMa } from '../services/linkChot.service.js';

const sale = { vaiTro: 'NhanVien', chucVu: 'Sale', maNguoiDung: 'NV0005' };
const query = async (text, params = []) => {
  if (text.includes('FROM dbo.Phong')) return { recordset: params[0].value === 'P101' ? [{ maPhong: 'P101', tenPhong: 'Phòng P101' }] : [] };
  if (text.includes('FROM dbo.NguoiDung')) return { recordset: [{ hoTen: 'Sale Thử', sdt: '0901000000' }] };
  throw new Error('unexpected');
};
const now = () => Date.parse('2026-11-18T03:00:00Z');

test('sale creates a link; the public side reads room, time, note and who sent it', async () => {
  const link = await taoLink(sale, { maPhong: 'p101', ngayXem: '2026-11-20', gioXem: '15:00', ghiChu: 'Nhớ mang CCCD' }, { query, now });
  const opened = await moLink(link.token, { query, now });
  assert.deepEqual([opened.maPhong, opened.ngayXem, opened.gioXem, opened.ghiChu, opened.tenSale, opened.maSale], ['P101', '2026-11-20', '15:00', 'Nhớ mang CCCD', 'Sale Thử', 'NV0005']);
});

test('tampered, foreign-signed or expired links are refused', async () => {
  const token = taoMa({ maPhong: 'P101', maSale: 'NV0005' }, now());
  const [body, signature] = token.split('.');
  const forged = Buffer.from(JSON.stringify({ maPhong: 'P999', maSale: 'NV0005', exp: now() + 1e9 })).toString('base64url');
  assert.equal(docMa(`${forged}.${signature}`, now()), null);
  assert.equal(docMa(`${body}.x${signature.slice(1)}`, now()), null);
  assert.equal(docMa(token, now() + 8 * 24 * 3600 * 1000), null, 'hết hạn sau 7 ngày');
  await assert.rejects(moLink('rac', { query, now }), /hết hạn hoặc không đúng/);
});

test('only sale/manager can create; room, date and time are validated', async () => {
  await assert.rejects(taoLink({ vaiTro: 'KhachHang' }, { maPhong: 'P101' }, { query, now }), /Chỉ nhân viên/);
  await assert.rejects(taoLink({ ...sale, chucVu: 'Kế toán' }, { maPhong: 'P101' }, { query, now }), /Chỉ nhân viên/);
  await assert.rejects(taoLink(sale, { maPhong: 'P999' }, { query, now }), /Không tìm thấy phòng/);
  await assert.rejects(taoLink(sale, { maPhong: 'P101', ngayXem: '2026-11-01' }, { query, now }), /đã qua/);
  await assert.rejects(taoLink(sale, { maPhong: 'P101', gioXem: '3pm' }, { query, now }), /Giờ hẹn/);
});
