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
router.get('/loai-phong', getLoaiPhong);
router.get('/kham-pha-phong/bo-loc', getBoLocKhamPhaPhong);
router.get('/kham-pha-phong', getPhongKhamPha);

export default router;
