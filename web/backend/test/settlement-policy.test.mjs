import assert from 'node:assert/strict';
import { test } from 'node:test';
import { policyText } from '../integrations/avalanche/policy.js';
import { docTyLeTuChinhSach, phanLoaiQuyDinh, moTaNguonTyLe } from '../services/chinhSachHoanCoc.service.js';
import { calculateDoiSoatTraPhong, LOAI_HO_SO_TRA_PHONG, TRUONG_HOP_HOAN } from '../services/doiSoatCalculator.service.js';

// Same rule names as the QuyDinhHoanCoc seed (database/GenData/data.sql).
const rules = (rates = [80, 50, 70, 100]) => [
  { TenQuyDinh: 'Đã đặt cọc nhưng chưa ký hợp đồng', TyLeHoanCoc: rates[0] },
  { TenQuyDinh: 'Đã ký hợp đồng, chưa hết hạn, lưu trú dưới 6 tháng', TyLeHoanCoc: rates[1] },
  { TenQuyDinh: 'Đã ký hợp đồng, chưa hết hạn, lưu trú từ 6 tháng trở lên', TyLeHoanCoc: rates[2] },
  { TenQuyDinh: 'Hết hạn thuê theo hợp đồng', TyLeHoanCoc: rates[3] },
];
const contract = { loaiHoSo: LOAI_HO_SO_TRA_PHONG.HOP_DONG_THUE, tienCocBanDau: 3000000,
  ngayBatDau: '2026-01-01', ngayKetThuc: '2026-12-31', tienThueConNo: 0, tienDichVuConNo: 0, tongChiPhiSuaChua: 500000, tienPhat: 0 };

test('D-040: rule names map to the four refund cases; "chưa hết hạn" is not "hết hạn"', () => {
  assert.deepEqual(rules().map(r => phanLoaiQuyDinh(r.TenQuyDinh)),
    [TRUONG_HOP_HOAN.CHUA_KY, TRUONG_HOP_HOAN.DUOI_6_THANG, TRUONG_HOP_HOAN.TU_6_THANG, TRUONG_HOP_HOAN.HET_HAN]);
  assert.equal(phanLoaiQuyDinh('Quy định khác'), null);
});

test('D-040: rates are read back from the exact locked policy text', () => {
  assert.deepEqual(docTyLeTuChinhSach(policyText(rules([75, 40, 60, 95]))),
    { 'chua-ky': 75, 'duoi-6-thang': 40, 'tu-6-thang': 60, 'het-han': 95 });
  const ambiguous = policyText([...rules(), { TenQuyDinh: 'Hết hạn thuê (bản cũ)', TyLeHoanCoc: 90 }]);
  assert.equal('het-han' in docTyLeTuChinhSach(ambiguous), false, 'a case listed twice is not guessed');
  assert.deepEqual(docTyLeTuChinhSach(''), {});
});

test('D-040: the calculator uses the locked rate and reports its source; without a policy it keeps the defaults', () => {
  const locked = docTyLeTuChinhSach(policyText(rules([80, 40, 60, 95])));
  const early = calculateDoiSoatTraPhong({ ...contract, ngayTraThucTe: '2026-03-15', tyLeTheoChinhSach: locked });
  assert.equal(early.truongHopHoan, TRUONG_HOP_HOAN.DUOI_6_THANG);
  assert.equal(early.nguonTyLe, 'chinh-sach');
  assert.equal(early.tyLeHoanCocHienTai, 40);
  assert.equal(early.tienCocDuocHoan, 1200000);
  assert.equal(early.soTienHoanThucTe, 700000);

  const full = calculateDoiSoatTraPhong({ ...contract, ngayTraThucTe: '2026-12-31', tyLeTheoChinhSach: locked });
  assert.equal(full.tyLeHoanCocHienTai, 95);

  const fallback = calculateDoiSoatTraPhong({ ...contract, ngayTraThucTe: '2026-03-15' });
  assert.equal(fallback.nguonTyLe, 'mac-dinh');
  assert.equal(fallback.tyLeHoanCocHienTai, 50);
  assert.match(moTaNguonTyLe(null, fallback).lyDo, /chưa có chính sách/);
  assert.deepEqual(moTaNguonTyLe({ phienBan: 'abcd1234', tyLe: locked }, early),
    { nguon: 'chinh-sach', phienBan: 'abcd1234', truongHop: TRUONG_HOP_HOAN.DUOI_6_THANG });
  assert.match(moTaNguonTyLe({ phienBan: 'abcd1234', tyLe: {} }, fallback).lyDo, /không có dòng rõ ràng/);
});
