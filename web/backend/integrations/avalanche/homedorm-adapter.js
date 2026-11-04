import { calculateDoiSoatTraPhong, LOAI_HO_SO_TRA_PHONG } from "../../services/doiSoatCalculator.service.js";
import { amount, bytes32, validateStatement } from "@homestaydorm/settlement/evidence";

function vnd(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${name} must be a nonnegative integer amount of VND.`);
  return value.toString();
}

/** Builds a public, PII-free settlement snapshot from the same calculator used by HomeDorm. */
export function statementFromHomeDorm(agreementId, version, input) {
  bytes32(agreementId, "agreementId");
  if (!Number.isInteger(version) || version < 1 || version > 0xffffffff) throw new Error("Invalid version.");
  const result = calculateDoiSoatTraPhong(input);
  const depositHeld = Number(input.tienCocBanDau);
  vnd(depositHeld, "tienCocBanDau");
  const refundable = result.tienCocDuocHoan;
  vnd(refundable, "tienCocDuocHoan");
  if (refundable > depositHeld) throw new Error("Eligible refund exceeds deposit held.");
  const items = [
    { category: "policy-forfeiture", description: "Phần cọc không được hoàn theo tỷ lệ", amountVnd: vnd(depositHeld - refundable, "policyForfeiture") },
    { category: "rent-debt", description: "Tiền thuê còn nợ", amountVnd: vnd(result.tienThueConNo, "tienThueConNo") },
    { category: "service-debt", description: "Tiền dịch vụ còn nợ", amountVnd: vnd(result.tienDichVuConNo, "tienDichVuConNo") },
    { category: "repair", description: "Chi phí sửa chữa", amountVnd: vnd(result.tongChiPhiSuaChua, "tongChiPhiSuaChua") },
    { category: "penalty", description: "Tiền phạt", amountVnd: vnd(result.tienPhat, "tienPhat") },
  ];
  const deductions = items.reduce((sum, item) => sum + amount(item.amountVnd), 0n);
  const payload = {
    schema: "homestaydorm.settlement.v1", agreementId, version,
    depositHeldVnd: vnd(depositHeld, "tienCocBanDau"),
    policyRefundPercent: result.tyLeHoanCocHienTai,
    stayMonths: result.soThangLuuTru,
    items,
    deductionsVnd: deductions.toString(),
    refundDueVnd: vnd(result.soTienHoanThucTe, "soTienHoanThucTe"),
    topUpDueVnd: vnd(result.soTienKhachPhaiTT, "soTienKhachPhaiTT"),
  };
  validateStatement(payload);
  return payload;
}

export { LOAI_HO_SO_TRA_PHONG };
