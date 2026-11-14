import test from 'node:test';
import assert from 'node:assert/strict';
import { cachTinhCoc, cachTinhCocDuKien, SO_THANG_COC } from '../services/tienCoc.js';

test('deposit is one month of rent times two, grouped by unit price', () => {
  assert.equal(SO_THANG_COC, 2);
  assert.deepEqual(cachTinhCoc([{ maGiuong: 'G1', giaThue: 1400000 }, { maGiuong: 'G2', giaThue: 1400000 }]),
    { soThang: 2, dong: [{ donGia: 1400000, soLuong: 2, donVi: 'giường' }], motThang: 2800000, tong: 5600000 });
  assert.deepEqual(cachTinhCoc([{ maGiuong: null, giaThue: 3000000 }]).dong, [{ donGia: 3000000, soLuong: 1, donVi: 'phòng' }]);
  assert.equal(cachTinhCoc([{ maGiuong: 'G1', giaThue: null }]), null);
});

test('manager preview uses room-type prices and the chosen beds', () => {
  const prices = { giaTheoGiuong: 1400000, giaNguyenPhong: 5000000 };
  assert.equal(cachTinhCocDuKien({ hinhThucThue: 'Ghép giường', danhSachGiuong: 'G1, G2,G3', ...prices }).tong, 1400000 * 3 * 2);
  assert.equal(cachTinhCocDuKien({ hinhThucThue: 'Nguyên phòng', danhSachGiuong: 'G1', ...prices }).tong, 10000000);
  assert.equal(cachTinhCocDuKien({ hinhThucThue: 'Ghép giường', danhSachGiuong: '', ...prices }), null);
});

import { getDanhSachChoXacNhan } from '../services/datCoc.service.js';
test('manager queue rows carry the expected deposit computed from room-type prices', async () => {
  const rows = await getDanhSachChoXacNhan('NV0004', {
    run: async () => ({ recordset: [{ maDangKy: 'DK0001', maPhong: 'P101', hinhThucThue: 'Ghép giường', danhSachGiuong: 'G1,G2' }, { maDangKy: 'DK0002' }] }),
    query: async (_text, params) => { assert.equal(params[0].value, 'P101'); return { recordset: [{ maPhong: 'P101', giaTheoGiuong: 1400000, giaNguyenPhong: 5000000 }] }; },
  });
  assert.equal(rows[0].tienCocDuKien.tong, 5600000);
  assert.equal(rows[1].tienCocDuKien, null);
});
