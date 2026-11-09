import { executeQuery, executeProcedure } from '../database/connection.js';
import { notifyDeposit } from '../integrations/mail/datCocNotifications.js';

// Luồng đặt cọc có 2 cửa sổ 24h (chờ kế toán chốt, chờ khách thanh toán) -- quét thường
// xuyên hơn hoá đơn định kỳ (chu kỳ dài hơn nhiều) để giường/phòng không bị "Giữ chỗ" treo lâu.
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

let intervalId = null;

function getIntervalMs() {
  const configured = Number(process.env.DAT_COC_HET_HAN_INTERVAL_MS || DEFAULT_INTERVAL_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_INTERVAL_MS;
}

export async function nhaChoCocHetHan({ query = executeQuery, execute = executeProcedure, notify = notifyDeposit } = {}) {
  // Đếm TRƯỚC ở phía Node bằng 1 câu SELECT riêng. SP_NhaChoCocHetHan CỐ Ý không trả recordset:
  // nó được EXEC lồng bên trong nhiều SP khác của luồng đặt cọc (xem ghi chú trong dat-coc.sql),
  // nên không thể thêm SELECT vào đó mà không làm sai lệch result.recordset ở các nơi gọi khác.
  const countResult = await query(`
    SELECT COUNT(*) AS soPhieu FROM dbo.PhieuDatCoc
    WHERE TrangThaiThanhToan = N'Chờ TT' AND ThoiHanThanhToan < GETDATE();
  `);
  const soPhieu = countResult.recordset?.[0]?.soPhieu || 0;

  await execute('dbo.SP_NhaChoCocHetHan');
  // SP may also have run from another request. Sweep cancelled slips to avoid missing email.
  const expired = (await query(`SELECT MaPhieuDatCoc AS id FROM dbo.PhieuDatCoc
    WHERE TrangThaiThanhToan=N'Hết hạn' AND TrangThaiCoc=N'Đã hủy'
      AND MaNhanVienKeToan IS NOT NULL
      AND ThoiHanThanhToan BETWEEN DATEADD(HOUR,-48,GETDATE()) AND GETDATE()`)).recordset;
  for (const { id } of expired) {
    await notify('expired', id);
  }
  const reminders = (await query(`SELECT MaPhieuDatCoc AS id FROM dbo.PhieuDatCoc
    WHERE TrangThaiThanhToan=N'Chờ TT' AND TrangThaiCoc=N'Hiệu lực'
      AND MaNhanVienKeToan IS NOT NULL AND ThoiHanThanhToan BETWEEN GETDATE() AND DATEADD(HOUR,3,GETDATE())`)).recordset;
  for (const { id } of reminders) await notify('reminder', id);
  return soPhieu;
}

export function startDatCocHetHanScheduler() {
  if (intervalId) {
    return intervalId;
  }

  async function run(label) {
    try {
      const soPhieu = await nhaChoCocHetHan();
      if (soPhieu > 0) {
        console.log(`[dat-coc-het-han:${label}] Da huy ${soPhieu} phieu dat coc qua han, nha giuong/phong ve Trong.`);
      }
    } catch (error) {
      console.error(`[dat-coc-het-han:${label}] Khong quet duoc phieu dat coc qua han:`, error.message);
    }
  }

  run('startup');
  intervalId = setInterval(() => run('interval'), getIntervalMs());
  intervalId.unref?.();

  return intervalId;
}
