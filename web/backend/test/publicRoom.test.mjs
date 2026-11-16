import test from 'node:test';
import assert from 'node:assert/strict';
import { toPublicRoomDetail } from '../models/publicRoom.dto.js';

test('public room detail includes images, amenities and service prices while excluding private/internal fields', () => {
  const room = toPublicRoomDetail({
    maPhong: 'P101', tenPhong: 'Phòng thử', giaThue: 2200000, sucChua: 2,
    maKhachHang: 'PRIVATE', nguoiDangO: [{ hoTen: 'PRIVATE' }], tinhTrang: 'PRIVATE',
    hinhAnh: [{ stt: 1, urlAnh: '/images/test.jpg', privateNote: 'PRIVATE' }],
    tienNghi: [{ maTaiSan: 'TS01', tenTaiSan: 'Giường', soLuong: 2, donGia: 999999, nguoiPhuTrach: 'PRIVATE' }],
    dichVuUocTinh: [{ maDichVu: 'DV01', tenDichVu: 'Điện', donGia: 3500, donViTinh: 'kWh', internalNote: 'PRIVATE' }],
  });
  assert.equal(room.tenPhong, 'Phòng thử');
  assert.equal(room.giaThue, 2200000);
  assert.deepEqual(room.hinhAnh, [{ stt: 1, urlAnh: '/images/test.jpg' }]);
  assert.deepEqual(room.tienNghi, [{ maTaiSan: 'TS01', tenTaiSan: 'Giường', soLuong: 2 }]);
  assert.deepEqual(room.dichVuUocTinh, [{ maDichVu: 'DV01', tenDichVu: 'Điện', donGia: 3500, donViTinh: 'kWh' }]);
  assert.ok(!JSON.stringify(room).includes('PRIVATE'));
  assert.ok(!('donGia' in room.tienNghi[0]));
});

test('missing rooms stay missing; absent lists do not invent details', () => {
  assert.equal(toPublicRoomDetail(null), null);
  assert.deepEqual(toPublicRoomDetail({ maPhong: 'P101' }), { maPhong: 'P101', hinhAnh: [], tienNghi: [], dichVuUocTinh: [] });
});
