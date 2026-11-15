import test from 'node:test';
import assert from 'node:assert/strict';
import {
  nextPeriod, dueDateFor, readingDateFor, periodToBill, statusGroup,
  danhSachHopDong, lapHoaDon, thuTien, themPhiPhatSinh, xoaPhiPhatSinh,
} from '../services/hoaDonDinhKy.service.js';

const keToan = { vaiTro: 'NhanVien', chucVu: 'Kế toán', maNguoiDung: 'NV0008', maChiNhanh: 'CN0002' };
const contractRow = {
  maHopDong: 'HD0002', giaThue: 7200000, soGiuongThue: 1, ngayBatDau: new Date('2026-11-15T00:00:00Z'),
  ngayKetThuc: new Date('2027-11-15T00:00:00Z'), hinhThucThue: 'Nguyên phòng', hoTen: 'demo5', sdt: '0897564321',
  maPhong: 'P103', tenPhong: 'Phòng P103', maChiNhanh: 'CN0002', tenChiNhanh: 'HomeDorm Thủ Đức', giuong: null, kyCuoi: '2026-11',
};

test('period helpers follow the reference rules (next month, due on the 10th but at least 7 days)', () => {
  assert.equal(nextPeriod('2026-11'), '2026-12');
  assert.equal(nextPeriod('2026-12'), '2027-01');
  assert.equal(dueDateFor('2026-12', new Date(2026, 10, 16)), '2027-01-10');
  assert.equal(dueDateFor('2026-11', new Date(2026, 11, 8)), '2026-12-15');
  assert.equal(readingDateFor('2026-11', new Date(2026, 10, 16)), '2026-11-16');
  assert.equal(readingDateFor('2026-10', new Date(2026, 10, 16)), '2026-10-31');
  assert.equal(readingDateFor('2026-12', new Date(2026, 10, 16)), '2026-12-01');
  assert.equal(periodToBill('2026-11', '2026-11-15'), '2026-12');
  assert.equal(periodToBill(null, new Date('2026-11-15T00:00:00Z')), '2026-11');
  assert.equal(statusGroup({ trangThai: 'Đã TT' }, '2026-11-16'), 'paid');
  assert.equal(statusGroup({ trangThai: 'Chưa TT', ngayHanTT: '2026-11-01' }, '2026-11-16'), 'overdue');
  assert.equal(statusGroup({ trangThai: 'Chưa TT', ngayHanTT: '2026-12-10' }, '2026-11-16'), 'pending');
});

test('only accountants of a branch can use periodic invoices', async () => {
  await assert.rejects(danhSachHopDong({ vaiTro: 'NhanVien', chucVu: 'Sale', maChiNhanh: 'CN0002' }, { query: async () => ({ recordset: [] }) }), /kế toán/);
  await assert.rejects(danhSachHopDong({ vaiTro: 'KhachHang', maNguoiDung: 'KH0001' }), /kế toán/);
});

test('contract list shows the next period to bill', async () => {
  const list = await danhSachHopDong(keToan, { query: async () => ({ recordset: [contractRow] }) });
  assert.equal(list[0].kyCanLap, '2026-12');
  assert.equal(list[0].giaThue, 7200000);
});

