import test from 'node:test';
import assert from 'node:assert/strict';
import { taoYeuCau, tiepNhan, hoanTat, tuChoi, danhSach, theoHopDong, parsePhoto, STATUS, LOAI } from '../services/suaChuaBaoTri.service.js';

const khach = { vaiTro: 'KhachHang', maNguoiDung: 'KH0001' };
const quanLy = { vaiTro: 'NhanVien', chucVu: 'Quản lý', maChiNhanh: 'CN0002', maNguoiDung: 'NV0007' };
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Cơ sở dữ liệu giả: chỉ nhận đúng các câu lệnh service dùng.
function fakeDb({ contracts = [{ maHopDong: 'HD0001', maPhong: 'P101', tenPhong: 'Phòng P101' }], rows = [] } = {}) {
  const log = [], fees = [];
  const query = async (text, params = []) => {
    const p = Object.fromEntries(params.map((x) => [x.name, x.value]));
    log.push({ text, p });
    if (text.includes('FROM dbo.HopDongThue h') && text.includes('OUTER APPLY')) return { recordset: contracts };
    if (text.includes('MAX(TRY_CONVERT')) return { recordset: [{ n: rows.length + 1 }] };
    if (text.startsWith('INSERT')) { rows.push({ maYeuCau: p.Ma, moTa: p.MoTa, anh: p.Anh, trangThai: STATUS.NEW, maHopDong: p.Hd, maPhong: p.Phong, maChiNhanh: 'CN0002', chiPhi: null, loiDoKhach: false }); return { recordset: [] }; }
    if (text.startsWith('UPDATE') || text.startsWith('SET XACT_ABORT')) {
      const row = rows.find((r) => r.maYeuCau === p.Ma);
      if (text.includes(`N'${STATUS.DOING}', NgayTiepNhan`)) row.trangThai = STATUS.DOING;
      else if (text.includes(`N'${STATUS.DONE}'`)) { Object.assign(row, { trangThai: STATUS.DONE, chiPhi: p.ChiPhi, loiDoKhach: p.Loi }); if (p.Loi) fees.push({ maPhi: p.MaPhi, soTien: p.ChiPhi, tenPhi: p.TenPhi, hd: p.Hd }); }
      else if (text.includes(`N'${STATUS.REJECTED}'`)) Object.assign(row, { trangThai: STATUS.REJECTED, ghiChu: p.LyDo });
      return { recordset: [] };
    }
    if (text.includes('WHERE y.MaYeuCau = @Ma')) return { recordset: rows.filter((r) => r.maYeuCau === p.Ma) };
    if (text.includes('WHERE h.MaKhachHang = @Kh')) return { recordset: rows };
    if (text.includes('WHERE ph.MaChiNhanh = @Cn')) return { recordset: rows.filter((r) => r.maChiNhanh === p.Cn) };
    if (text.includes('SELECT 1 AS ok')) return { recordset: p.Kh === 'KH0001' ? [{ ok: 1 }] : [] };
    if (text.includes('WHERE y.MaHopDong = @Hd')) return { recordset: rows.filter((r) => r.maHopDong === p.Hd) };
    throw new Error(`unexpected query: ${text.slice(0, 60)}`);
  };
  return { query, rows, log, fees };
}
const noSave = async (ma, parsed) => parsed.map((_, i) => `/uploads/sua-chua/${ma}-${i + 1}.png`);

test('customer reports damage with photos on their only active contract', async () => {
  const db = fakeDb();
  const item = await taoYeuCau(khach, { loai: LOAI[1], moTa: 'Vòi nước bồn rửa bị rỉ', anh: [png] }, { query: db.query, save: noSave });
  assert.equal(item.maYeuCau, 'SC0001');
  assert.equal(item.maHopDong, 'HD0001');
  assert.deepEqual(item.anh, ['/uploads/sua-chua/SC0001-1.png']);
  assert.equal(item.trangThai, STATUS.NEW);
  assert.equal(db.rows[0].moTa, '[Nước, vòi, bồn cầu] Vòi nước bồn rửa bị rỉ', 'loại lưu ở đầu mô tả');
});

test('validation: description, photo type/count, contract ownership and role', async () => {
  const db = fakeDb();
  await assert.rejects(taoYeuCau(khach, { loai: 'Cửa, khóa', moTa: 'abc' }, { query: db.query, save: noSave }), /ít nhất 5/);
  await assert.rejects(taoYeuCau(khach, { moTa: 'Hỏng khóa cửa' }, { query: db.query, save: noSave }), /loại hư hỏng/);
  await assert.rejects(taoYeuCau(khach, { loai: 'Linh tinh', moTa: 'Hỏng khóa cửa' }, { query: db.query, save: noSave }), /loại hư hỏng/);
  await assert.rejects(taoYeuCau(khach, { loai: 'Cửa, khóa', moTa: 'Hỏng khóa cửa', anh: ['data:text/html;base64,AAAA'] }, { query: db.query, save: noSave }), /PNG, JPG/);
  await assert.rejects(taoYeuCau(khach, { loai: 'Cửa, khóa', moTa: 'Hỏng khóa cửa', anh: [png, png, png, png] }, { query: db.query, save: noSave }), /Tối đa 3/);
  await assert.rejects(taoYeuCau(khach, { loai: 'Cửa, khóa', moTa: 'Hỏng khóa cửa', maHopDong: 'HD9999' }, { query: db.query, save: noSave }), /hợp đồng/);
  await assert.rejects(taoYeuCau(quanLy, { loai: 'Cửa, khóa', moTa: 'Hỏng khóa cửa' }, { query: db.query, save: noSave }), /Chỉ khách hàng/);
  const none = fakeDb({ contracts: [] });
  await assert.rejects(taoYeuCau(khach, { loai: 'Cửa, khóa', moTa: 'Hỏng khóa cửa' }, { query: none.query, save: noSave }), /chưa có hợp đồng/);
  assert.throws(() => parsePhoto(`data:image/png;base64,${'A'.repeat(2.2 * 1024 * 1024)}`), /1,5MB/);
});

