import * as service from '../services/datCoc.service.js';
import { publicUrlFor } from '../middleware/upload.middleware.js';
import { unlink } from 'node:fs/promises';

export async function getPhieuDatCoc(req, res, next) {
  try { res.json(await service.getPhieuDatCoc(req.user.maNguoiDung)); } catch (err) { next(err); }
}
export async function khachGiuCho(req, res, next) {
  try { res.status(201).json(await service.khachGiuCho(req.user, req.body)); } catch (err) { next(err); }
}
export async function xacNhanKhaNangNhanCoc(req, res, next) {
  try { res.json(await service.xacNhanKhaNangNhanCoc(req.user, req.params.id, req.body)); } catch (err) { next(err); }
}
export async function phatHanhYeuCauThanhToanCoc(req, res, next) {
  try { res.json(await service.phatHanhYeuCauThanhToanCoc(req.params.id, req.body)); } catch (err) { next(err); }
}
export async function capNhatMinhChungThanhToanCoc(req, res, next) {
  try {
    // File chứng từ (ảnh/PDF) lưu ở backend/uploads/chung-tu; DB chỉ giữ ĐƯỜNG DẪN.
    const chungTuThanhToan = req.file ? publicUrlFor(req.file.filename) : (req.body.chungTuThanhToan || null);
    res.json(await service.capNhatMinhChungThanhToanCoc(req.params.id, { chungTuThanhToan }));
  } catch (err) { next(err); }
}
export async function capNhatMinhChungCocKhach(req, res, next) {
  try {
    // Khách up file chứng từ (ảnh/PDF) -> lưu ở backend/uploads/chung-tu; DB chỉ giữ ĐƯỜNG DẪN.
    const chungTuThanhToan = req.file ? publicUrlFor(req.file.filename) : (req.body.chungTuThanhToan || null);
    res.json(await service.capNhatMinhChungCocKhach(req.user, req.params.id, { chungTuThanhToan }));
  } catch (err) { next(err); }
}
export async function chonPhuongThucCocKhach(req, res, next) {
  // Khách chọn phương thức thanh toán cho phiếu cọc của mình (DC04). Kiểm tra sở hữu trong service.
  try { res.json(await service.chonPhuongThucCocKhach(req.user, req.params.id, req.body)); } catch (err) { next(err); }
}
export async function chonPhuongThucCoc(req, res, next) {
  // Nhân viên sale chọn phương thức thanh toán cho phiếu cọc (DC04). Kiểm tra vai trò Sale trong service.
  try { res.json(await service.chonPhuongThucCoc(req.user, req.params.id, req.body)); } catch (err) { next(err); }
}

export async function xacNhanThanhToanCoc(req, res, next) {
  try { res.json(await service.xacNhanThanhToanCoc(req.user, req.params.id, req.body)); } catch (err) { next(err); }
}
export async function guiYeuCauDatCoc(req, res, next) {
  try { res.status(200).json(await service.guiYeuCauDatCoc(req.user, req.body)); } catch (err) { next(err); }
}
export async function capNhatThongTinCaNhan(req, res, next) {
  // DC01 (A4) - Sale chỉnh sửa thông tin cá nhân/liên hệ/giấy tờ khách hàng trước khi gửi yêu cầu.
  try { res.json(await service.capNhatThongTinCaNhan(req.params.maDangKy, req.body)); } catch (err) { next(err); }
}
export async function getDanhSachChoXacNhan(req, res, next) {
  try { res.json(await service.getDanhSachChoXacNhan(req.user.maNguoiDung)); } catch (err) { next(err); }
}
export async function getGiuongTrong(req, res, next) {
  try { res.json(await service.getGiuongTrong(req.query.maPhong)); } catch (err) { next(err); }
}
export async function getPhongDaXem(req, res, next) {
  // DC01 - các phòng khách đã xem; Sale chốt 1 phòng trong số này.
  try { res.json(await service.getPhongDaXem(req.query.maDangKy)); } catch (err) { next(err); }
}
export async function chonPhongKhachChot(req, res, next) {
  // DC01 - Sale chốt/đổi phòng khách muốn thuê.
  try {
    res.json(await service.chonPhongKhachChot(req.user, req.params.maDangKy, req.body?.maPhong));
  } catch (err) { next(err); }
}
export async function getDanhSachChoGhiNhanChungTu(req, res, next) {
  try { res.json(await service.getDanhSachChoGhiNhanChungTu(req.user.maNguoiDung)); } catch (err) { next(err); }
}
export async function getDanhSachChoXacNhanThanhToan(req, res, next) {
  try { res.json(await service.getDanhSachChoXacNhanThanhToan(req.user)); } catch (err) { next(err); }
}

export async function thuTienMat(req, res, next) {
  try {
    const path = req.file ? publicUrlFor(req.file.filename) : null;
    res.json(await service.thuTienMatCoc(req.user, req.params.id, path));
  } catch (err) {
    if (req.file?.path) await unlink(req.file.path).catch(() => {});
    next(err);
  }
}
export async function tienMatChoNopQuy(req, res, next) {
  try { res.json(await service.tienMatChoNopQuy(req.user)); } catch (err) { next(err); }
}
export async function ghiNhanNopQuy(req, res, next) {
  try { res.json(await service.ghiNhanNopQuyCoc(req.user, req.params.id)); } catch (err) { next(err); }
}
