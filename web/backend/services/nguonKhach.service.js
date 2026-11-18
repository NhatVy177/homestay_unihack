import { executeQuery, sql } from '../database/connection.js';
import { createServiceError } from './serviceErrors.js';

// Nguồn khách của phiếu đăng ký thuê và báo cáo tỷ lệ chốt theo nguồn cho Sale/quản lý.
// Cột PhieuDangKy.NguonKhach do `npm run customer-source:db:migrate` thêm; chưa chạy thì ghi bỏ qua và báo cáo trả rỗng.
export const NGUON = ['Facebook', 'Zalo', 'Người quen giới thiệu', 'Tìm trên web', 'Sale gửi link', 'Khác'];

export function chuanHoaNguon(value) {
  const text = String(value || '').trim();
  return NGUON.includes(text) ? text : null;
}

export async function ghiNguon(maDangKy, nguon, { query = executeQuery } = {}) {
  const value = chuanHoaNguon(nguon);
  if (!maDangKy || !value) return false;
  await query(`IF COL_LENGTH(N'dbo.PhieuDangKy', N'NguonKhach') IS NOT NULL
    EXEC sys.sp_executesql N'UPDATE dbo.PhieuDangKy SET NguonKhach = @Nguon WHERE MaDangKy = @Ma', N'@Nguon NVARCHAR(30), @Ma VARCHAR(6)', @Nguon = @Nguon, @Ma = @Ma`, [
    { name: 'Nguon', type: sql.NVarChar(30), value },
    { name: 'Ma', type: sql.VarChar(6), value: String(maDangKy) },
  ]);
  return true;
}

const canView = (user) => user?.vaiTro === 'Admin' || (user?.vaiTro === 'NhanVien' && ['Sale', 'Quản lý'].includes(user.chucVu));

// Mỗi nguồn: số hồ sơ, số hồ sơ đã có phiếu cọc, số hồ sơ đã ký hợp đồng, tỷ lệ chốt (hợp đồng / hồ sơ).
export async function baoCaoNguon(user, { query = executeQuery } = {}) {
  if (!canView(user)) throw createServiceError('Bạn không có quyền xem báo cáo nguồn khách.', 403);
  const ready = (await query(`SELECT COL_LENGTH(N'dbo.PhieuDangKy', N'NguonKhach') AS n`)).recordset[0]?.n;
  if (!ready) return { ready: false, rows: [] };
  // SQL Server không cho SUM bọc EXISTS: tính cờ từng phiếu trong bảng con rồi mới gộp theo nguồn.
  const rows = (await query(`EXEC sys.sp_executesql N'SELECT x.nguon, COUNT(*) AS soHoSo, SUM(x.coCoc) AS soDatCoc, SUM(x.coHopDong) AS soHopDong
    FROM (SELECT ISNULL(p.NguonKhach, N''Chưa ghi nguồn'') AS nguon,
        CASE WHEN EXISTS (SELECT 1 FROM dbo.PhieuDatCoc c WHERE c.MaPhieuYeuCauDangKy = p.MaDangKy) THEN 1 ELSE 0 END AS coCoc,
        CASE WHEN EXISTS (SELECT 1 FROM dbo.PhieuDatCoc c JOIN dbo.HopDongThue h ON h.MaPhieuCoc = c.MaPhieuDatCoc WHERE c.MaPhieuYeuCauDangKy = p.MaDangKy) THEN 1 ELSE 0 END AS coHopDong
      FROM dbo.PhieuDangKy p) x
    GROUP BY x.nguon'`)).recordset || [];
  return {
    ready: true,
    rows: rows.map((r) => ({ ...r, tyLeChot: r.soHoSo ? Math.round((r.soHopDong / r.soHoSo) * 100) : 0 }))
      .sort((a, b) => (a.nguon === 'Chưa ghi nguồn') - (b.nguon === 'Chưa ghi nguồn') || b.soHoSo - a.soHoSo),
  };
}
