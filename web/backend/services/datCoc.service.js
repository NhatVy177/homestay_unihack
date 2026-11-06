import { executeProcedure, getPool, sql } from '../database/connection.js';
import { createServiceError, mapDatabaseError } from './serviceErrors.js';
import { capNhatLichXemDenGioThanhDaXem } from '../repositories/lichXemPhong.repository.js';
import { attachPaymentAccount } from '../config/payment.js';
import { tuDongDatCoc } from './tuDongDatCoc.service.js';
import { notifyDeposit } from '../integrations/mail/datCocNotifications.js';

function handleDatabaseError(error) {
  mapDatabaseError(error, {
    50010: 404,
    // DC04 - cập nhật minh chứng
    50220: 404, 50221: 409, 50222: 409, 50223: 400,
    // DC05 - xác nhận thanh toán
    50230: 404, 50231: 409, 50232: 409, 50233: 400, 50234: 409,
    // DC01 (A4) - cập nhật thông tin cá nhân khách hàng
    50260: 404, 50261: 409, 50262: 400,
    // Phiếu kế toán chưa chốt -> chưa được thanh toán
    50275: 409
  });
}

export async function getDanhSachChoGhiNhanChungTu(maNhanVien) {
  const result = await executeProcedure('dbo.SP_DanhSachChoGhiNhanChungTu', [
    { name: 'MaNhanVien', type: sql.VarChar(6), value: String(maNhanVien || '').trim() }
  ]);
  return attachPaymentAccount(result.recordset || []);
}

export async function getDanhSachChoXacNhanThanhToan(user) {
  if (user?.vaiTro !== 'NhanVien' || user?.chucVu !== 'Kế toán')
    throw createServiceError('Chỉ kế toán được xác nhận tiền chuyển khoản', 403);
  const result = await executeProcedure('dbo.SP_DanhSachChoXacNhanThanhToan', [
    { name: 'MaNhanVien', type: sql.VarChar(6), value: user.maNguoiDung }
  ]);
  return result.recordset;
}

export async function getDanhSachChoLapPhieu(maNhanVien) {
  const result = await executeProcedure('dbo.SP_DanhSachChoLapPhieuDatCoc', [
    { name: 'MaNhanVien', type: sql.VarChar(6), value: String(maNhanVien || '').trim() }
  ]);
  return result.recordset;
}

// DC01 - Các phòng khách ĐÃ XEM của hồ sơ; Sale chốt 1 phòng trong số này.
export async function getPhongDaXem(maDangKy) {
  const ma = String(maDangKy || '').trim();
  if (!ma) throw createServiceError('Thiếu mã phiếu đăng ký');
  try {
    await capNhatLichXemDenGioThanhDaXem({ maDangKy: ma });
    const result = await executeProcedure('dbo.SP_DanhSachPhongDaXem', [
      { name: 'MaDangKy', type: sql.VarChar(6), value: ma }
    ]);
    return result.recordset;
  } catch (error) {
    mapDatabaseError(error, { 50250: 422 });
  }
}

// DC01 - Sale chốt (hoặc đổi) phòng khách muốn thuê. Phòng này sẽ được Quản lý duyệt ở DC02
// và Kế toán lập phiếu ở DC03 -> chỉ Sale mới được quyết.
export async function chonPhongKhachChot(user, maDangKy, maPhong) {
  if (!user || user.vaiTro !== 'NhanVien' || user.chucVu !== 'Sale') {
    throw createServiceError('Chỉ nhân viên Sale được chốt phòng cho khách', 403);
  }
  const ma = String(maDangKy || '').trim();
  const phong = String(maPhong || '').trim();
  if (!ma || !phong) throw createServiceError('Thiếu mã phiếu đăng ký hoặc mã phòng');

  try {
    await capNhatLichXemDenGioThanhDaXem({ maDangKy: ma });
    const result = await executeProcedure('dbo.SP_ChonPhongKhachChot', [
      { name: 'MaDangKy', type: sql.VarChar(6), value: ma },
      { name: 'MaPhong',  type: sql.VarChar(4), value: phong }
    ]);
    return result.recordset[0] || null;
  } catch (error) {
    mapDatabaseError(error, {
      50201: 404,   // không tìm thấy hồ sơ
      50202: 409,   // hồ sơ đã gửi yêu cầu -> không đổi phòng
      50256: 422,   // phòng không nằm trong danh sách đã xem
      50257: 409    // khách chưa xem phòng này
    });
  }
}

