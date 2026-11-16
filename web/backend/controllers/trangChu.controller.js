import { getPool } from '../database/connection.js';
import { getBoLocPhongKhamPha, getDanhSachPhongKhamPha, getChiTietPhong } from '../services/phongKhamPha.service.js';
import { toPublicRoomDetail } from '../models/publicRoom.dto.js';

export async function getChiTietPhongCongKhai(req, res, next) {
  const roomId = String(req.params.maPhong || '');
  if (!/^[a-zA-Z0-9]{4}$/.test(roomId)) return res.status(400).json({ message: 'Mã phòng không hợp lệ.' });
  try {
    const room = await getChiTietPhong(roomId);
    if (!room) return res.status(404).json({ message: 'Không tìm thấy phòng.' });
    res.json({ data: toPublicRoomDetail(room) });
  } catch (error) { next(error); }
}

/**
 * GET /api/trang-chu/phong-noi-bat
 * Public endpoint — không cần xác thực.
 * Trả về tối đa 3 phòng nổi bật, JOIN với LoaiPhong và ChiNhanh.
 * Không trả về TinhTrang (bỏ trạng thái phòng theo yêu cầu).
 */
export async function getPhongNoiBat(req, res, next) {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT TOP 3
        p.MaPhong,
        p.TenPhong,
        p.GioiTinhChoPhep,
        lp.MaLoaiPhong,
        lp.TenLoaiPhong,
        lp.SucChuaToiDa,
        lp.MoTa,
        lp.GiaThueTheoGiuong,
        lp.GiaThueNguyenPhong,
        cn.TenChiNhanh,
        cn.DiaChi,
        (SELECT TOP 1 UrlImg FROM HinhAnhPhong WHERE MaPhong = p.MaPhong ORDER BY STTAnh) AS UrlImg
      FROM Phong p
      INNER JOIN LoaiPhong lp ON p.MaLoaiPhong = lp.MaLoaiPhong
      INNER JOIN ChiNhanh cn ON p.MaChiNhanh = cn.MaChiNhanh
      ORDER BY p.MaPhong
    `);

    res.json({ data: result.recordset });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/trang-chu/loai-phong
 * Public — danh sách loại phòng để hiển thị trong search filter.
 */
export async function getLoaiPhong(req, res, next) {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT MaLoaiPhong, TenLoaiPhong, SucChuaToiDa, GiaThueTheoGiuong, GiaThueNguyenPhong
      FROM LoaiPhong
      ORDER BY MaLoaiPhong
    `);
    res.json({ data: result.recordset });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/trang-chu/kham-pha-phong
 * Public endpoint cho trang khám phá phòng, dữ liệu lấy trực tiếp từ DB.
 */
export async function getPhongKhamPha(req, res, next) {
  try {
    const data = await getDanhSachPhongKhamPha(req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/trang-chu/kham-pha-phong/bo-loc
 * Public endpoint lấy option filter từ DB.
 */
export async function getBoLocKhamPhaPhong(req, res, next) {
  try {
    const data = await getBoLocPhongKhamPha();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
