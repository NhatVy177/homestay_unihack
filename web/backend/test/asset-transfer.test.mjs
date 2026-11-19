import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chuyenTaiSan,
  layLichSuDieuPhoi,
  layTaiSanPhong,
  layTonKho,
  phamViDieuPhoi,
} from '../services/dieuPhoiTaiSan.service.js';

const manager = { vaiTro: 'NhanVien', chucVu: 'Quản lý', maNguoiDung: 'NV0002', maChiNhanh: 'CN0001' };
const admin = { vaiTro: 'Admin', maNguoiDung: 'AD0001' };

const parameters = (list) => Object.fromEntries(list.map((item) => [item.name, item.value]));

test('asset scope: manager is fixed to own branch, admin reads all, other roles get 403', () => {
  assert.deepEqual(phamViDieuPhoi(manager), { admin: false, maChiNhanh: 'CN0001', maNhanVien: 'NV0002' });
  assert.deepEqual(phamViDieuPhoi(admin), { admin: true, maChiNhanh: null, maNhanVien: 'AD0001' });
  assert.deepEqual(phamViDieuPhoi(admin, 'CN0002'), { admin: true, maChiNhanh: 'CN0002', maNhanVien: 'AD0001' });
  assert.throws(() => phamViDieuPhoi(manager, 'CN0002'), (error) => error.statusCode === 403);
  assert.throws(
    () => phamViDieuPhoi({ vaiTro: 'NhanVien', chucVu: 'Sale', maChiNhanh: 'CN0001' }),
    (error) => error.statusCode === 403
  );
});
test('asset reads call the three stored procedures with server-side branch scope', async () => {
  const calls = [];
  const execute = async (name, params) => {
    calls.push({ name, params: parameters(params) });
    return { recordset: [{ name }] };
  };
  assert.equal((await layTonKho(manager, {}, { execute }))[0].name, 'dbo.SP_DieuPhoiTaiSan_DanhSachKho');
  await layTaiSanPhong(manager, { maTaiSan: 'TS0001' }, { execute });
  await layLichSuDieuPhoi(manager, { maTaiSan: 'TS0001', maPhong: 'P101' }, { execute });
  assert.deepEqual(calls, [
    { name: 'dbo.SP_DieuPhoiTaiSan_DanhSachKho', params: { MaChiNhanh: 'CN0001' } },
    { name: 'dbo.SP_DieuPhoiTaiSan_DanhSachPhong', params: { MaChiNhanh: 'CN0001', MaTaiSan: 'TS0001' } },
    { name: 'dbo.SP_DieuPhoiTaiSan_LichSu', params: { MaChiNhanh: 'CN0001', MaTaiSan: 'TS0001', MaPhong: 'P101' } },
  ]);
});

test('manager transfer ignores actor/branch supplied by client and requires quantity and reason', async () => {
  const calls = [];
  const execute = async (name, params) => {
    calls.push({ name, params: parameters(params) });
    return { recordset: [{ maPhieu: 'DCTS00000001' }] };
  };
  const result = await chuyenTaiSan(manager, {
    chiNhanh: 'CN0001', loaiThaoTac: 'phong_kho', maPhongNguon: 'P101',
    maTaiSan: 'TS0001', soLuong: '2', lyDo: 'Thu hồi tài sản dư', maNhanVien: 'NV9999',
  }, { execute });
  assert.equal(result.maPhieu, 'DCTS00000001');
  assert.deepEqual(calls[0], {
    name: 'dbo.SP_DieuPhoiTaiSan_Chuyen',
    params: {
      MaChiNhanh: 'CN0001', LoaiThaoTac: 'PHONG_KHO', MaPhongNguon: 'P101', MaPhongDich: null,
      MaTaiSan: 'TS0001', SoLuong: 2, LyDo: 'Thu hồi tài sản dư', MaNhanVien: 'NV0002',
    },
  });
  await assert.rejects(chuyenTaiSan(manager, { loaiThaoTac: 'PHONG_KHO', maTaiSan: 'TS0001', soLuong: 0, lyDo: 'x' }), /lớn hơn 0/);
  await assert.rejects(chuyenTaiSan(manager, { loaiThaoTac: 'PHONG_KHO', maTaiSan: 'TS0001', soLuong: 1, lyDo: '  ' }), /lý do/);
});

test('admin is read-only and cross-branch manager request is rejected before SQL', async () => {
  let called = false;
  const execute = async () => { called = true; return { recordset: [] }; };
  await layTonKho(admin, {}, { execute });
  assert.equal(called, true);
  called = false;
  await assert.rejects(chuyenTaiSan(admin, { loaiThaoTac: 'KHO_PHONG', maTaiSan: 'TS0001', soLuong: 1, lyDo: 'Bổ sung' }, { execute }),
    (error) => error.statusCode === 403 && /chỉ xem/.test(error.message));
  await assert.rejects(chuyenTaiSan(manager, { chiNhanh: 'CN0002', loaiThaoTac: 'KHO_PHONG', maTaiSan: 'TS0001', soLuong: 1, lyDo: 'Bổ sung' }, { execute }),
    (error) => error.statusCode === 403);
  assert.equal(called, false);
});

