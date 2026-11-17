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
router.post('/quen-mat-khau', controller.quenMatKhau);
router.post('/dat-lai-mat-khau', controller.datLaiMatKhau);
router.post('/doi-mat-khau', requireAuth, controller.doiMatKhau);
router.put('/avatar', requireAuth, controller.capNhatAvatar);
router.delete('/avatar', requireAuth, controller.xoaAvatar);
router.get('/toi', requireAuth, controller.getToi);
router.post('/dang-xuat', requireAuth, controller.dangXuat);

export default router;
