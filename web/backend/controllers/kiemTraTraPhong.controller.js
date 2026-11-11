import multer from 'multer';
import { kiemTraTraPhongService } from '../services/kiemTraTraPhong.service.js';
import { checkoutComparison } from '../services/traPhongSoSanh.service.js';

export const quanLyDanhSachChoXuLy = async (req, res, next) => {
  try {
    const maNhanVien = req.user.maNguoiDung;
    const trangThaiLoc = req.query.trangThaiLoc || 'Chờ xử lý';
    const data = await kiemTraTraPhongService.quanLyDanhSachChoXuLy(maNhanVien, trangThaiLoc);
    res.json({ danhSach: data });
  } catch (error) {
    next(error);
  }
};

export const quanLyChiTietPhieu = async (req, res, next) => {
  try {
    const { maPhieuTra } = req.params;
    const maNhanVien = req.user.maNguoiDung;
    const data = await kiemTraTraPhongService.quanLyChiTietPhieu(maPhieuTra, maNhanVien);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const quanLyXacNhanHuyCoc = async (req, res, next) => {
  try {
    const { maPhieuTra } = req.body;
    const maNhanVien = req.user.maNguoiDung;
    await kiemTraTraPhongService.quanLyXacNhanHuyCoc(maPhieuTra, maNhanVien);
    res.status(200).json({ message: 'Xác nhận hủy cọc thành công.' });
  } catch (error) {
    next(error);
  }
};

export const quanLyLapBienBanKiemTra = async (req, res, next) => {
  try {
    const { maPhieuTra, ngayTraThucTe, tinhTrangPhong, dsHuHong } = req.body;
    const maNhanVien = req.user.maNguoiDung;
    await kiemTraTraPhongService.quanLyLapBienBanKiemTra(maPhieuTra, maNhanVien, ngayTraThucTe, tinhTrangPhong, dsHuHong);
    res.status(201).json({ message: 'Lập biên bản kiểm tra thành công.' });
  } catch (error) {
    next(error);
  }
};

// C2 / D-030 (1): move-in condition next to the inspection, and private inspection photos.
const parsePhoto = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } }).single('file');
export const anhUpload = (req, res, next) => parsePhoto(req, res, error => next(error
  ? Object.assign(new Error('Chọn một ảnh tối đa 5 MB.'), { statusCode: 400 }) : undefined));
const handle = fn => async (req, res, next) => { try { await fn(req, res); } catch (error) { next(error); } };

export const quanLyBanGiaoVao = handle(async (req, res) => res.json(await checkoutComparison.moveIn(req.user, req.params.maPhieuTra)));
export const quanLyDanhSachAnh = handle(async (req, res) => res.json(await checkoutComparison.photos(req.user, req.params.maPhieuTra)));
export const quanLyTaiAnh = handle(async (req, res) => res.status(201)
  .json(await checkoutComparison.upload(req.user, req.params.maPhieuTra, req.file, req.body?.keyTaiSan)));
export const quanLyXoaAnh = handle(async (req, res) => {
  await checkoutComparison.remove(req.user, req.params.maPhieuTra, req.params.maAnh);
  res.json({ message: 'Đã xóa ảnh.' });
});
export const quanLyFileAnh = handle(async (req, res) => {
  const { photo, buffer } = await checkoutComparison.read(req.user, req.params.maPhieuTra, req.params.maAnh);
  res.setHeader('Content-Type', photo.mediaType);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(buffer);
});
