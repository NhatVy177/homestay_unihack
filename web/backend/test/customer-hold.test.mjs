import test from 'node:test';
import assert from 'node:assert/strict';
import { khachGiuCho, khachKhongThueNua, ghiNhanKhachKhongDen } from '../services/datCoc.service.js';

const customer = { vaiTro: 'KhachHang', maNguoiDung: 'KH0001' };
const sale = { vaiTro: 'NhanVien', chucVu: 'Sale', maNguoiDung: 'NV0001' };
const ok = { maDangKy: 'DK0001', maPhong: 'P101', hinhThucThue: 'Nguyên phòng' };

test('D-026: only a customer can self-submit a hold', async () => {
  await assert.rejects(khachGiuCho(sale, ok), { statusCode: 403 });
  await assert.rejects(khachGiuCho(null, ok), { statusCode: 403 });
});

test('D-026: hold input is validated before touching the database', async () => {
  await assert.rejects(khachGiuCho(customer, { ...ok, maPhong: '' }), { statusCode: 400 });
  await assert.rejects(khachGiuCho(customer, { ...ok, hinhThucThue: 'Khác' }), { statusCode: 400 });
  await assert.rejects(khachGiuCho(customer, { ...ok, hinhThucThue: 'Ghép giường' }), { statusCode: 400 });
});

test('D-026: only the customer closes a profile; only Sale marks a no-show', async () => {
  await assert.rejects(khachKhongThueNua(sale, 'DK0001'), { statusCode: 403 });
  await assert.rejects(khachKhongThueNua(customer, ''), { statusCode: 400 });
  await assert.rejects(ghiNhanKhachKhongDen(customer, 'DK0001', 1), { statusCode: 403 });
  await assert.rejects(ghiNhanKhachKhongDen(sale, 'DK0001', 'x'), { statusCode: 400 });
});
