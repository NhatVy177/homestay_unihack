import test from 'node:test';
import assert from 'node:assert/strict';
import { tomTatBanGiaoVao } from '../services/khachMoi.service.js';

test('handover summary for the tenant: latest move-in record, manager, general note and per-item notes', async () => {
  const seen = [];
  const query = async (text, params) => { seen.push({ text, params }); return { recordset: [{ maBienBan: 'BB0007' }] }; };
  const chiTiet = async (ma) => ({
    bienBan: { MaBienBan: ma, NgayBanGiao: '2026-11-18', HoTenNhanVienQuanLy: 'Trần Quản Lý', GhiChuChung: '  Phòng sạch  ' },
    taiSan: [
      { MaTaiSan: 'TS0001', GhiChu: 'Trầy nhẹ chân giường', TinhTrang: 'Dùng được' },
      { MaTaiSan: 'TS0002', GhiChu: '', TinhTrang: 'Tốt' },
      { MaTaiSan: 'TS0001', GhiChu: 'Thiếu 1 ốc', TinhTrang: 'Hư hỏng' },
      { MaTaiSan: 'TS0003', GhiChu: '', TinhTrang: null },
    ],
  });
  const summary = await tomTatBanGiaoVao('HD0003', { query, chiTiet });
  assert.deepEqual(summary, {
    maBienBan: 'BB0007', ngayBanGiao: '2026-11-18', quanLy: 'Trần Quản Lý', ghiChuChung: 'Phòng sạch',
    ghiChuTaiSan: { TS0001: 'Trầy nhẹ chân giường; Thiếu 1 ốc' },
    // Cùng mã tài sản ở nhiều giường: lấy mức xấu nhất; biên bản cũ chưa ghi nhận thì không có mục.
    tinhTrangTaiSan: { TS0001: 'Hư hỏng', TS0002: 'Tốt' },
  });
  assert.match(seen[0].text, /LoaiBanGiao = N'Bàn giao vào'/);
  assert.equal(seen[0].params[0].value, 'HD0003');
});

test('handover summary is empty when there is no contract or no move-in record yet', async () => {
  const none = async () => ({ recordset: [] });
  const chiTiet = async () => { throw new Error('must not be called'); };
  assert.equal(await tomTatBanGiaoVao(null, { query: none, chiTiet }), null);
  assert.equal(await tomTatBanGiaoVao('HD0003', { query: none, chiTiet }), null);
  assert.equal(await tomTatBanGiaoVao('HD0003', { query: async () => ({ recordset: [{ maBienBan: 'BB0001' }] }), chiTiet: async () => ({}) }), null);
});
