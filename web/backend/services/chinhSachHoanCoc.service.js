import { sql } from '../database/connection.js';
import { TRUONG_HOP_HOAN } from './doiSoatCalculator.service.js';

// D-040: the refund rate at settlement comes from the policy locked on the tenant's deposit slip
// (DepositPolicySnapshot, written by policyText() in integrations/avalanche/policy.js), not from
// today's QuyDinhHoanCoc table. Lines look like "- <TenQuyDinh>: hoàn <n>% tiền cọc."
const DONG_TY_LE = /^- (.+): hoàn (\d+(?:[.,]\d+)?)% tiền cọc\.$/;

/** Maps a rule name to its refund case; null when the name does not say which case it is. */
export function phanLoaiQuyDinh(ten) {
  const s = String(ten || '').toLowerCase();
  if (/dưới\s*6\s*tháng/.test(s)) return TRUONG_HOP_HOAN.DUOI_6_THANG;
  if (/từ\s*6\s*tháng/.test(s)) return TRUONG_HOP_HOAN.TU_6_THANG;
  if (/chưa\s+ký/.test(s)) return TRUONG_HOP_HOAN.CHUA_KY;
  if (/hết\s+hạn/.test(s) && !/chưa\s+hết\s+hạn/.test(s)) return TRUONG_HOP_HOAN.HET_HAN;
  return null;
}

/** Rates per refund case read from the locked policy text. A case named twice is left out (ambiguous). */
export function docTyLeTuChinhSach(text) {
  const tyLe = {};
  const trung = new Set();
  for (const line of String(text || '').split('\n')) {
    const match = DONG_TY_LE.exec(line.trim());
    if (!match) continue;
    const key = phanLoaiQuyDinh(match[1]);
    if (!key) continue;
    if (key in tyLe) trung.add(key);
    tyLe[key] = Number(match[2].replace(',', '.'));
  }
  for (const key of trung) delete tyLe[key];
  return tyLe;
}

/** Locked policy of a deposit slip: { phienBan, tyLe } or null when the slip has no captured text yet. */
export async function layChinhSachDaKhoa(maPhieuDatCoc, db) {
  if (!maPhieuDatCoc) return null;
  let result;
  try {
    result = await db.request()
      .input('id', sql.VarChar(6), String(maPhieuDatCoc))
      .query('SELECT PolicyText AS text, PolicyVersion AS version FROM dbo.DepositPolicySnapshot WHERE DepositId=@id');
  } catch (error) {
    // Database without the C1 migration: settle with the default rates and say so on screen.
    if (/Invalid object name/i.test(error.message)) return null;
    throw error;
  }
  const row = result.recordset[0];
  if (!row?.text) return null;
  return { phienBan: row.version, tyLe: docTyLeTuChinhSach(row.text) };
}

/** What the accountant screen shows about where the rate came from. */
export function moTaNguonTyLe(chinhSach, ketQua) {
  if (ketQua?.nguonTyLe === 'chinh-sach') return { nguon: 'chinh-sach', phienBan: chinhSach.phienBan, truongHop: ketQua.truongHopHoan };
  if (!chinhSach) return { nguon: 'mac-dinh', lyDo: 'Phiếu cọc chưa có chính sách đã khóa; dùng tỷ lệ mặc định.' };
  return { nguon: 'mac-dinh', phienBan: chinhSach.phienBan,
    lyDo: 'Chính sách đã khóa không có dòng rõ ràng cho trường hợp này; dùng tỷ lệ mặc định.' };
}
