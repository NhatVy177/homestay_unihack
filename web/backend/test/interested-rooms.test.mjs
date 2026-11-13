import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isUnderAdultAge } from '../services/customerAgeRules.js';
import { coTheQuanTam, tinhTrangThaiQuanTam } from '../services/phongKhamPha.service.js';

test('D-042: phòng còn giường trống thì cho quan tâm', () => {
  assert.equal(tinhTrangThaiQuanTam(2, 0), 'Còn trống');
  assert.equal(tinhTrangThaiQuanTam(1, 3), 'Còn trống');
  assert.equal(coTheQuanTam('Còn trống'), true);
});

test('D-042: hết giường trống nhưng đang chờ cọc vẫn cho quan tâm', () => {
  assert.equal(tinhTrangThaiQuanTam(0, 1), 'Đang chờ cọc');
  assert.equal(coTheQuanTam('Đang chờ cọc'), true);
});

test('D-042: hết hẳn thì không cho quan tâm', () => {
  assert.equal(tinhTrangThaiQuanTam(0, 0), 'Hết chỗ');
  assert.equal(tinhTrangThaiQuanTam(undefined, undefined), 'Hết chỗ');
  assert.equal(coTheQuanTam('Hết chỗ'), false);
});

test('D-042: dưới 18 tuổi bị chặn, đủ 18 tuổi qua', () => {
  const today = new Date(2026, 10, 13); // 13/11/2026
  assert.equal(isUnderAdultAge('2008-11-14', today), true);
  assert.equal(isUnderAdultAge('2008-11-13', today), false);
  assert.equal(isUnderAdultAge('2008-12-01', today), true);
  assert.equal(isUnderAdultAge('2000-01-01', today), false);
  assert.equal(isUnderAdultAge('', today), false);
  assert.equal(isUnderAdultAge('không phải ngày', today), false);
});
