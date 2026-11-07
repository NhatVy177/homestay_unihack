import { executeQuery } from '../database/connection.js';
import { notifyNhanPhong } from '../integrations/mail/nhanPhongNotifications.js';

let timer;
export async function nhacThuDauKy({ query = executeQuery, notify = notifyNhanPhong, log = console } = {}) {
  const rows = (await query(`SELECT hd.MaHopDong AS id FROM dbo.HopDongThue hd
    WHERE hd.TrangThai=N'Hiệu lực'
      AND hd.NgayBatDau > GETDATE()
      AND hd.NgayBatDau <= DATEADD(DAY,1,GETDATE())
      AND NOT EXISTS (SELECT 1 FROM dbo.HoaDon h WHERE h.MaHopDong=hd.MaHopDong
        AND h.KyThanhToan=CONVERT(char(7),hd.NgayBatDau,120) AND h.TrangThai=N'Đã TT')`)).recordset || [];
  for (const row of rows) {
    try { await notify('first-charge-reminder', row.id); }
    catch (error) { log.warn(`[checkin-mail] reminder/${row.id}: ${error.message}`); }
  }
  return rows.length;
}

export function startNhacThuDauKyScheduler({ intervalMs = 15 * 60 * 1000, log = console } = {}) {
  if (timer) return;
  const run = () => nhacThuDauKy({ log }).catch(error => log.warn(`[checkin-mail] scheduler: ${error.message}`));
  run();
  timer = setInterval(run, intervalMs);
  timer.unref?.();
}
