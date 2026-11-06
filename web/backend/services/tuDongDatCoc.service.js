import { executeProcedure, executeQuery, sql } from '../database/connection.js';

// D-019: hệ thống tự làm hai bước duyệt cọc chỉ để chuyền tay (quản lý "Duyệt nhận cọc" khi phòng
// còn phù hợp, kế toán "Chốt phiếu đặt cọc" khi tiền cọc đã do trigger tính). Bước nào hệ thống
// không làm được thì để nguyên cho nhân viên duyệt tay như cũ; không bao giờ tự từ chối hay hủy.
export const MA_HE_THONG = 'NVAUTO';
export const MA_THAM_SO = 'TU_DONG_DUYET_COC';

// Lỗi nghiệp vụ nghĩa là "để người duyệt"; lỗi khác vẫn không làm hỏng thao tác của sale.
const LOI_DE_NGUOI_DUYET = new Set([50205, 50208, 50209, 50271, 50272, 50273]);

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
    // Sau khi sale gửi yêu cầu đặt cọc: SP tự kiểm tra phòng còn trống, đủ chỗ, đúng giới tính.
    duyetNhanCoc: maDangKy => chay('duyệt nhận cọc', () => exec('dbo.SP_XacNhanKhaNangNhanCoc', [
      { name: 'MaDangKy', type: sql.VarChar(6), value: maDangKy },
      { name: 'MaQuanLy', type: sql.VarChar(6), value: MA_HE_THONG },
      { name: 'DuocNhanCoc', type: sql.Bit, value: 1 },
      { name: 'LyDo', type: sql.NVarChar(sql.MAX), value: null }
    ])),
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