// DC02B - SALE lập phiếu đặt cọc (không phải kế toán).
// Hình thức thuê và giường là thứ phải trao đổi với khách, mà người gặp khách là Sale.
//
// PHÒNG KHÔNG TRUYỀN TỪ ĐÂY: SP tự lấy phòng khách đã chốt ở DC01 (ChiTietXemPhong.KhachChon),
// nên không thể lập phiếu cho phòng khác với phòng Quản lý đã duyệt ở DC02.
// SP cũng KHÔNG trả về số tiền -> Sale không thấy tiền. Tiền do kế toán chốt ở DC03.
export async function createPhieuDatCoc(user, data = {}) {
  if (!user || user.vaiTro !== 'NhanVien' || user.chucVu !== 'Sale') {
    throw createServiceError('Chỉ nhân viên Sale được lập phiếu đặt cọc', 403);
  }

  const maDangKy = String(data.maDangKy || '').trim();
  if (!maDangKy) throw createServiceError('Thiếu mã phiếu đăng ký');

  const hinhThucThue = String(data.hinhThucThue || '').trim();
  if (!['Nguyên phòng', 'Ghép giường'].includes(hinhThucThue)) {
    throw createServiceError('Hình thức thuê không hợp lệ (chỉ "Nguyên phòng" hoặc "Ghép giường")');
  }

  const laGhep = hinhThucThue === 'Ghép giường';
  const giuongs = Array.isArray(data.giuongs)
    ? data.giuongs.filter(Boolean).map((g) => String(g).trim()).join(',')
    : String(data.giuongs || '').trim();

  if (laGhep && !giuongs) throw createServiceError('Chưa chọn giường nào để ghép');

  try {
    await capNhatLichXemDenGioThanhDaXem({ maDangKy });
    const result = await executeProcedure('dbo.SP_LapPhieuDatCoc', [
      { name: 'MaDangKy',        type: sql.VarChar(6),        value: maDangKy },
      { name: 'MaNhanVienSale',  type: sql.VarChar(6),        value: user.maNguoiDung },
      { name: 'HinhThucThue',    type: sql.NVarChar(20),      value: hinhThucThue },
      { name: 'DanhSachGiuong',  type: sql.NVarChar(sql.MAX), value: laGhep ? giuongs : null }
    ]);
    const phieu = result.recordset[0] || null;
    // D-019: tiền cọc đã do trigger tính -> hệ thống tự chốt thay bước kế toán (nếu đang bật).
    if (phieu?.maPhieuDatCoc) phieu.tuDong = await tuDongDatCoc.chotPhieu(phieu.maPhieuDatCoc);
    return phieu;
  } catch (error) {
    mapDatabaseError(error, {
      50210: 404,   // không tìm thấy hồ sơ
      50211: 409,   // hồ sơ chưa được quản lý duyệt
      50212: 409,   // hồ sơ đã có phiếu cọc còn hiệu lực
      50213: 404,   // không tìm thấy nhân viên sale
      50214: 422,   // hồ sơ chưa chốt phòng
      50215: 409,   // giường/phòng không còn trống
      50216: 422,   // nhóm khác giới không được ghép giường
      50217: 422,   // số giường ≠ số người
      50218: 409,   // phòng đã khóa sang giới khác
      50219: 422,   // vượt sức chứa
      50251: 400,   // hình thức thuê không hợp lệ
      50252: 400    // danh sách giường không hợp lệ
    });
  }
}

// DC03 - Danh sách phiếu Sale đã lập, chờ KẾ TOÁN tính tiền và chốt.
export async function getDanhSachChoTinhTien(user) {
  if (!user || user.vaiTro !== 'NhanVien' || user.chucVu !== 'Kế toán') {
    throw createServiceError('Chức năng này chỉ dành cho nhân viên kế toán', 403);
  }
  const result = await executeProcedure('dbo.SP_DanhSachChoTinhTienCoc', [
    { name: 'MaNhanVien', type: sql.VarChar(6), value: user.maNguoiDung }
  ]);
  return result.recordset;
}

