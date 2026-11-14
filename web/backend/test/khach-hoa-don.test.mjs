import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyInvoice, getHoaDonCuaKhach } from '../services/khachHoaDon.service.js';

test('first-period invoice is the contract start month, later ones are monthly', () => {
  assert.equal(classifyInvoice({ ngayBatDau: '2026-11-15', kyThanhToan: '2026-11' }), 'Kỳ đầu');
  assert.equal(classifyInvoice({ ngayBatDau: '2026-11-15', kyThanhToan: '2026-12' }), 'Hàng tháng');
});
test('only the signed-in customer is queried and estimates are excluded', async () => {
  let call;
  const rows = await getHoaDonCuaKhach({ vaiTro: 'KhachHang', maNguoiDung: 'KH0001' }, async (text, params) => {
    call = { text, params }; return { recordset: [{ maHoaDon: 'HD0001', kyThanhToan: '2026-11', ngayBatDau: '2026-11-15', tongTien: 1, trangThai: 'Chưa TT' }] };
  });
  assert.equal(call.params[0].value, 'KH0001'); assert.match(call.text, /MaKhachHang = @MaKhachHang/); assert.match(call.text, /<> N'Tạm tính'/);
  assert.equal(rows[0].loai, 'Kỳ đầu');
  await assert.rejects(getHoaDonCuaKhach({ vaiTro: 'NhanVien', maNguoiDung: 'NV0001' }, async () => ({ recordset: [] })), { statusCode: 403 });
});
