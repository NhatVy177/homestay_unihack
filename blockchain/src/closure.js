import { sha256, stringToHex } from 'viem';
import { canonicalize, verifyEvidence } from './evidence.js';

export const CLOSURE_SCHEMA = 'homestaydorm.closure.v1';
export const WEB2_NOTICE = 'Thông tin do bên cho thuê ghi nhận, không nằm trên chuỗi.';
export const closureDigest = value => sha256(stringToHex(canonicalize(value)));

export function createClosureEvidence(web2, chainRecords = {}) {
  return { schema: CLOSURE_SCHEMA, web2, web2Digest: closureDigest(web2), chainRecords };
}

// The Web2 digest detects accidental edits, not a merchant identity/signature.
// Only the original handover/settlement documents have a chain commitment.
export async function verifyClosureEvidence(client, deployment, bundle) {
  try {
    const w = bundle?.web2;
    if (bundle?.schema !== CLOSURE_SCHEMA || !w || !['accepted', 'without-consent'].includes(w.mode)
      || !/^[A-Za-z0-9]{1,6}$/.test(w.contractId || '') || !w.closedAt
      || w.notice !== WEB2_NOTICE || closureDigest(w) !== bundle.web2Digest) {
      return { valid: false, reason: 'Gói kết thúc thiếu dữ liệu hoặc phần Web2 đã bị sửa.' };
    }
    if (!Array.isArray(w.paymentProofs) || w.paymentProofs.some(p => !/^[a-f0-9]{64}$/i.test(p.sha256 || '')
      || !['refund', 'top-up'].includes(p.direction) || !/^\d+$/.test(p.amountVnd || '') || !p.paidAt)) {
      return { valid: false, reason: 'Thông tin chứng từ chi/thu không hợp lệ.' };
    }
    const results = {};
    for (const kind of ['handover', 'settlement']) {
      const original = bundle.chainRecords?.[kind];
      if (!original) continue;
      results[kind] = await verifyEvidence(client, deployment, original);
      if (!results[kind].valid || results[kind].kind !== kind) {
        return { valid: false, reason: `Không đối chiếu được bản ${kind === 'handover' ? 'bàn giao' : 'đối soát'}: ${results[kind].reason || 'sai loại bằng chứng'}` };
      }
    }
    if (bundle.chainRecords?.handover && bundle.chainRecords?.settlement
      && bundle.chainRecords.handover.agreementId !== bundle.chainRecords.settlement.agreementId) {
      return { valid: false, reason: 'Hai bản xác nhận không thuộc cùng hồ sơ.' };
    }
    if (w.mode === 'accepted' && (!results.handover?.accepted || !results.settlement?.accepted || results.settlement.superseded)) {
      return { valid: false, reason: 'Thiếu bản bàn giao và đối soát mới nhất được khách xác nhận trên chuỗi.' };
    }
    return { valid: true, kind: 'closure', mode: w.mode, web2Only: !Object.keys(results).length,
      chainResults: results, notice: WEB2_NOTICE, merchantAuthentication: false };
  } catch (error) {
    return { valid: false, reason: `Không kiểm tra được gói kết thúc: ${error.message}` };
  }
}
