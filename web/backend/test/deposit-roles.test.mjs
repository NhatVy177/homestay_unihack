import test from 'node:test';
import assert from 'node:assert/strict';
import { getDanhSachChoXacNhanThanhToan, xacNhanThanhToanCoc,
  thuTienMatCoc, ghiNhanNopQuyCoc } from '../services/datCoc.service.js';

const manager = { vaiTro: 'NhanVien', chucVu: 'Quản lý', maNguoiDung: 'NV0003' };
const sale = { vaiTro: 'NhanVien', chucVu: 'Sale', maNguoiDung: 'NV0001' };

test('D-023: manager cannot confirm bank transfer or cash fund', async () => {
  await assert.rejects(getDanhSachChoXacNhanThanhToan(manager), { statusCode: 403 });
  await assert.rejects(xacNhanThanhToanCoc(manager, 'DCTEST', { hopLe: true }), { statusCode: 403 });
  await assert.rejects(ghiNhanNopQuyCoc(manager, 'DCTEST'), { statusCode: 403 });
  await assert.rejects(ghiNhanNopQuyCoc(sale, 'DCTEST'), { statusCode: 403 });
});

test('D-023: cash collection is Sale-only and needs a signed receipt', async () => {
  await assert.rejects(thuTienMatCoc(manager, 'DCTEST', '/test.jpg'), { statusCode: 403 });
  await assert.rejects(thuTienMatCoc(sale, 'DCTEST', null), { statusCode: 400 });
});
