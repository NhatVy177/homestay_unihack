import { executeQuery, sql } from '../database/connection.js';
import { createServiceError, mapDatabaseError } from './serviceErrors.js';
import * as cuTruRepository from '../repositories/cuTru.repository.js';
import { requireValidMembers } from './nhanPhong.service.js';
import { checkResidentsGender } from './genderRules.js';
import { notifyNhanPhong, notifyMemberInvites } from '../integrations/mail/nhanPhongNotifications.js';

// D-026 mục 4: sau khi cọc xong, khách tự khai người ở trên web; hệ thống kiểm tra như D-024
// (đạt hết thì tự duyệt, bất thường thì chờ quản lý). CCCD gốc được đối chiếu lúc ký hợp đồng.
const CU_TRU_ERRORS = { 50010: 409, 50011: 409, 50012: 409, 50013: 400, 50014: 400, 50015: 409, 50019: 500, 50020: 409, 50021: 400 };
const EDITABLE = ['Chưa cập nhật', 'Từ chối cư trú'];

function assertCustomer(user) {
  if (user?.vaiTro !== 'KhachHang' || !user.maNguoiDung) throw createServiceError('Chỉ khách hàng mới dùng chức năng này.', 403);
}

export async function getCuTruCuaKhach(user, { query = executeQuery } = {}) {
  assertCustomer(user);
  const params = [{ name: 'MaKhachHang', type: sql.VarChar(6), value: user.maNguoiDung }];
  const deposits = (await query(`SELECT pdc.MaPhieuDatCoc AS maPhieuDatCoc, pdc.HinhThucThue AS hinhThucThue,
      pdk.SoNguoiDuKienO AS soNguoiDuKienO, pdk.SoNam AS soNam, pdk.SoNu AS soNu, hs.MaHoSoCuTru AS maHoSoCuTru,
      ISNULL(hs.TrangThaiHoSo, N'Chưa cập nhật') AS trangThaiHoSo, hs.GhiChuQuanLy AS ghiChuQuanLy,
      CAST(CASE WHEN EXISTS (SELECT 1 FROM dbo.HopDongThue hd WHERE hd.MaPhieuCoc = pdc.MaPhieuDatCoc) THEN 1 ELSE 0 END AS BIT) AS coHopDong,
      (SELECT COUNT(*) FROM dbo.ChiTietDatCoc c WHERE c.MaPhieuDatCoc = pdc.MaPhieuDatCoc) AS soDongCoc,
      (SELECT STRING_AGG(CASE WHEN c.MaGiuong IS NULL THEN p.TenPhong ELSE p.TenPhong + N' - Giường ' + c.MaGiuong END, N', ')
         FROM dbo.ChiTietDatCoc c JOIN dbo.Phong p ON p.MaPhong = c.MaPhong WHERE c.MaPhieuDatCoc = pdc.MaPhieuDatCoc) AS viTriThue,
      (SELECT MIN(p.GioiTinhChoPhep) FROM dbo.ChiTietDatCoc c JOIN dbo.Phong p ON p.MaPhong = c.MaPhong
         WHERE c.MaPhieuDatCoc = pdc.MaPhieuDatCoc) AS gioiTinhChoPhep
    FROM dbo.PhieuDatCoc pdc
    JOIN dbo.PhieuDangKy pdk ON pdk.MaDangKy = pdc.MaPhieuYeuCauDangKy
    LEFT JOIN dbo.HoSoCuTru hs ON hs.MaPhieuDatCoc = pdc.MaPhieuDatCoc
    WHERE pdc.MaKhachHang = @MaKhachHang AND pdc.TrangThaiCoc = N'Hiệu lực' AND pdc.TrangThaiThanhToan = N'Đã TT'
    ORDER BY pdc.MaPhieuDatCoc DESC`, params)).recordset || [];
  const members = deposits.some((item) => item.maHoSoCuTru)
    ? (await query(`SELECT tv.MaHoSoCuTru AS maHoSoCuTru, tv.HoTen AS hoTen, tv.NgaySinh AS ngaySinh, tv.GioiTinh AS gioiTinh,
        tv.CCCD AS cccd, tv.SDT AS sdt, tv.Email AS email, tv.QuocTich AS quocTich, tv.TrangThai AS trangThai, tv.LyDoTuChoi AS lyDoTuChoi
      FROM dbo.ThanhVienHopDong tv
      JOIN dbo.HoSoCuTru hs ON hs.MaHoSoCuTru = tv.MaHoSoCuTru
      JOIN dbo.PhieuDatCoc pdc ON pdc.MaPhieuDatCoc = hs.MaPhieuDatCoc
      WHERE pdc.MaKhachHang = @MaKhachHang ORDER BY tv.MaThanhVien`, params)).recordset || []
    : [];
  const nguoiDaiDien = (await query(`SELECT nd.HoTen AS hoTen, nd.NgaySinh AS ngaySinh, nd.GioiTinh AS gioiTinh, nd.SDT AS sdt,
      nd.Email AS email, kh.CCCD AS cccd, kh.QuocTich AS quocTich
    FROM dbo.NguoiDung nd LEFT JOIN dbo.KhachHang kh ON kh.MaKhachHang = nd.MaNguoiDung
    WHERE nd.MaNguoiDung = @MaKhachHang`, params)).recordset?.[0] || null;
  return {
    nguoiDaiDien,
    phieu: deposits.map((item) => ({
      ...item,
      coTheKhai: !item.coHopDong && EDITABLE.includes(item.trangThaiHoSo),
      thanhVien: members.filter((member) => member.maHoSoCuTru && member.maHoSoCuTru === item.maHoSoCuTru),
    })),
  };
}