function detailQuery({ fees = [], current = null, previous = { maPhieuGhi: 'PG0001', kyGhi: '2026-11', dienDau: 0, dienCuoi: 120, nuocDau: 0, nuocCuoi: 8 } } = {}) {
  const calls = [];
  const query = async (text, params) => {
    calls.push({ text, params });
    if (/BEGIN TRAN/.test(text)) return { recordsets: [[{ maHoaDon: 'HO0003', tongTien: 7900000 }]] };
    if (/FROM dbo\.HopDongThue h\s+JOIN dbo\.PhieuDatCoc/.test(text) || /CROSS APPLY \(SELECT TOP 1 c\.MaPhong/.test(text) && /WHERE h\.MaHopDong = @MaHopDong/.test(text)) return { recordset: [contractRow] };
    if (/FROM dbo\.DichVuHopDong d JOIN dbo\.DichVu v/.test(text) && /ORDER BY d\.MaChiTietDVHD/.test(text)) return { recordset: [] };
    if (/FROM dbo\.PhiPhatSinh WHERE MaHopDong/.test(text)) return { recordset: fees };
    if (/KyGhi = @Ky/.test(text) && /SELECT TOP 1/.test(text) && !/BEGIN TRAN/.test(text)) return { recordset: current ? [current] : [] };
    if (/KyGhi < @Ky/.test(text)) return { recordset: previous ? [previous] : [] };
    if (/BEGIN TRAN/.test(text)) return { recordsets: [[{ maHoaDon: 'HO0003', tongTien: 7900000 }]] };
    return { recordset: [] };
  };
  return { query, calls };
}

test('creating an invoice requires readings not below the previous ones and confirmed fees', async () => {
  await assert.rejects(lapHoaDon(keToan, { maHopDong: 'HD0002', chiSoDienMoi: 100, chiSoNuocMoi: 10 }, { query: detailQuery().query }), /điện mới không được nhỏ hơn/);
  await assert.rejects(lapHoaDon(keToan, { maHopDong: 'HD0002', chiSoDienMoi: 150, chiSoNuocMoi: 10 },
    { query: detailQuery({ fees: [{ maPhi: 'PS1', tenPhi: 'Mất thẻ', soTien: 100000, trangThai: 'Chưa xác nhận' }] }).query }), /chưa xác nhận/);
  await assert.rejects(lapHoaDon(keToan, { maHopDong: 'HD0002', kyThanhToan: '2027-01', chiSoDienMoi: 150, chiSoNuocMoi: 10 }, { query: detailQuery().query }), /Kỳ cần lập/);
});

test('creating an invoice writes the reading, invoice, lines and fees in one transaction', async () => {
  const { query, calls } = detailQuery();
  const out = await lapHoaDon(keToan, { maHopDong: 'HD0002', chiSoDienMoi: 205, chiSoNuocMoi: 14 }, { query, today: new Date(2026, 10, 16) });
  assert.deepEqual(out, { maHoaDon: 'HO0003', tongTien: 7900000, kyThanhToan: '2026-12' });
  const tx = calls.find((c) => /BEGIN TRAN/.test(c.text));
  const value = (name) => tx.params.find((p) => p.name === name).value;
  assert.equal(value('DienDau'), 120); assert.equal(value('DienCuoi'), 205);
  assert.equal(value('NuocDau'), 8); assert.equal(value('NuocCuoi'), 14);
  assert.equal(value('Ky'), '2026-12'); assert.equal(value('NgayHanTT'), '2027-01-10');
  assert.match(tx.text, /INSERT dbo\.PhieuGhiChiSo/); assert.match(tx.text, /INSERT dbo\.ChiTietHoaDon/);
  assert.match(tx.text, /UPDATE dbo\.PhiPhatSinh SET TrangThai = N'Đã tính'/);
});

test('collecting payment and fee changes report when nothing matched', async () => {
  await assert.rejects(thuTien(keToan, 'HO0003', { phuongThuc: 'Ví' }), /Phương thức/);
  await assert.rejects(thuTien(keToan, 'HO0003', {}, { query: async () => ({ rowsAffected: [0] }) }), /không còn ở trạng thái chờ thu/);
  assert.equal((await thuTien(keToan, 'HO0003', { phuongThuc: 'Tiền mặt' }, { query: async () => ({ rowsAffected: [1] }) })).trangThai, 'Đã TT');
  await assert.rejects(xoaPhiPhatSinh(keToan, 'PS1', { query: async () => ({ rowsAffected: [0] }) }), /đã được tính/);
  await assert.rejects(themPhiPhatSinh(keToan, { maHopDong: 'HD0002', tenPhi: 'Mất thẻ', soTien: -5 }, { query: detailQuery().query }), /số nguyên dương/);
});
