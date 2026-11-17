import express from 'express';
import {
  getBoLocKhamPhaPhong,
  getLoaiPhong,
  getPhongKhamPha,
  getPhongNoiBat,
  getChiTietPhongCongKhai
} from '../controllers/trangChu.controller.js';

import { sharedStatsReader } from '../integrations/avalanche/publicStats.js';
import { executeQuery } from '../database/connection.js';

const router = express.Router();

// Public routes — không cần requireAuth
router.get('/phong-noi-bat', getPhongNoiBat);
router.get('/phong/:maPhong', getChiTietPhongCongKhai);
// Số liệu minh bạch đọc từ chuỗi (chỉ số đếm, số tiền gộp, mã giao dịch). Chưa bật Avalanche hoặc chưa quét xong thì ready=false.
router.get('/minh-bach', async (req, res) => {
  try {
    const reader = sharedStatsReader(process.env, { query: executeQuery });
    if (!reader) return res.json({ ready: false });
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ ...(await reader.snapshot()), explorer: process.env.AVALANCHE_CHAIN_ID === '43113' || !process.env.AVALANCHE_CHAIN_ID ? 'https://testnet.snowtrace.io' : null, network: 'Avalanche Fuji (mạng thử nghiệm)' });
  } catch { res.json({ ready: false }); }
});
// Bảng giá dịch vụ công khai (chỉ tên, đơn vị, đơn giá) cho trang Dịch vụ.
router.get('/dich-vu', async (req, res, next) => {
  try {
    const { recordset } = await executeQuery(`SELECT dv.MaDichVu AS maDichVu, dv.TenDichVu AS tenDichVu, dv.DonViTinh AS donViTinh, dv.DonGia AS donGia, dv.Nhom AS nhom, dv.MoTa AS moTa, dv.TrangThai AS trangThai, COUNT(dvhd.MaChiTietDVHD) AS soHopDong FROM dbo.DichVu dv LEFT JOIN dbo.DichVuHopDong dvhd ON dvhd.MaDichVu = dv.MaDichVu GROUP BY dv.MaDichVu, dv.TenDichVu, dv.DonViTinh, dv.DonGia, dv.Nhom, dv.MoTa, dv.TrangThai ORDER BY dv.MaDichVu`);
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ data: recordset.map((row) => ({ ...row, donGia: Number(row.donGia), soHopDong: Number(row.soHopDong) })) });
  } catch (error) { next(error); }
});
router.get('/loai-phong', getLoaiPhong);
router.get('/kham-pha-phong/bo-loc', getBoLocKhamPhaPhong);
router.get('/kham-pha-phong', getPhongKhamPha);

export default router;