export async function khaiCuTru(user, data = {}, {
  query = executeQuery, repo = cuTruRepository, notify = notifyNhanPhong, invite = notifyMemberInvites,
} = {}) {
  assertCustomer(user);
  const maPhieuDatCoc = String(data.maPhieuDatCoc || '').trim();
  if (!/^[A-Za-z0-9]{1,6}$/.test(maPhieuDatCoc)) throw createServiceError('Phiếu đặt cọc không hợp lệ.');
  // D-038: người đại diện xác nhận các thành viên đồng ý cung cấp thông tin.
  if (data.dongYCungCapThongTin !== true) {
    throw createServiceError('Vui lòng xác nhận các thành viên đồng ý cung cấp thông tin để làm thủ tục thuê và đăng ký tạm trú.');
  }
  const members = requireValidMembers(data.danhSachThanhVien);
  members.forEach((member, index) => {
    if (!member.ngaySinh || !member.sdt) throw createServiceError(`Người ở thứ ${index + 1} thiếu ngày sinh hoặc số điện thoại.`);
  });
  const owner = (await query(`SELECT pdk.MaNhanVienSale AS maNhanVienSale, pdk.SoNam AS soNam, pdk.SoNu AS soNu
    FROM dbo.PhieuDatCoc pdc JOIN dbo.PhieuDangKy pdk ON pdk.MaDangKy = pdc.MaPhieuYeuCauDangKy
    WHERE pdc.MaPhieuDatCoc = @MaPhieuDatCoc AND pdc.MaKhachHang = @MaKhachHang`, [
    { name: 'MaPhieuDatCoc', type: sql.VarChar(6), value: maPhieuDatCoc },
    { name: 'MaKhachHang', type: sql.VarChar(6), value: user.maNguoiDung },
  ])).recordset?.[0];
  if (!owner) throw createServiceError('Không tìm thấy phiếu cọc của bạn.', 404);
  if (!owner.maNhanVienSale) throw createServiceError('Phiếu chưa có nhân viên Sale phụ trách. Vui lòng liên hệ nhân viên.', 409);
  const genderIssue = checkResidentsGender(members, owner);
  if (genderIssue) throw createServiceError(genderIssue, 409);
  try {
    const saved = await repo.luuHoSoCuTru({
      maPhieuDatCoc, maNhanVienSale: owner.maNhanVienSale, daDoiChieuGiayTo: false,
      ghiChu: 'Khách tự khai trên web (D-026). CCCD gốc đối chiếu khi ký hợp đồng.', danhSachThanhVien: members,
    });
    const maHoSoCuTru = saved?.hoSo?.MaHoSoCuTru || saved?.hoSo?.maHoSoCuTru;
    if (!maHoSoCuTru) throw createServiceError('Chưa lưu được hồ sơ cư trú. Vui lòng thử lại.', 500);
    const result = await repo.guiDuyetHoSoCuTru(maHoSoCuTru);
    const trangThaiHoSo = result?.TrangThaiHoSo || null;
    if (trangThaiHoSo === 'Chờ duyệt cư trú') await notify('residence-review', maHoSoCuTru);
    if (trangThaiHoSo === 'Đã duyệt cư trú') await invite(maHoSoCuTru);
    return { maHoSoCuTru, trangThaiHoSo, lyDo: result?.GhiChuQuanLy || null };
  } catch (error) {
    if (error.statusCode) throw error;
    mapDatabaseError(error, CU_TRU_ERRORS);
  }
}
