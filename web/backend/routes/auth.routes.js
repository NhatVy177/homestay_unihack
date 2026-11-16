import { Router } from 'express';
import * as controller from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/dang-ky', controller.dangKy);
router.post('/dang-nhap', controller.dangNhap);
router.get('/kiem-tra-sdt', controller.kiemTraSoDienThoai);
router.get('/google/cau-hinh', controller.cauHinhGoogle);
router.post('/google', controller.dangNhapGoogle);
router.post('/google/hoan-tat', controller.hoanTatDangKyGoogle);
router.get('/toi', requireAuth, controller.getToi);
router.post('/dang-xuat', requireAuth, controller.dangXuat);

export default router;
