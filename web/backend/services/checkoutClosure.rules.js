import { createServiceError } from './serviceErrors.js';

export const DAY = 24 * 60 * 60 * 1000;
const awaiting = new Set(['review', 'handover-pending', 'settlement-pending']);
export function waitingResponse(c) {
  if (!c || !awaiting.has(c.state)) return null;
  const settlement = c.state === 'settlement-pending';
  const last = settlement ? c.versions?.at(-1) : c.drafts?.at(-1);
  const sentAt = settlement ? last?.bundle?.receipt?.at : last?.publishedAt;
  const token = settlement ? `settlement:${last?.bundle?.version}` : `handover:${last?.revision}`;
  return sentAt && Number.isFinite(Date.parse(sentAt)) ? { phase: settlement ? 'settlement' : 'handover', token, sentAt } : null;
}

export function responseState(c, now = Date.now()) {
  const waiting = waitingResponse(c);
  if (!waiting) return { waiting: false, overdue: false, reminders: [] };
  const elapsed = now - Date.parse(waiting.sentAt);
  return { ...waiting, waiting: true, overdue: elapsed >= 7 * DAY,
    reminders: [24, 72].filter(hours => elapsed >= hours * 3600000) };
}

export function exceptionEligibility(c, now = Date.now()) {
  if (!c || c.pending) return { allowed: false, reason: 'Chưa có mốc gửi hồ sơ hợp lệ hoặc còn giao dịch đang chờ.' };
  if (c.state === 'disputed') return { allowed: true, reason: 'Đối soát đang bị phản đối.' };
  const response = responseState(c, now);
  return response.overdue ? { allowed: true, reason: 'Đã quá 7 ngày kể từ lần gửi hiện tại.' }
    : { allowed: false, reason: 'Chưa quá 7 ngày và đối soát không ở trạng thái bị phản đối.' };
}

export function moneyState(row, paymentProof) {
  const refund = Number(row?.refundDueVnd ?? 0), topUp = Number(row?.topUpDueVnd ?? 0);
  const missing = [];
  if (![refund, topUp].every(n => Number.isSafeInteger(n) && n >= 0) || refund > 0 && topUp > 0) {
    return { ready: false, missing: ['Số tiền đối soát không hợp lệ; cần kế toán kiểm tra.'] };
  }
  if (!row?.settlementId) missing.push('Chưa có bảng đối soát.');
  const amount = refund || topUp;
  if (amount) {
    if (row.paymentStatus !== 'Đã quyết toán') missing.push(refund ? `Chưa chi đủ ${refund.toLocaleString('vi-VN')} đ hoàn cọc.` : `Chưa thu đủ ${topUp.toLocaleString('vi-VN')} đ.`);
    if (!row.paidAt) missing.push('Chưa có thời điểm ghi nhận thu/chi.');
    if (!paymentProof?.sha256 || paymentProof.amountVnd !== String(amount)
      || paymentProof.direction !== (refund ? 'refund' : 'top-up')) missing.push('Chưa có chứng từ chi/thu hợp lệ và mã băm đối chiếu.');
  }
  return { ready: missing.length === 0, missing, refundDueVnd: String(refund), topUpDueVnd: String(topUp) };
}

export function assertAccess(user, row, role) {
  if (!row) throw createServiceError('Không tìm thấy hồ sơ trả phòng.', 404);
  const customer = !role && user?.vaiTro === 'KhachHang' && user.maNguoiDung === row.customerId;
  const staff = user?.vaiTro === 'NhanVien' && (role ? user.chucVu === role : ['Quản lý', 'Kế toán'].includes(user.chucVu))
    && user.maChiNhanh && user.maChiNhanh === row.branchId;
  if (!customer && !staff) throw createServiceError('Hồ sơ không thuộc quyền truy cập của bạn.', 403);
}
