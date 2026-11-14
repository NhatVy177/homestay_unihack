import * as service from '../services/khachMoi.service.js';
import { getChiTietPhong } from '../services/phongKhamPha.service.js';
import { publicUrlFor } from '../middleware/upload.middleware.js';

export async function getChiTietPhongHandler(req, res, next) {
  try {
    const phong = await getChiTietPhong(req.params.maPhong);
    if (!phong) return res.status(404).json({ message: 'Không tìm thấy phòng.' });
    res.json({ data: phong });
  } catch (error) {
    next(error);
  }
}


export async function getTrangThai(req, res, next) {
  try {
    res.json(await service.getTrangThai(req.user));
  } catch (error) {
    next(error);
  }
}

export async function getTongQuan(req, res, next) {
  try {
    res.json(await service.getTongQuan(req.user));
  } catch (error) {
    next(error);
  }
}

export async function getPhongKhaDung(req, res, next) {
  try {
    res.json(await service.getPhongKhaDung(req.user, req.query));
  } catch (error) {
    next(error);
  }
}

export async function createHoSo(req, res, next) {
  try {
    res.status(201).json(await service.createHoSo(req.user, req.body));
  } catch (error) {
    next(error);
  }
}

export async function getHoSoDetail(req, res, next) {
  try {
    res.json(await service.getHoSoDetail(req.user, req.params.id));
  } catch (error) {
    next(error);
  }
}

export async function updateHoSo(req, res, next) {
  try {
    res.json(await service.updateHoSo(req.user, req.params.id, req.body));
  } catch (error) {
    next(error);
  }
}

export async function getLichXemDetail(req, res, next) {
  try {
    res.json(await service.getLichXemDetail(req.user, req.params.id));
  } catch (error) {
    next(error);
  }
}

export async function yeuCauDieuChinhLich(req, res, next) {
  try {
    res.json(await service.yeuCauDieuChinhLich(req.user, req.params.id, req.body));
  } catch (error) {
    next(error);
  }
}

export async function getDatCoc(req, res, next) {
  try {
    res.json(await service.getDatCoc(req.user));
  } catch (error) {
    next(error);
  }
}

export async function uploadMinhChung(req, res, next) {
  try {
    res.json(await service.uploadMinhChungKhachHang(req.user, req.params.id, req.body));
  } catch (error) {
    next(error);
  }
}

export async function getHopDongDashboard(req, res, next) {
  try {
    res.json(await service.getHopDongDashboard(req.user, req.query));
  } catch (error) {
    next(error);
  }
}

export async function guiYeuCauTraPhong(req, res, next) {
  try {
    const data = await service.guiYeuCauTraPhong(req.user, req.body);
    res.status(201).json({ data, message: 'Đã gửi yêu cầu trả phòng.' });
  } catch (error) {
    next(error);
  }
}

export async function huyYeuCauTraPhong(req, res, next) {
  try {
    const data = await service.huyYeuCauTraPhong(req.user, req.params.id);
    res.json({ data, message: 'Đã hủy yêu cầu trả phòng.' });
  } catch (error) {
    next(error);
  }
}

export async function phanHoiDoiSoatTraPhong(req, res, next) {
  try {
    const data = await service.phanHoiDoiSoatTraPhong(req.user, req.params.id, req.body);
    res.json({ data, message: 'Đã ghi nhận phản hồi đối soát.' });
  } catch (error) {
    next(error);
  }
}

export async function ghiNhanThanhToanDoiSoatTraPhong(req, res, next) {
  try {
    const chungTuThanhToan = req.file ? publicUrlFor(req.file.filename) : (req.body.chungTuThanhToan || null);
    const data = await service.ghiNhanThanhToanDoiSoatTraPhong(req.user, req.params.id, {
      ...req.body,
      chungTuThanhToan
    });
    res.json({ data, message: 'Đã ghi nhận thông tin thanh toán.' });
  } catch (error) {
    next(error);
  }
}

export async function getPhongQuanTam(req, res, next) {
  try {
    res.json(await service.getPhongQuanTam(req.user, req.params.id));
  } catch (error) {
    next(error);
  }
}

export async function themPhongQuanTam(req, res, next) {
  try {
    res.status(201).json(await service.themPhongQuanTam(req.user, req.params.id, req.body?.maPhong));
  } catch (error) {
    next(error);
  }
}

export async function goPhongQuanTam(req, res, next) {
  try {
    res.json(await service.goPhongQuanTam(req.user, req.params.id, req.params.maPhong));
  } catch (error) {
    next(error);
  }
}

import { getHoaDonCuaKhach } from '../services/khachHoaDon.service.js';
export async function getHoaDon(req, res, next) {
  try { res.json(await getHoaDonCuaKhach(req.user)); } catch (error) { next(error); }
}

import { getYeuCauGiuChoCuaKhach } from '../services/khachGiuCho.service.js';
export async function getYeuCauGiuCho(req, res, next) {
  try { res.json(await getYeuCauGiuChoCuaKhach(req.user)); } catch (error) { next(error); }
}

// D-026 mục 4: khách tự khai người ở (kiểm tra sở hữu phiếu trong service).
import * as khachCuTru from '../services/khachCuTru.service.js';
export async function getCuTru(req, res, next) {
  try { res.json(await khachCuTru.getCuTruCuaKhach(req.user)); } catch (error) { next(error); }
}
export async function khaiCuTru(req, res, next) {
  try { res.json(await khachCuTru.khaiCuTru(req.user, req.body)); } catch (error) { next(error); }
}