test('manager flow: accept, complete with "not the tenant\'s fault", and the contract history shows it', async () => {
  const db = fakeDb();
  await taoYeuCau(khach, { loai: LOAI[0], moTa: 'Bóng đèn phòng tắm không sáng' }, { query: db.query, save: noSave });
  await assert.rejects(hoanTat(quanLy, 'SC0001', {}, { query: db.query }), /đang xử lý/);
  assert.equal((await tiepNhan(quanLy, 'SC0001', {}, { query: db.query })).trangThai, STATUS.DOING);
  await assert.rejects(tiepNhan(quanLy, 'SC0001', {}, { query: db.query }), /đã được tiếp nhận/);
  await assert.rejects(hoanTat(quanLy, 'SC0001', { chiPhi: 50000, loiDoKhach: true }, { query: db.query }), /Ghi rõ lý do/);
  const done = await hoanTat(quanLy, 'SC0001', { chiPhi: 50000, loiDoKhach: false }, { query: db.query });
  assert.deepEqual([done.trangThai, done.chiPhi, done.loiDoKhach], [STATUS.DONE, 50000, false]);
  const history = await theoHopDong(quanLy, 'HD0001', { query: db.query });
  assert.equal(history.length, 1);
  await assert.rejects(theoHopDong({ vaiTro: 'KhachHang', maNguoiDung: 'KH0002' }, 'HD0001', { query: db.query }), /Không tìm thấy/);
});

test('other branch managers cannot act; reject needs a reason; customer lists only theirs', async () => {
  const db = fakeDb();
  await taoYeuCau(khach, { loai: LOAI[3], moTa: 'Cửa sổ kẹt không đóng được' }, { query: db.query, save: noSave });
  await assert.rejects(tiepNhan({ ...quanLy, maChiNhanh: 'CN0003' }, 'SC0001', {}, { query: db.query }), /Không tìm thấy/);
  await assert.rejects(tuChoi(quanLy, 'SC0001', {}, { query: db.query }), /lý do/);
  assert.equal((await tuChoi(quanLy, 'SC0001', { lyDo: 'Trùng yêu cầu trước' }, { query: db.query })).trangThai, STATUS.REJECTED);
  assert.equal((await danhSach(khach, { query: db.query })).length, 1);
  assert.equal((await danhSach(quanLy, { query: db.query })).length, 1);
  await assert.rejects(danhSach({ vaiTro: 'NhanVien', chucVu: 'Sale' }, { query: db.query }), /không có quyền/);
});

test('damage caused by the tenant becomes a confirmed extra fee for the next monthly invoice; normal maintenance does not', async () => {
  const db = fakeDb();
  await taoYeuCau(khach, { loai: LOAI[1], moTa: 'Vỡ bồn rửa' }, { query: db.query, save: noSave });
  await taoYeuCau(khach, { loai: LOAI[0], moTa: 'Bóng đèn cháy' }, { query: db.query, save: noSave });
  await tiepNhan(quanLy, 'SC0001', {}, { query: db.query });
  await tiepNhan(quanLy, 'SC0002', {}, { query: db.query });
  await assert.rejects(hoanTat(quanLy, 'SC0001', { chiPhi: 0, loiDoKhach: true, ghiChu: 'Khách làm rơi đồ' }, { query: db.query }), /Nhập chi phí sửa/);
  await assert.rejects(hoanTat(quanLy, 'SC0001', { chiPhi: 1500.5, loiDoKhach: true, ghiChu: 'Khách làm rơi đồ' }, { query: db.query }), /số nguyên/);
  await hoanTat(quanLy, 'SC0001', { chiPhi: 350000, loiDoKhach: true, ghiChu: 'Khách làm rơi đồ' }, { query: db.query });
  await hoanTat(quanLy, 'SC0002', { chiPhi: 30000, loiDoKhach: false }, { query: db.query });
  assert.equal(db.fees.length, 1, 'chỉ hư hỏng do khách mới thành phí');
  assert.deepEqual([db.fees[0].maPhi, db.fees[0].soTien, db.fees[0].hd], ['SC-SC0001', 350000, 'HD0001']);
  assert.match(db.fees[0].tenPhi, /^Sửa chữa SC0001 \(Nước, vòi, bồn cầu\): Vỡ bồn rửa/);
});
