import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkProfileEditable, checkRoomCanJoin, MAX_INTERESTED_ROOMS } from '../services/interestedRoomsRules.js';

test('D-043: hồ sơ chờ tiếp nhận hoặc đã tiếp nhận, chưa có lịch, thì sửa được danh sách phòng', () => {
  assert.equal(checkProfileEditable({ trangThai: 'Chờ tiếp nhận', coLichXemConHieuLuc: false }), '');
  assert.equal(checkProfileEditable({ trangThai: 'Đã tiếp nhận', coLichXemConHieuLuc: false }), '');
});

test('D-043: đã có lịch xem còn hiệu lực hoặc sai trạng thái thì không sửa được', () => {
  assert.match(checkProfileEditable({ trangThai: 'Đã tiếp nhận', coLichXemConHieuLuc: true }), /lập lịch xem phòng/);
  assert.match(checkProfileEditable({ trangThai: 'Từ chối', coLichXemConHieuLuc: false }), /không còn ở trạng thái/);
  assert.match(checkProfileEditable({ trangThai: 'Xác nhận cọc', coLichXemConHieuLuc: false }), /không còn ở trạng thái/);
});

test('D-043: phòng đầu tiên luôn thêm được, phòng cùng chi nhánh thêm được', () => {
  assert.equal(checkRoomCanJoin([], { maPhong: 'P101', maChiNhanh: 'CN0001' }), '');
  assert.equal(checkRoomCanJoin([{ maPhong: 'P101', maChiNhanh: 'CN0001' }], { maPhong: 'P102', maChiNhanh: 'CN0001' }), '');
});

test('D-043: trùng phòng, khác chi nhánh, quá giới hạn đều bị từ chối', () => {
  const one = [{ maPhong: 'P101', maChiNhanh: 'CN0001' }];
  assert.match(checkRoomCanJoin(one, { maPhong: 'P101', maChiNhanh: 'CN0001' }), /đã có trong hồ sơ/);
  assert.match(checkRoomCanJoin(one, { maPhong: 'P201', maChiNhanh: 'CN0002' }), /chi nhánh khác/);
  const full = Array.from({ length: MAX_INTERESTED_ROOMS }, (_, i) => ({ maPhong: `P10${i}`, maChiNhanh: 'CN0001' }));
  assert.match(checkRoomCanJoin(full, { maPhong: 'P199', maChiNhanh: 'CN0001' }), /tối đa/);
});