// DC03 - Kế toán CHỐT (hoặc HỦY) phiếu cọc do Sale lập.
// Chốt xong mới gán MaNhanVienKeToan -> phiếu tới tay khách và đồng hồ 24h bắt đầu chạy.
export async function chotPhieuDatCoc(user, id, data = {}) {
  if (!user || user.vaiTro !== 'NhanVien' || user.chucVu !== 'Kế toán') {
    throw createServiceError('Chỉ nhân viên kế toán được chốt phiếu đặt cọc', 403);
  }
  const maPhieuCoc = String(id || '').trim();
  if (!maPhieuCoc) throw createServiceError('Thiếu mã phiếu đặt cọc');

  const chot = Boolean(data.chot);
  const lyDo = String(data.lyDo || '').trim();
  if (!chot && !lyDo) throw createServiceError('Vui lòng nhập lý do hủy phiếu');

  try {
    const result = await executeProcedure('dbo.SP_ChotPhieuDatCoc', [
      { name: 'MaPhieuDatCoc',    type: sql.VarChar(6),        value: maPhieuCoc },
      { name: 'MaNhanVienKeToan', type: sql.VarChar(6),        value: user.maNguoiDung },
      { name: 'Chot',             type: sql.Bit,               value: chot ? 1 : 0 },
      { name: 'LyDo',             type: sql.NVarChar(sql.MAX), value: lyDo || null }
    ]);
    return result.recordset[0] || null;
  } catch (error) {
    mapDatabaseError(error, {
      50213: 404,   // không tìm thấy kế toán
      50270: 404,   // không tìm thấy phiếu
      50271: 409,   // phiếu đã được chốt
      50272: 409,   // phiếu không còn hiệu lực
      50273: 409,   // phiếu quá hạn chốt
      50274: 400    // thiếu lý do hủy
    });
  }
}

export async function getGiuongTrong(maPhong) {
  const result = await executeProcedure('dbo.SP_DanhSachGiuongTrong', [
    { name: 'MaPhong', type: sql.VarChar(4), value: String(maPhong || '').trim() }
  ]);
  return result.recordset;
}

export async function getPhieuDatCoc(maNhanVienSale) {
  const result = await executeProcedure('dbo.SP_DanhSachDatCocSale', [
    { name: 'MaNhanVienSale', type: sql.VarChar(6), value: String(maNhanVienSale || '').trim() }
  ]);
  return attachPaymentAccount(result.recordset || []);
}

export async function guiYeuCauDatCoc(user, data = {}) {
  if (user?.vaiTro !== 'NhanVien' || user?.chucVu !== 'Sale')
    throw createServiceError('Chỉ Sale được gửi yêu cầu cọc', 403);
  const maDangKy = String(data.maDangKy || '').trim();
  const maNhanVienSale = user.maNguoiDung;
  if (!maDangKy || !maNhanVienSale) {
    throw createServiceError('Thiếu mã phiếu đăng ký hoặc mã nhân viên');
  }
  const hinhThucThue = String(data.hinhThucThue || '').trim();
  const giuongs = Array.isArray(data.giuongs) ? data.giuongs.map(String).join(',') : String(data.giuongs || '').trim();
  if (!['Nguyên phòng', 'Ghép giường'].includes(hinhThucThue))
    throw createServiceError('Chọn hình thức thuê nguyên phòng hoặc ghép giường');
  if (hinhThucThue === 'Ghép giường' && !giuongs)
    throw createServiceError('Chọn giường cho khách');

  try {
    await capNhatLichXemDenGioThanhDaXem({ maDangKy });
    const result = await executeProcedure('dbo.SP_GuiYeuCauCocKemLuaChon', [
      { name: 'MaDangKy', type: sql.VarChar(6), value: maDangKy },
      { name: 'MaNhanVienSale', type: sql.VarChar(6), value: maNhanVienSale },
      { name: 'HinhThucThue', type: sql.NVarChar(20), value: hinhThucThue },
      { name: 'DanhSachGiuong', type: sql.NVarChar(100), value: hinhThucThue === 'Ghép giường' ? giuongs : null }
    ]);
    // D-020: quản lý vẫn là người duyệt nhận cọc (kiểm tra tình trạng thực tế của phòng, đề §3.1.2);
    // màn "Duyệt nhận cọc" đã hiện sẵn kết luận "đủ/không đủ điều kiện" do hệ thống tính.
    const row = result.recordsets.at(-1)?.[0] || null;
    if (row) await notifyDeposit('request', maDangKy);
    return row;
  } catch (error) {
    mapDatabaseError(error, {
      50201: 404,
      50202: 409,
      50203: 404,
      50258: 409, 50301: 400, 50302: 403, 50303: 422, 50304: 422, 50305: 409, 50315: 403
    });
  }
}

