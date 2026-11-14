import test from 'node:test';
import assert from 'node:assert/strict';
import { getPhongDaXemCuaKhach, khachGuiYeuCauGiuCho } from '../services/khachGiuCho.service.js';

const khach = { vaiTro: 'KhachHang', maNguoiDung: 'KH0001' };
const profile = (extra = {}) => async () => ({ recordset: [{ maDangKy: 'DK0001', maNhanVienSale: 'NV0001', trangThai: 'Đã tiếp nhận', soNguoiDuKienO: 2, soNam: 2, soNu: 0, ...extra }] });
const body = { maDangKy: 'DK0001', maPhong: 'P101', hinhThucThue: 'Ghép giường', giuongs: ['G1', 'G2'] };

test('customer sends hold request through the Sale-owned procedures and only for their own profile', async () => {
  const calls = []; const notes = [];
  const run = async (name, params) => { calls.push([name, Object.fromEntries(params.map((p) => [p.name, p.value]))]); return { recordsets: [[{ maDangKy: 'DK0001' }]] }; };
  const row = await khachGuiYeuCauGiuCho(khach, body, { query: profile(), run, notify: async (...a) => notes.push(a) });
  assert.equal(row.maDangKy, 'DK0001');
  assert.deepEqual(calls.map((c) => c[0]), ['dbo.SP_ChonPhongKhachChot', 'dbo.SP_GuiYeuCauCocKemLuaChon']);
  assert.equal(calls[1][1].MaNhanVienSale, 'NV0001'); assert.equal(calls[1][1].DanhSachGiuong, 'G1,G2');
  assert.deepEqual(notes, [['request', 'DK0001']]);
});
test('rejects non-customers, foreign profiles, already-sent profiles and bad input without touching procedures', async () => {
  const run = async () => { throw new Error('must not run'); };
  await assert.rejects(khachGuiYeuCauGiuCho({ vaiTro: 'NhanVien', chucVu: 'Sale', maNguoiDung: 'NV0001' }, body, { query: profile(), run }), { statusCode: 403 });
  await assert.rejects(khachGuiYeuCauGiuCho(khach, body, { query: async () => ({ recordset: [] }), run }), { statusCode: 404 });
  await assert.rejects(khachGuiYeuCauGiuCho(khach, body, { query: profile({ trangThai: 'Chờ xác nhận cọc' }), run }), { statusCode: 409 });
  await assert.rejects(khachGuiYeuCauGiuCho(khach, body, { query: profile({ maNhanVienSale: null }), run }), { statusCode: 409 });
  await assert.rejects(khachGuiYeuCauGiuCho(khach, { ...body, giuongs: [] }, { query: profile(), run }));
  await assert.rejects(khachGuiYeuCauGiuCho(khach, { ...body, hinhThucThue: 'Khác' }, { query: profile(), run }));
  await assert.rejects(getPhongDaXemCuaKhach(khach, '1; DROP', { query: profile(), run }));
});
test('viewed-rooms lookup is scoped to the owner and reports people count', async () => {
  const out = await getPhongDaXemCuaKhach(khach, 'DK0001', { query: profile(), run: async () => ({ recordset: [{ maPhong: 'P101', daXem: 1 }] }) });
  assert.deepEqual(out, { soNguoi: 2, khacGioi: false, daGuiYeuCau: false, phong: [{ maPhong: 'P101', daXem: 1 }] });
});

import { getYeuCauGiuChoCuaKhach } from '../services/khachGiuCho.service.js';
test('pending hold requests are scoped to the signed-in customer and only those awaiting the manager', async () => {
  let call;
  const rows = await getYeuCauGiuChoCuaKhach(khach, async (text, params) => { call = { text, params }; return { recordset: [{ maDangKy: 'DK0001' }] }; });
  assert.equal(call.params[0].value, 'KH0001'); assert.match(call.text, /MaKhachHang = @MaKhachHang/); assert.match(call.text, /N'Chờ xác nhận cọc'/);
  assert.equal(rows.length, 1);
  await assert.rejects(getYeuCauGiuChoCuaKhach({ vaiTro: 'NhanVien', maNguoiDung: 'NV0001' }, async () => ({ recordset: [] })), { statusCode: 403 });
});
