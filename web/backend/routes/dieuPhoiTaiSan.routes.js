import { Router } from 'express';
import {
  chuyenTaiSan,
  layLichSuDieuPhoi,
  layTaiSanPhong,
  layTonKho,
} from '../services/dieuPhoiTaiSan.service.js';

const router = Router();

router.get('/kho', async (req, res, next) => {
  try { res.json({ data: await layTonKho(req.user, req.query) }); } catch (error) { next(error); }
});
router.get('/phong', async (req, res, next) => {
  try { res.json({ data: await layTaiSanPhong(req.user, req.query) }); } catch (error) { next(error); }
});
router.get('/lich-su', async (req, res, next) => {
  try { res.json({ data: await layLichSuDieuPhoi(req.user, req.query) }); } catch (error) { next(error); }
});
router.post('/chuyen', async (req, res, next) => {
  try { res.status(201).json({ data: await chuyenTaiSan(req.user, req.body) }); } catch (error) { next(error); }
});

export default router;
