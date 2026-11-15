import test from 'node:test';
import assert from 'node:assert/strict';
import { nhomTrangThai, viecCanLam, danhSachHopDongQuanLy } from '../services/quanLyHopDong.service.js';

test('contract buckets and next action for the manager list', () => {
  assert.equal(nhomTrangThai({ trangThai: 'Hiệu lực', daThuKyDau: false }), 'cho-thanh-toan');
  assert.equal(nhomTrangThai({ trangThai: 'Hiệu lực', daThuKyDau: true }), 'hieu-luc');
  assert.equal(nhomTrangThai({ trangThai: 'Hiệu lực', daThuKyDau: true, maPhieuTra: 'TP1', trangThaiPhieuTra: 'Chờ ký biên bản' }), 'tra-phong');
  assert.equal(nhomTrangThai({ trangThai: 'Đã thanh lý', maPhieuTra: 'TP1', trangThaiPhieuTra: 'Hoàn tất' }), 'thanh-ly');
  assert.equal(nhomTrangThai({ trangThai: 'Hết hạn', daThuKyDau: true }), 'het-han');
  assert.equal(viecCanLam({ trangThaiPhieuTra: 'Chờ xử lý', maPhieuTra: 'TP1' }), 'kiem-tra');
  assert.equal(viecCanLam({ trangThaiPhieuTra: 'Chờ ký biên bản', trangThaiDoiSoat: 'Chờ phản hồi', maPhieuTra: 'TP1' }), 'phan-hoi');
  assert.equal(viecCanLam({ trangThaiPhieuTra: 'Hoàn tất', maPhieuTra: 'TP1', daThuChiaKhoa: false, trangThai: 'Đã thanh lý' }), 'ket-thuc');
  assert.equal(viecCanLam({ trangThai: 'Hiệu lực', daThuKyDau: true }), null);
});

test('only branch managers can list contracts', async () => {
  await assert.rejects(danhSachHopDongQuanLy({ vaiTro: 'NhanVien', chucVu: 'Kế toán', maChiNhanh: 'CN1' }), /quản lý chi nhánh/);
  const rows = await danhSachHopDongQuanLy({ vaiTro: 'NhanVien', chucVu: 'Quản lý', maChiNhanh: 'CN1' },
    { query: async () => ({ recordset: [{ maHopDong: 'HD1', trangThai: 'Hiệu lực', daThuKyDau: 1, giaThue: 7200000, daThuChiaKhoa: 0 }] }) });
  assert.deepEqual([rows[0].nhom, rows[0].viecCanLam, rows[0].giaThue], ['hieu-luc', null, 7200000]);
});