export async function capNhatThongTinCaNhan(maDangKy, data = {}) {
  const ma = String(maDangKy || '').trim();
  if (!ma) {
    throw createServiceError('Thiếu mã phiếu đăng ký');
  }
  if (data.gioiTinh && !['Nam', 'Nữ'].includes(data.gioiTinh)) {
    throw createServiceError('Giới tính không hợp lệ');
  }

  try {
    const result = await executeProcedure('dbo.SP_CapNhatThongTinCaNhanKhachHang', [
      { name: 'MaDangKy', type: sql.VarChar(6), value: ma },
      { name: 'HoTen', type: sql.NVarChar(100), value: data.hoTen || null },
      { name: 'NgaySinh', type: sql.Date, value: data.ngaySinh || null },
      { name: 'GioiTinh', type: sql.NVarChar(5), value: data.gioiTinh || null },
      { name: 'SDT', type: sql.VarChar(20), value: data.soDienThoai || null },
      { name: 'Email', type: sql.VarChar(100), value: data.email || null },
      { name: 'CCCD', type: sql.VarChar(20), value: data.cccd || null }
    ]);
    return result.recordset[0] || null;
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function getDanhSachChoXacNhan(maNhanVien) {
  const result = await executeProcedure('dbo.SP_DanhSachChoXacNhanCoc', [
    { name: 'MaNhanVien', type: sql.VarChar(6), value: String(maNhanVien || '').trim() }
  ]);
  return result.recordset;
}

export async function xacNhanKhaNangNhanCoc(user, id, data = {}) {
  if (user?.vaiTro !== 'NhanVien' || user?.chucVu !== 'Quản lý')
    throw createServiceError('Chỉ quản lý được duyệt yêu cầu cọc', 403);
  const maDangKy = String(id || '').trim();
  const maQuanLy = user.maNguoiDung;
  if (!maDangKy || !maQuanLy) {
    throw createServiceError('Thiếu mã phiếu đăng ký hoặc mã quản lý');
  }

  try {
    if (data.duocNhanCoc) {
      const result = await executeProcedure('dbo.SP_DuyetVaPhatHanhPhieuCoc', [
        { name: 'MaDangKy', type: sql.VarChar(6), value: maDangKy },
        { name: 'MaQuanLy', type: sql.VarChar(6), value: maQuanLy },
        { name: 'LyDoVuotLuot', type: sql.NVarChar(500), value: String(data.lyDoVuotLuot || '').trim() || null },
      ]);
      const phieu = result.recordsets.at(-2)?.[0];
      const rejected = result.recordsets.at(-1) || [];
      if (!phieu?.maPhieuDatCoc) throw new Error('Phiếu cọc chưa được phát hành');
      const email = await notifyDeposit('issued', phieu.maPhieuDatCoc);
      for (const other of rejected) await notifyDeposit('rejected', other.maDangKy, other.lyDo);
      return { ...phieu, trangThaiDangKy: 'Xác nhận cọc', email };
    }
    const result = await executeProcedure('dbo.SP_XacNhanKhaNangNhanCoc', [
      { name: 'MaDangKy', type: sql.VarChar(6), value: maDangKy },
      { name: 'MaQuanLy', type: sql.VarChar(6), value: maQuanLy },
      { name: 'DuocNhanCoc', type: sql.Bit, value: 0 },
      { name: 'LyDo', type: sql.NVarChar(sql.MAX), value: data.lyDo || null }
    ]);
    const row = result.recordset[0] || null;
    await notifyDeposit('rejected', maDangKy, data.lyDo);
    return row;
  } catch (error) {
    mapDatabaseError(error, { 50204: 404, 50205: 409, 50206: 404, 50207: 400, 50208: 422, 50209: 422,
      50215: 409, 50216: 422, 50217: 422, 50218: 409, 50219: 422, 50306: 403, 50307: 409, 50308: 409,
      50312: 400, 50313: 403 });
  }
}

export async function phatHanhYeuCauThanhToanCoc(id, data = {}) {
  try {
    const result = await executeProcedure('dbo.SP_PhatHanhYeuCauThanhToanCoc', [
      { name: 'PhieuId', type: sql.NVarChar(30), value: String(id || '').trim() },
      { name: 'SoTienCoc', type: sql.Decimal(18, 2), value: data.soTienCoc == null ? null : Number(data.soTienCoc) },
      { name: 'KeToanPhatHanhId', type: sql.NVarChar(20), value: data.keToanPhatHanhId || null }
    ]);

    return result.recordset[0] || null;
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function capNhatMinhChungThanhToanCoc(id, data = {}) {
  try {
    const result = await executeProcedure('dbo.SP_CapNhatMinhChungThanhToanCoc', [
      { name: 'PhieuId', type: sql.NVarChar(30), value: String(id || '').trim() },
      { name: 'ChungTuThanhToan', type: sql.NVarChar(500), value: data.chungTuThanhToan || null }
    ]);

    return result.recordset[0] || null;
  } catch (error) {
    handleDatabaseError(error);
  }
}

// DC04 - Khách hàng tự ghi nhận chứng từ thanh toán cọc.
// Khác đường Sale ở chỗ kiểm tra quyền sở hữu (khách chỉ up phiếu của chính mình),
// rồi tái dùng đúng SP_CapNhatMinhChungThanhToanCoc (đã có check hạn 24h + trạng thái).
export async function capNhatMinhChungCocKhach(user, id, data = {}) {
  if (!user || user.vaiTro !== 'KhachHang') {
    throw createServiceError('Chức năng này chỉ dành cho khách hàng', 403);
  }
  const maPhieuCoc = String(id || '').trim();
  if (!maPhieuCoc) throw createServiceError('Thiếu mã phiếu đặt cọc');
  if (!data.chungTuThanhToan) throw createServiceError('Thiếu file chứng từ thanh toán');

  // Kiểm tra phiếu thuộc về chính khách đang đăng nhập (KhachHang.MaKhachHang = NguoiDung.MaNguoiDung).
  const pool = await getPool();
  const owned = await pool.request()
    .input('MaPhieuCoc', sql.VarChar(6), maPhieuCoc)
    .input('MaKhachHang', sql.VarChar(6), user.maNguoiDung)
    .query(`
      SELECT 1 FROM dbo.PhieuDatCoc
      WHERE MaPhieuDatCoc = @MaPhieuCoc AND MaKhachHang = @MaKhachHang;
    `);
  if (!owned.recordset[0]) throw createServiceError('Không tìm thấy phiếu đặt cọc của bạn', 404);

  return capNhatMinhChungThanhToanCoc(maPhieuCoc, data);
}

// DC04 - Khách hàng chọn phương thức thanh toán cho phiếu cọc của chính mình.
// Kế toán không chọn ở DC03 nên phương thức có thể còn NULL; khách chọn ở đây.
export async function chonPhuongThucCocKhach(user, id, data = {}) {
  if (!user || user.vaiTro !== 'KhachHang') {
    throw createServiceError('Chức năng này chỉ dành cho khách hàng', 403);
  }
  const maPhieuCoc = String(id || '').trim();
  const phuongThuc = String(data.phuongThucThanhToan || '').trim();
  if (!maPhieuCoc) throw createServiceError('Thiếu mã phiếu đặt cọc');
  if (!['Tiền mặt', 'Chuyển khoản'].includes(phuongThuc)) {
    throw createServiceError('Phương thức thanh toán không hợp lệ');
  }

  // Kiểm tra phiếu thuộc về chính khách đang đăng nhập.
  const pool = await getPool();
  const owned = await pool.request()
    .input('MaPhieuCoc', sql.VarChar(6), maPhieuCoc)
    .input('MaKhachHang', sql.VarChar(6), user.maNguoiDung)
    .query(`
      SELECT 1 FROM dbo.PhieuDatCoc
      WHERE MaPhieuDatCoc = @MaPhieuCoc AND MaKhachHang = @MaKhachHang;
    `);
  if (!owned.recordset[0]) throw createServiceError('Không tìm thấy phiếu đặt cọc của bạn', 404);

  try {
    const result = await executeProcedure('dbo.SP_ChonPhuongThucThanhToanCoc', [
      { name: 'PhieuId', type: sql.NVarChar(30), value: maPhieuCoc },
      { name: 'PhuongThucThanhToan', type: sql.NVarChar(20), value: phuongThuc }
    ]);
    return result.recordset[0] || null;
  } catch (error) {
    mapDatabaseError(error, { 50240: 404, 50241: 400, 50242: 409, 50243: 409 });
  }
}

// DC04 - Nhân viên sale chọn phương thức thanh toán cho phiếu (không giới hạn sở hữu như khách).
// Tái dùng SP_ChonPhuongThucThanhToanCoc (đã trung lập vai trò, tự kiểm tra trạng thái/hạn).
export async function chonPhuongThucCoc(user, id, data = {}) {
  if (!user || user.vaiTro !== 'NhanVien' || user.chucVu !== 'Sale') {
    throw createServiceError('Chức năng này chỉ dành cho nhân viên sale', 403);
  }
  const maPhieuCoc = String(id || '').trim();
  const phuongThuc = String(data.phuongThucThanhToan || '').trim();
  if (!maPhieuCoc) throw createServiceError('Thiếu mã phiếu đặt cọc');
  if (!['Tiền mặt', 'Chuyển khoản'].includes(phuongThuc)) {
    throw createServiceError('Phương thức thanh toán không hợp lệ');
  }

  try {
    const result = await executeProcedure('dbo.SP_ChonPhuongThucThanhToanCoc', [
      { name: 'PhieuId', type: sql.NVarChar(30), value: maPhieuCoc },
      { name: 'PhuongThucThanhToan', type: sql.NVarChar(20), value: phuongThuc }
    ]);
    return result.recordset[0] || null;
  } catch (error) {
    mapDatabaseError(error, { 50240: 404, 50241: 400, 50242: 409, 50243: 409 });
  }
}


export async function xacNhanThanhToanCoc(user, id, data = {}) {
  if (user?.vaiTro !== 'NhanVien' || user?.chucVu !== 'Kế toán')
    throw createServiceError('Chỉ kế toán được xác nhận tiền chuyển khoản', 403);
  try {
    const pool = await getPool();
    const existing = await pool.request().input('id', sql.VarChar(6), id).query(`
      SELECT PhuongThucThanhToan FROM dbo.PhieuDatCoc WHERE MaPhieuDatCoc=@id`);
    if (existing.recordset[0]?.PhuongThucThanhToan !== 'Chuyển khoản')
      throw createServiceError('Chỉ xác nhận chứng từ chuyển khoản tại đây', 409);
    const result = await executeProcedure('dbo.SP_XacNhanThanhToanCoc', [
      { name: 'PhieuId', type: sql.NVarChar(30), value: String(id || '').trim() },
      { name: 'HopLe', type: sql.Bit, value: Boolean(data.hopLe) },
      { name: 'GhiChu', type: sql.NVarChar(sql.MAX), value: data.ghiChu || null },
      { name: 'QuanLyXacNhanThanhToanId', type: sql.NVarChar(20), value: user.maNguoiDung }
    ]);
    const row = result.recordset[0] || null;
    if (data.hopLe && row?.trangThaiThanhToan === 'Đã TT') await notifyDeposit('paid', String(id));
    return row;
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function thuTienMatCoc(user, id, chungTuThanhToan) {
  if (user?.vaiTro !== 'NhanVien' || user?.chucVu !== 'Sale')
    throw createServiceError('Chỉ Sale được xác nhận đã thu tiền mặt', 403);
  if (!chungTuThanhToan) throw createServiceError('Cần tải ảnh biên nhận đã ký');
  const maPhieu = String(id || '').trim();
  const tx = new sql.Transaction(await getPool());
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const owned = await new sql.Request(tx).input('id', sql.VarChar(6), maPhieu)
      .input('sale', sql.VarChar(6), user.maNguoiDung).query(`
        SELECT 1 FROM dbo.PhieuDatCoc d JOIN dbo.PhieuDangKy p
          ON p.MaDangKy=d.MaPhieuYeuCauDangKy
        WHERE d.MaPhieuDatCoc=@id AND p.MaNhanVienSale=@sale
          AND d.TrangThaiCoc=N'Hiệu lực' AND d.TrangThaiThanhToan=N'Chờ TT'`);
    if (!owned.recordset.length) throw createServiceError('Phiếu cọc không chờ thu hoặc không thuộc Sale này', 409);
    const call = (name, args) => {
      const request = new sql.Request(tx);
      for (const [key, type, value] of args) request.input(key, type, value);
      return request.execute(name);
    };
    await call('dbo.SP_ChonPhuongThucThanhToanCoc', [
      ['PhieuId', sql.NVarChar(30), maPhieu], ['PhuongThucThanhToan', sql.NVarChar(20), 'Tiền mặt']]);
    await call('dbo.SP_CapNhatMinhChungThanhToanCoc', [
      ['PhieuId', sql.NVarChar(30), maPhieu], ['ChungTuThanhToan', sql.NVarChar(500), chungTuThanhToan]]);
    await call('dbo.SP_XacNhanThanhToanCoc', [
      ['PhieuId', sql.NVarChar(30), maPhieu], ['HopLe', sql.Bit, true],
      ['GhiChu', sql.NVarChar(sql.MAX), null], ['QuanLyXacNhanThanhToanId', sql.NVarChar(20), user.maNguoiDung]]);
    await tx.commit();
    const email = await notifyDeposit('paid', maPhieu);
    return { maPhieuDatCoc: maPhieu, trangThaiThanhToan: 'Đã TT', email };
  } catch (error) {
    await tx.rollback().catch(() => {});
    throw error;
  }
}

export async function tienMatChoNopQuy(user) {
  if (user?.vaiTro !== 'NhanVien' || user?.chucVu !== 'Kế toán')
    throw createServiceError('Chỉ kế toán được xem tiền mặt chờ nộp quỹ', 403);
  const pool = await getPool();
  const result = await pool.request().input('staff', sql.VarChar(6), user.maNguoiDung).query(`
    SELECT d.MaPhieuDatCoc AS maPhieuDatCoc,d.SoTienCoc AS soTienCoc,
      d.ThoiGianXacNhanTT AS thuLuc,d.DaNopQuy AS daNopQuy,
      nd.HoTen AS hoTen,p.MaPhong AS maPhong
    FROM dbo.PhieuDatCoc d JOIN dbo.ChiTietDatCoc c ON c.MaPhieuDatCoc=d.MaPhieuDatCoc
    JOIN dbo.Phong p ON p.MaPhong=c.MaPhong
    JOIN dbo.NguoiDung nd ON nd.MaNguoiDung=d.MaKhachHang
    JOIN dbo.NhanVien nv ON nv.MaNhanVien=@staff
    WHERE p.MaChiNhanh=nv.MaChiNhanh AND d.PhuongThucThanhToan=N'Tiền mặt'
      AND d.TrangThaiThanhToan=N'Đã TT' AND d.DaNopQuy=0
    GROUP BY d.MaPhieuDatCoc,d.SoTienCoc,d.ThoiGianXacNhanTT,d.DaNopQuy,nd.HoTen,p.MaPhong
    ORDER BY d.ThoiGianXacNhanTT`);
  return result.recordset;
}

export async function ghiNhanNopQuyCoc(user, id) {
  if (user?.vaiTro !== 'NhanVien' || user?.chucVu !== 'Kế toán')
    throw createServiceError('Chỉ kế toán được xác nhận nộp quỹ', 403);
  try {
    const result = await executeProcedure('dbo.SP_GhiNhanNopQuyCoc', [
      { name: 'MaPhieu', type: sql.VarChar(6), value: String(id || '').trim() },
      { name: 'MaKeToan', type: sql.VarChar(6), value: user.maNguoiDung },
    ]);
    return result.recordset[0] || null;
  } catch (error) { mapDatabaseError(error, { 50310: 403, 50311: 409, 50314: 403 }); }
}
