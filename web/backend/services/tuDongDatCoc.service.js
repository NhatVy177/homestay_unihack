import { executeProcedure, executeQuery, sql } from '../database/connection.js';

// D-019/D-020: hệ thống chỉ tự "Chốt phiếu đặt cọc" thay kế toán, vì tiền cọc là công thức cố định
// (2 tháng x số giường) đã do trigger tính. KHÔNG tự duyệt nhận cọc: bước đó là quản lý kiểm tra
// tình trạng thực tế của phòng (đề §3.1.2). Không chốt được thì để kế toán chốt tay như cũ.
export const MA_HE_THONG = 'NVAUTO';
export const MA_THAM_SO = 'TU_DONG_DUYET_COC'; // tên cũ giữ nguyên; nay chỉ điều khiển việc tự chốt phiếu cọc

// Lỗi nghiệp vụ nghĩa là "để người chốt"; lỗi khác vẫn không làm hỏng thao tác của sale.
const LOI_DE_NGUOI_DUYET = new Set([50271, 50272, 50273]);

export function createTuDongDatCoc({ exec, query, log = console }) {
  async function dangBat() {
    try {
      const rows = (await query(`SELECT tsh.GiaTri AS giaTri
        FROM dbo.ThamSoHeThong AS tsh
        WHERE tsh.MaThamSo = @ma AND EXISTS (SELECT 1 FROM dbo.NhanVien WHERE MaNhanVien = @heThong)`,
      [{ name: 'ma', type: sql.VarChar(50), value: MA_THAM_SO }, { name: 'heThong', type: sql.VarChar(6), value: MA_HE_THONG }])).recordset;
      return ['1', 'true'].includes(String(rows[0]?.giaTri || '').trim().toLowerCase());
    } catch (error) {
      log.warn('[tu-dong-dat-coc] không đọc được cấu hình, giữ duyệt tay:', error.message);
      return false;
    }
  }

  async function chay(buoc, fn) {
    if (!await dangBat()) return { trangThai: 'tat' };
    try {
      await fn();
      return { trangThai: 'da-tu-dong' };
    } catch (error) {
      if (!LOI_DE_NGUOI_DUYET.has(error.number)) log.error(`[tu-dong-dat-coc] ${buoc} lỗi, chờ duyệt tay:`, error.message);
      return { trangThai: 'cho-duyet-tay', lyDo: error.message };
    }
  }

  return {
    dangBat,
    // Sau khi sale lập phiếu cọc: chốt để phiếu tới khách và hạn 24 giờ bắt đầu.
    chotPhieu: maPhieuDatCoc => chay('chốt phiếu cọc', () => exec('dbo.SP_ChotPhieuDatCoc', [
      { name: 'MaPhieuDatCoc', type: sql.VarChar(6), value: maPhieuDatCoc },
      { name: 'MaNhanVienKeToan', type: sql.VarChar(6), value: MA_HE_THONG },
      { name: 'Chot', type: sql.Bit, value: 1 },
      { name: 'LyDo', type: sql.NVarChar(sql.MAX), value: null }
    ]))
  };
}

export const tuDongDatCoc = createTuDongDatCoc({ exec: executeProcedure, query: executeQuery });
