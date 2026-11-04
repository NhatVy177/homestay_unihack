import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { statementFromHomeDorm, LOAI_HO_SO_TRA_PHONG } from "../../web/backend/integrations/avalanche/homedorm-adapter.js";

const id = `0x${"ab".repeat(32)}`;
const base = {
  loaiHoSo: LOAI_HO_SO_TRA_PHONG.HOP_DONG_THUE,
  tienCocBanDau: 3000000, tienThueConNo: 100000, tienDichVuConNo: 100000,
  tongChiPhiSuaChua: 200000, tienPhat: 100000,
  ngayBatDau: "2026-01-01", ngayKetThuc: "2027-01-01", ngayTraThucTe: "2026-07-01",
};

describe("HomeDorm settlement adapter", () => {
  it("uses calendar stay months and records policy forfeiture separately from unpaid expenses", () => {
    const early = statementFromHomeDorm(id, 1, { ...base, ngayTraThucTe: "2026-06-01" });
    assert.equal(early.policyRefundPercent, 50);
    assert.equal(early.refundDueVnd, "1000000");
    assert.equal(early.items[0].amountVnd, "1500000");
    assert.equal(early.deductionsVnd, "2000000");
    const later = statementFromHomeDorm(id, 2, base);
    assert.equal(later.policyRefundPercent, 70);
    assert.equal(later.refundDueVnd, "1600000");
  });

  it("represents deposit-only cancellation and a top-up exactly as the app calculates them", () => {
    const cancellation = statementFromHomeDorm(id, 1, {
      ...base, loaiHoSo: LOAI_HO_SO_TRA_PHONG.DAT_COC_CHUA_KY_HOP_DONG,
      ngayBatDau: null, ngayKetThuc: null, ngayTraThucTe: null,
      tienThueConNo: 0, tienDichVuConNo: 0, tongChiPhiSuaChua: 0, tienPhat: 0,
    });
    assert.equal(cancellation.policyRefundPercent, 80);
    assert.equal(cancellation.refundDueVnd, "2400000");
    const debt = statementFromHomeDorm(id, 1, { ...base, ngayTraThucTe: "2027-01-01", tienThueConNo: 3500000 });
    assert.equal(debt.policyRefundPercent, 100);
    assert.equal(debt.refundDueVnd, "0");
    assert.equal(debt.topUpDueVnd, "900000");
  });

  it("rejects fractional or negative VND values before they reach a contract", () => {
    assert.throws(() => statementFromHomeDorm(id, 1, { ...base, tienCocBanDau: 1.2 }));
    assert.throws(() => statementFromHomeDorm(id, 1, { ...base, tienPhat: -1 }));
  });
});
