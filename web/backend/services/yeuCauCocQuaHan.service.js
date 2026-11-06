import { executeProcedure, executeQuery } from '../database/connection.js';
import { notifyDeposit } from '../integrations/mail/datCocNotifications.js';

const fallback = 5 * 60 * 1000;
let timer;
let running = false;

export async function xuLyYeuCauCocQuaHan({ execute = executeProcedure, query = executeQuery, notify = notifyDeposit } = {}) {
  const result = await execute('dbo.SP_TuChoiYeuCauCocQuaHan');
  const ids = result.recordsets.at(-1) || [];
  for (const item of ids) await notify('rejected', item.maDangKy, 'Quản lý chưa xử lý trong 12 giờ');
  const reminders = (await query(`SELECT y.MaDangKy AS maDangKy
    FROM dbo.YeuCauDatCocChiTiet y JOIN dbo.PhieuDangKy p ON p.MaDangKy=y.MaDangKy
    WHERE p.TrangThai=N'Chờ xác nhận cọc' AND y.GuiLuc<=DATEADD(HOUR,-8,GETDATE())`)).recordset;
  for (const item of reminders) await notify('manager-reminder', item.maDangKy);
  return ids.length;
}

export function startYeuCauCocQuaHanScheduler() {
  if (timer) return timer;
  const configured = Number(process.env.DAT_COC_YEU_CAU_INTERVAL_MS || fallback);
  const delay = Number.isFinite(configured) && configured > 0 ? configured : fallback;
  const run = async () => {
    if (running) return;
    running = true;
    try { await xuLyYeuCauCocQuaHan(); }
    catch (error) { console.error('[deposit-request-timeout]', error.message); }
    finally { running = false; }
  };
  void run();
  timer = setInterval(run, delay);
  timer.unref?.();
  return timer;
}
