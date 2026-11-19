import { Router } from 'express';
import * as service from '../services/thuTienMat.service.js';

// D-080: kế toán thu tiền mặt cho hóa đơn đặt cọc và nhận phòng.
const router = Router();
router.get('/', async (req, res, next) => { try { res.json(await service.danhSachChoThu(req.user)); } catch (error) { next(error); } });
router.post('/', async (req, res, next) => { try { res.status(201).json(await service.ghiNhanThuTienMat(req.user, req.body)); } catch (error) { next(error); } });
export default router;
