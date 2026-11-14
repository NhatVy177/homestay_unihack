import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { khaiCuTru, getCuTruCuaKhach } from '../services/khachCuTru.service.js';
import { patchSaveResidence, patchSubmitResidence } from '../scripts/residence-self-declare-db.mjs';

const khach = { vaiTro: 'KhachHang', maNguoiDung: 'KH0001' };
const member = { hoTen: 'Lan', ngaySinh: '2000-01-01', gioiTinh: 'Nữ', cccd: '012345678901', sdt: '0900000000', quocTich: 'Việt Nam' };
const body = { maPhieuDatCoc: 'DC0003', dongYCungCapThongTin: true, danhSachThanhVien: [member] };
const ownerQuery = async () => ({ recordset: [{ maNhanVienSale: 'NV0001' }] });

function fakeRepo(status) {
  const calls = [];
  return { calls, luuHoSoCuTru: async (data) => { calls.push(['luu', data]); return { hoSo: { MaHoSoCuTru: 'HS0009' } }; },
    guiDuyetHoSoCuTru: async (id) => { calls.push(['gui', id]); return { TrangThaiHoSo: status, GhiChuQuanLy: status === 'Chờ duyệt cư trú' ? 'Quốc tịch cần quản lý kiểm tra; ' : null }; } };
}

test('customer declaration saves without the old ID gate, submits, and invites or notifies', async () => {
  const notes = [];
  const auto = fakeRepo('Đã duyệt cư trú');
  const ok = await khaiCuTru(khach, body, { query: ownerQuery, repo: auto, notify: async (...a) => notes.push(['notify', ...a]), invite: async (id) => notes.push(['invite', id]) });
  assert.equal(auto.calls[0][1].daDoiChieuGiayTo, false); assert.equal(auto.calls[0][1].maNhanVienSale, 'NV0001');
  assert.deepEqual(ok, { maHoSoCuTru: 'HS0009', trangThaiHoSo: 'Đã duyệt cư trú', lyDo: null });
  const manual = fakeRepo('Chờ duyệt cư trú');
  const review = await khaiCuTru(khach, body, { query: ownerQuery, repo: manual, notify: async (...a) => notes.push(['notify', ...a]), invite: async (id) => notes.push(['invite', id]) });
  assert.match(review.lyDo, /Quốc tịch/);
  assert.deepEqual(notes, [['invite', 'HS0009'], ['notify', 'residence-review', 'HS0009']]);
});

test('declaration requires consent, complete members, the customer\'s own deposit and a responsible Sale', async () => {
  const repo = fakeRepo('Đã duyệt cư trú');
  await assert.rejects(khaiCuTru(khach, { ...body, dongYCungCapThongTin: false }, { query: ownerQuery, repo }));
  await assert.rejects(khaiCuTru(khach, { ...body, danhSachThanhVien: [{ ...member, sdt: '' }] }, { query: ownerQuery, repo }));
  await assert.rejects(khaiCuTru(khach, body, { query: async () => ({ recordset: [] }), repo }), { statusCode: 404 });
  await assert.rejects(khaiCuTru(khach, body, { query: async () => ({ recordset: [{ maNhanVienSale: null }] }), repo }), { statusCode: 409 });
  await assert.rejects(khaiCuTru({ vaiTro: 'NhanVien', maNguoiDung: 'NV0001' }, body, { query: ownerQuery, repo }), { statusCode: 403 });
  assert.equal(repo.calls.length, 0);
});

test('residence list marks editable deposits and attaches their members', async () => {
  const replies = [
    { recordset: [{ maPhieuDatCoc: 'DC0003', maHoSoCuTru: 'HS0001', trangThaiHoSo: 'Từ chối cư trú', coHopDong: false },
      { maPhieuDatCoc: 'DC0002', maHoSoCuTru: null, trangThaiHoSo: 'Chưa cập nhật', coHopDong: true }] },
    { recordset: [{ maHoSoCuTru: 'HS0001', hoTen: 'Lan' }] },
    { recordset: [{ hoTen: 'An' }] }];
  const out = await getCuTruCuaKhach(khach, { query: async () => replies.shift() });
  assert.equal(out.nguoiDaiDien.hoTen, 'An');
  assert.deepEqual(out.phieu.map((p) => [p.coTheKhai, p.thanhVien.length]), [[true, 1], [false, 0]]);
});

test('migration removes only the two document gates and is idempotent', () => {
  const save = "CREATE PROCEDURE dbo.SP_LuuHoSoCuTru AS BEGIN\r\n    IF @DaDoiChieuGiayTo = 0\r\n        THROW 50012, N'x', 1;\r\n    IF 1=0 THROW 50013, N'y', 1;\r\nEND";
  const submit = "CREATE PROCEDURE dbo.SP_GuiDuyetHoSoCuTru AS BEGIN\r\n    SELECT 1 FROM t hs WHERE hs.A=1\r\n      AND hs.DaDoiChieuGiayTo=1;\r\nEND";
  const a = patchSaveResidence(save), b = patchSubmitResidence(submit);
  assert.doesNotMatch(a, /50012/); assert.match(a, /50013/); assert.match(a, /^CREATE OR ALTER PROCEDURE/);
  assert.doesNotMatch(b, /DaDoiChieuGiayTo=1/); assert.match(b, /hs\.A=1;/);
  assert.equal(patchSaveResidence(a), a); assert.equal(patchSubmitResidence(b), b);
  assert.throws(() => patchSaveResidence('CREATE PROCEDURE x AS THROW 50012, N\'z\', 1;'));
});
