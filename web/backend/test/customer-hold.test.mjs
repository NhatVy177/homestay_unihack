import test from 'node:test';
import assert from 'node:assert/strict';
import { khachGiuCho } from '../services/datCoc.service.js';

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
