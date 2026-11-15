import * as service from '../services/nhanPhong.service.js';
import { onWeb2HandoverCreated } from '../integrations/avalanche/index.js';
import * as kyDauChungTu from '../services/kyDauChungTu.service.js';

export async function getDanhSachChoNhanPhong(req, res, next) {
  try { res.json(await service.getDanhSachChoNhanPhong(req.user.maNguoiDung)); } catch (err) { next(err); }
}

export async function capNhatThongTinCuTru(req, res, next) {
  try { res.status(201).json(await service.capNhatThongTinCuTru(req.body)); } catch (err) { next(err); }
}
export async function traCuuPhieuCocCapNhatCuTru(req, res, next) {
  try { res.json(await service.traCuuPhieuCocCapNhatCuTru({ tuKhoa: req.query.tuKhoa })); } catch (err) { next(err); }
}
export async function luuHoSoCuTru(req, res, next) {
  try { res.status(201).json(await service.luuHoSoCuTru({ ...req.body, maNhanVienSale: req.user.maNguoiDung })); } catch (err) { next(err); }
}
export async function guiDuyetHoSoCuTru(req, res, next) {
  try { res.json(await service.guiDuyetHoSoCuTru(req.params.maHoSo)); } catch (err) { next(err); }
}
export async function layDanhSachHoSoCuTruChoDuyet(req, res, next) {
  try { res.json(await service.layDanhSachHoSoCuTruChoDuyet({ tuKhoa: req.query.tuKhoa, trangThai: req.query.trangThai })); } catch (err) { next(err); }
}
export async function layChiTietHoSoCuTru(req, res, next) {
  try { res.json(await service.layChiTietHoSoCuTru(req.params.maHoSo)); } catch (err) { next(err); }
}
export async function duyetHoSoCuTru(req, res, next) {
  try { res.json(await service.duyetHoSoCuTru({ ...req.body, maHoSoCuTru: req.params.maHoSo, maNhanVienQuanLy: req.user.maNguoiDung })); } catch (err) { next(err); }
}
export async function lapHopDongThue(req, res, next) {
  try { res.status(201).json(await service.lapHopDongThue(req.body)); } catch (err) { next(err); }
}
export async function ghiNhanKhoanThuNhanPhong(req, res, next) {
  try { res.status(201).json(await service.ghiNhanKhoanThuNhanPhong({ ...req.body, maNhanVienKeToan: req.user.maNguoiDung })); } catch (err) { next(err); }
}
export async function lapBienBanBanGiao(req, res, next) {
  try {
    const result = await service.lapBienBanBanGiao({ ...req.body, maNhanVienQuanLy: req.user.maNguoiDung });
    // D-012: phát hành bản xem cho khách xác nhận điện tử; lỗi ở bước này không làm hỏng biên bản Web2.
    const xacNhanDienTu = await onWeb2HandoverCreated(req.user, result?.maBienBan || result?.ketQua?.maBienBan);
    res.status(201).json({ ...result, xacNhanDienTu });
  } catch (err) { next(err); }
}
export async function traCuuHopDongBanGiao(req, res, next) {
  try { res.json(await service.traCuuHopDongBanGiao(req.params.maHopDong)); } catch (err) { next(err); }
}
export async function kiemTraDieuKienBanGiaoVao(req, res, next) {
  try { res.json(await service.kiemTraDieuKienBanGiaoVao(req.params.maHopDong)); } catch (err) { next(err); }
}
export async function layDanhSachTaiSanBanGiaoTheoHopDong(req, res, next) {
  try { res.json(await service.layDanhSachTaiSanBanGiaoTheoHopDong(req.params.maHopDong)); } catch (err) { next(err); }
}
export async function layKetQuaLapBienBanBanGiao(req, res, next) {
  try { res.json(await service.layKetQuaLapBienBanBanGiao(req.params.maBienBan)); } catch (err) { next(err); }
}
export async function layChiTietBienBanBanGiao(req, res, next) {
  try { res.json(await service.layChiTietBienBanBanGiao(req.params.maBienBan)); } catch (err) { next(err); }
}
export async function getDanhSachHDChoThuDauKy(req, res, next) {
  try {
    const { trangThaiThuTien, tuKhoa, maPhong, maGiuong } = req.query;
    res.json(await service.getDanhSachHDChoThuDauKy({ trangThaiThuTien, tuKhoa, maPhong, maGiuong }));
  } catch (err) {
    next(err);
  }
}
export async function ghiNhanThuDauKy(req, res, next) {
  try { res.status(201).json(await service.ghiNhanThuDauKy({ ...req.body, maNhanVienKeToan: req.user.maNguoiDung })); } catch (err) { next(err); }
}
export async function layChungTuKyDau(req, res, next) {
  try { res.json(await kyDauChungTu.layChungTuKyDau(req.params.maHopDong)); } catch (err) { next(err); }
}
export async function tinhKhoanThuNhanPhong(req, res, next) {
  try {
    res.json(await service.tinhKhoanThuNhanPhong(req.params.maHopDong));
  } catch (err) {
    next(err);
  }
}
export async function layChiTietThuNhanPhong(req, res, next) {
  try {
    res.json(await service.layChiTietThuNhanPhong(req.params.maHopDong));
  } catch (err) {
    next(err);
  }
}
export async function kiemTraDieuKienBanGiaoSauThuTien(req, res, next) {
  try {
    res.json(await service.kiemTraDieuKienBanGiaoSauThuTien(req.params.maHopDong));
  } catch (err) {
    next(err);
  }
}
export async function getDanhSachChoBanGiaoVao(req, res, next) {
  try { res.json(await service.getDanhSachChoBanGiaoVao()); } catch (err) { next(err); }
}
export async function getDanhSachTaiSanBanGiao(req, res, next) {
  try { res.json(await service.getDanhSachTaiSanBanGiao(req.params.maPhong)); } catch (err) { next(err); }
}
