import { Router } from 'express';
import * as controller from '../controllers/suaChuaBaoTri.controller.js';

// Gắn sau requireAuth ở index.js; quyền theo vai trò nằm trong service (khách: của mình; quản lý: chi nhánh của mình).
const router = Router();

router.get('/hop-dong-cua-toi', controller.hopDongCuaKhach);
router.get('/hop-dong/:maHopDong', controller.theoHopDong);
router.get('/', controller.danhSach);
router.post('/', controller.taoYeuCau);
router.put('/:id/tiep-nhan', controller.tiepNhan);
router.put('/:id/hoan-tat', controller.hoanTat);
router.put('/:id/tu-choi', controller.tuChoi);

export default router;
