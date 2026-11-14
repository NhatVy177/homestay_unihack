import test from 'node:test';
import assert from 'node:assert/strict';
import { checkResidentsGender, checkRoomGender, loaiGioiTinhHoSo } from '../services/genderRules.js';
import { khachGuiYeuCauGiuCho } from '../services/khachGiuCho.service.js';
import { khaiCuTru } from '../services/khachCuTru.service.js';

test('profile gender comes from the male/female counts first, then the stated gender', () => {
  assert.equal(loaiGioiTinhHoSo({ soNam: 1, soNu: 0 }), 'Nam');
  assert.equal(loaiGioiTinhHoSo({ soNam: 0, soNu: 2 }), 'Nữ');
  assert.equal(loaiGioiTinhHoSo({ soNam: 1, soNu: 1 }), 'Hỗn hợp');
  assert.equal(loaiGioiTinhHoSo({ gioiTinh: 'Nữ' }), 'Nữ');
  assert.equal(loaiGioiTinhHoSo({ gioiTinh: 'Khác' }), null);
});

test('a room locked to one gender rejects other genders and mixed groups; empty rooms accept everyone', () => {
  assert.equal(checkRoomGender('Nam', 'Không phân biệt', 'Phòng 1'), '');
  assert.equal(checkRoomGender('Hỗn hợp', 'Không phân biệt', 'Phòng 1'), '');
  assert.equal(checkRoomGender('Nam', 'Nam', 'Phòng 1'), '');
  assert.match(checkRoomGender('Nữ', 'Nam', 'Phòng P202'), /Phòng P202 chỉ dành cho Nam/);
  assert.match(checkRoomGender('Hỗn hợp', 'Nữ', 'Phòng 2'), /không phân biệt giới tính/);
  assert.equal(checkRoomGender(null, 'Nam', 'Phòng 3'), '', 'chưa rõ giới tính thì không chặn');
});

test('residents may not exceed the registered male/female counts', () => {
  const people = (...genders) => genders.map((gioiTinh) => ({ gioiTinh }));
  assert.equal(checkResidentsGender(people('Nam'), { soNam: 1, soNu: 0 }), '');
  assert.match(checkResidentsGender(people('Nữ'), { soNam: 1, soNu: 0 }), /không khớp phiếu đăng ký \(1 nam, 0 nữ\)/);
  assert.equal(checkResidentsGender(people('Nam', 'Nữ'), { soNam: 1, soNu: 1 }), '');
  assert.equal(checkResidentsGender(people('Nữ'), { soNam: 0, soNu: 0 }), '', 'phiếu cũ không có số nam/nữ thì bỏ qua');
});

const khach = { vaiTro: 'KhachHang', maNguoiDung: 'KH0001' };
test('hold request is rejected for a room locked to another gender before touching the procedures', async () => {
  const query = async (text) => text.includes('FROM dbo.Phong')
    ? { recordset: [{ tenPhong: 'Phòng P202', gioiTinhChoPhep: 'Nam' }] }
    : { recordset: [{ maDangKy: 'DK0007', maNhanVienSale: 'NV0001', trangThai: 'Đã tiếp nhận', soNam: 0, soNu: 1 }] };
  const run = async () => { throw new Error('must not run'); };
  await assert.rejects(khachGuiYeuCauGiuCho(khach, { maDangKy: 'DK0007', maPhong: 'P205', hinhThucThue: 'Nguyên phòng' }, { query, run }), { statusCode: 409 });
});

test('residence declaration is rejected when a resident gender disagrees with the registration', async () => {
  const member = { hoTen: 'Lan', ngaySinh: '2000-01-01', gioiTinh: 'Nữ', cccd: '012345678901', sdt: '0900000000', quocTich: 'Việt Nam' };
  const repo = { luuHoSoCuTru: async () => { throw new Error('must not save'); }, guiDuyetHoSoCuTru: async () => null };
  await assert.rejects(khaiCuTru(khach, { maPhieuDatCoc: 'DC0003', dongYCungCapThongTin: true, danhSachThanhVien: [member] },
    { query: async () => ({ recordset: [{ maNhanVienSale: 'NV0001', soNam: 1, soNu: 0 }] }), repo }), { statusCode: 409 });
});
