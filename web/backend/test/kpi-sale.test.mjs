import test from 'node:test';
import assert from 'node:assert/strict';
import { baoCaoKpiSale, khoangThang, phamViKpi } from '../services/kpiSale.service.js';

const sale = { vaiTro: 'NhanVien', chucVu: 'Sale', maNguoiDung: 'NV0003', maChiNhanh: 'CN01' };
const manager = { vaiTro: 'NhanVien', chucVu: 'Quản lý', maNguoiDung: 'NV0002', maChiNhanh: 'CN02' };
const admin = { vaiTro: 'Admin', maNguoiDung: 'AD0001' };

test('scope: Sale sees self, manager sees own branch, admin sees all or one branch, others are refused', () => {
  assert.deepEqual(phamViKpi(sale), { maNhanVien: 'NV0003', maChiNhanh: null, admin: false });
  assert.deepEqual(phamViKpi(manager, { chiNhanh: 'CN09' }), { maNhanVien: null, maChiNhanh: 'CN02', admin: false });
  assert.deepEqual(phamViKpi(admin), { maNhanVien: null, maChiNhanh: null, admin: true });
  assert.deepEqual(phamViKpi(admin, { chiNhanh: 'CN01' }), { maNhanVien: null, maChiNhanh: 'CN01', admin: true });
  assert.throws(() => phamViKpi({ vaiTro: 'NhanVien', chucVu: 'Kế toán', maChiNhanh: 'CN01' }), /không có quyền/);
  assert.throws(() => phamViKpi({ vaiTro: 'KhachHang', maNguoiDung: 'KH0001' }), /không có quyền/);
  assert.throws(() => phamViKpi({ vaiTro: 'NhanVien', chucVu: 'Quản lý' }), /không có quyền/);
});

test('month range: first day to first day of next month, December rolls over, empty means all time', () => {
  assert.deepEqual(khoangThang('2026-11'), ['2026-11-01', '2026-12-01']);
  assert.deepEqual(khoangThang('2026-12'), ['2026-12-01', '2027-01-01']);
  assert.deepEqual(khoangThang(''), [null, null]);
  assert.throws(() => khoangThang('2026-13'), /không hợp lệ/);
  assert.throws(() => khoangThang("2026-11'; DROP"), /không hợp lệ/);
});

test('report: rates per Sale, totals, ranking and scope parameters reach SQL', async () => {
  const calls = [];
  const rows = [
    { maNhanVien: 'NV0004', hoTen: 'Bình', soHoSo: 4, soDaXem: 3, soKhongDen: 1, soDatCoc: 1, soHopDong: 1 },
    { maNhanVien: 'NV0003', hoTen: 'An', soHoSo: 5, soDaXem: 4, soKhongDen: 0, soDatCoc: 3, soHopDong: 2 },
    { maNhanVien: 'NV0005', hoTen: 'Chi', soHoSo: 0, soDaXem: 0, soKhongDen: 0, soDatCoc: 0, soHopDong: 0 },
  ];
  const query = async (text, params = []) => {
    calls.push({ text, params: Object.fromEntries(params.map((p) => [p.name, p.value])) });
    return { recordset: text.includes('FROM dbo.ChiNhanh ORDER BY') ? [{ maChiNhanh: 'CN01', tenChiNhanh: 'Quận 1' }] : rows };
  };
  const report = await baoCaoKpiSale(manager, { thang: '2026-11' }, { query });
  assert.equal(report.phamVi, 'chi-nhanh');
  assert.deepEqual(report.rows.map((r) => [r.maNhanVien, r.tyLeDatCoc, r.tyLeChot]), [['NV0003', 60, 40], ['NV0004', 25, 25], ['NV0005', 0, 0]]);
  assert.deepEqual(report.tong, { soHoSo: 9, soDaXem: 7, soKhongDen: 1, soDatCoc: 4, soHopDong: 3, tyLeDatCoc: 44, tyLeChot: 33 });
  assert.deepEqual(calls[0].params, { TuNgay: '2026-11-01', DenNgay: '2026-12-01', MaNhanVien: null, MaChiNhanh: 'CN02' });
  assert.deepEqual(report.danhSachChiNhanh, []);
  assert.equal(calls.length, 1);

  calls.length = 0;
  const own = await baoCaoKpiSale(sale, {}, { query });
  assert.equal(own.phamVi, 'sale');
  assert.deepEqual(calls[0].params, { TuNgay: null, DenNgay: null, MaNhanVien: 'NV0003', MaChiNhanh: null });

  calls.length = 0;
  const all = await baoCaoKpiSale(admin, { chiNhanh: 'CN01' }, { query });
  assert.equal(all.phamVi, 'admin');
  assert.equal(calls[0].params.MaChiNhanh, 'CN01');
  assert.deepEqual(all.danhSachChiNhanh, [{ maChiNhanh: 'CN01', tenChiNhanh: 'Quận 1' }]);

  await assert.rejects(baoCaoKpiSale({ vaiTro: 'KhachHang' }, {}, { query }), /không có quyền/);
});
