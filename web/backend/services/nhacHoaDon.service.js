import { executeQuery, sql } from '../database/connection.js';
import { createMailer } from '../integrations/mail/mailer.js';

// Nhắc khách thanh toán hóa đơn định kỳ trước hạn (mặc định 3 ngày) qua email. Mỗi hóa đơn chỉ nhắc một lần: dùng bảng
// dbo.DepositMailEvent sẵn có làm sổ chống gửi trùng (khóa invoice-reminder:<mã hóa đơn>). Hóa đơn kỳ đầu đã có
// nhacThuDauKy riêng nên bỏ qua ở đây.
const DAYS_BEFORE = 3;
const appOrigin = () => (process.env.AVALANCHE_APP_ORIGIN || process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');
const money = (amount) => `${Number(amount).toLocaleString('vi-VN')} đ`;
const date = (value) => (value ? new Date(value).toLocaleDateString('vi-VN', { timeZone: 'UTC' }) : '');

export async function hoaDonSapDenHan({ query = executeQuery, days = DAYS_BEFORE } = {}) {
  const result = await query(`SELECT h.MaHoaDon AS id, h.KyThanhToan AS ky, h.NgayHanTT AS han, h.TongTien AS tongTien, h.MaHopDong AS maHopDong,
      nd.HoTen AS hoTen, nd.Email AS email
    FROM dbo.HoaDon h
    JOIN dbo.HopDongThue hd ON hd.MaHopDong = h.MaHopDong
    JOIN dbo.NguoiDung nd ON nd.MaNguoiDung = hd.MaKhachHang
    WHERE h.TrangThai <> N'Đã TT' AND hd.TrangThai = N'Hiệu lực'
      AND h.KyThanhToan <> CONVERT(char(7), hd.NgayBatDau, 120)
      AND CAST(h.NgayHanTT AS DATE) BETWEEN CAST(GETDATE() AS DATE) AND DATEADD(DAY, @Days, CAST(GETDATE() AS DATE))`,
  [{ name: 'Days', type: sql.Int, value: days }]);
  return result.recordset || [];
}

async function claim(key, query) {
  const result = await query(`INSERT dbo.DepositMailEvent(EventKey, Status)
    SELECT @key, 'Sending' WHERE NOT EXISTS (SELECT 1 FROM dbo.DepositMailEvent WITH (UPDLOCK, HOLDLOCK) WHERE EventKey = @key);
    SELECT @@ROWCOUNT AS claimed;`, [{ name: 'key', type: sql.VarChar(100), value: key }]);
  return result.recordset.at(-1)?.claimed === 1;
}
async function finish(key, status, query) {
  await query('UPDATE dbo.DepositMailEvent SET Status = @status WHERE EventKey = @key',
    [{ name: 'key', type: sql.VarChar(100), value: key }, { name: 'status', type: sql.VarChar(12), value: status }]);
}

export function invoiceReminderEmail(row, origin = appOrigin()) {
  const link = `${origin}/khach-hang?tab=dat-coc`;
  return {
    to: row.email,
    subject: `HomeStayDorm - Nhắc thanh toán hóa đơn kỳ ${row.ky}`,
    text: `Chào ${row.hoTen || 'bạn'},\n\nHóa đơn ${row.id} kỳ ${row.ky} của hợp đồng ${row.maHopDong} (${money(row.tongTien)}) đến hạn thanh toán ngày ${date(row.han)}.\nThanh toán tại: ${link}\n\nNếu bạn đã thanh toán, vui lòng bỏ qua email này.\nHomeStayDorm`,
  };
}

export async function nhacHoaDon({ query = executeQuery, mailer = createMailer(), log = console, days = DAYS_BEFORE } = {}) {
  const rows = await hoaDonSapDenHan({ query, days });
  let sent = 0;
  for (const row of rows) {
    const key = `invoice-reminder:${row.id}`;
    if (!await claim(key, query)) continue;
    if (!row.email) { await finish(key, 'Skipped', query); continue; }
    try { await mailer.send(invoiceReminderEmail(row)); await finish(key, 'Sent', query); sent += 1; }
    catch (error) { await finish(key, 'Failed', query).catch(() => {}); log.warn(`[invoice-reminder] ${row.id}: ${error.message}`); }
  }
  return { due: rows.length, sent };
}

let timer;
export function startNhacHoaDonScheduler({ intervalMs = 60 * 60 * 1000, log = console } = {}) {
  if (timer) return timer;
  const run = () => nhacHoaDon({ log }).catch((error) => log.warn(`[invoice-reminder] scheduler: ${error.message}`));
  run();
  timer = setInterval(run, intervalMs);
  timer.unref?.();
  return timer;
}
