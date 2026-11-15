import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGroupMembers } from '../services/groupMembers.js';
import { getCuTruCuaKhach } from '../services/khachCuTru.service.js';

const note = 'Thời gian xem mong muốn: ngày 01/12/2026, Buổi chiều.\nNhóm 2 người: 1) Nguyễn Văn A (Nam, 0901234567, CCCD 012345678901) - người đại diện; 2) Trần Thị B (Nữ, 0911111111, CCCD 098765432109).\nCần chỗ để xe';

test('group members written by the registration form are read back', () => {
  assert.deepEqual(parseGroupMembers(note), [
    { hoTen: 'Nguyễn Văn A', gioiTinh: 'Nam', soDienThoai: '0901234567', cccd: '012345678901', ngaySinh: '', daiDien: true },
    { hoTen: 'Trần Thị B', gioiTinh: 'Nữ', soDienThoai: '0911111111', cccd: '098765432109', ngaySinh: '', daiDien: false },
  ]);
});
test('birth date written as "sinh dd/mm/yyyy" is read back as ISO', () => {
  const [member] = parseGroupMembers('Nhóm 2 người: 1) An (Nam, 0901234567, CCCD 012345678901, sinh 05/03/2003) - người đại diện; 2) Bình (Nữ, 0911111111, CCCD 098765432109).');
  assert.equal(member.ngaySinh, '2003-03-05');
});
test('notes without a group line or with a broken one never throw', () => {
  assert.deepEqual(parseGroupMembers('Phòng quan tâm: Phòng 101.'), []);
  assert.deepEqual(parseGroupMembers(null), []);
  assert.deepEqual(parseGroupMembers('Nhóm 2 người: lung tung'), []);
});
test('the residence list exposes the registered group but not the raw note', async () => {
  const replies = [
    { recordset: [{ maPhieuDatCoc: 'DC0003', maHoSoCuTru: null, trangThaiHoSo: 'Chưa cập nhật', coHopDong: false, ghiChuDangKy: note }] },
    { recordset: [{ hoTen: 'Nguyễn Văn A' }] }];
  const out = await getCuTruCuaKhach({ vaiTro: 'KhachHang', maNguoiDung: 'KH0001' }, { query: async () => replies.shift() });
  assert.equal(out.phieu[0].thanhVienDangKy.length, 2);
  assert.equal('ghiChuDangKy' in out.phieu[0], false);
});
