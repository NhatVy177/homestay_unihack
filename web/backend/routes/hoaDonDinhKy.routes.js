import { Router } from 'express';
import * as service from '../services/hoaDonDinhKy.service.js';

// Hóa đơn định kỳ của kế toán (theo màn của nhóm Hằng). Quyền kế toán + chi nhánh được kiểm trong service.
const router = Router();
const handle = (fn) => async (req, res, next) => { try { res.json(await fn(req)); } catch (error) { next(error); } };

router.get('/hop-dong', handle((req) => service.danhSachHopDong(req.user)));
router.get('/hop-dong/:maHopDong', handle((req) => service.chiTietLapHoaDon(req.user, req.params.maHopDong)));
router.post('/', handle((req) => service.lapHoaDon(req.user, req.body)));
router.get('/', handle((req) => service.danhSachHoaDon(req.user)));
router.get('/:maHoaDon', handle((req) => service.chiTietHoaDon(req.user, req.params.maHoaDon)));
router.post('/:maHoaDon/thu-tien', handle((req) => service.thuTien(req.user, req.params.maHoaDon, req.body)));
router.post('/phi-phat-sinh/them', handle((req) => service.themPhiPhatSinh(req.user, req.body)));
router.post('/phi-phat-sinh/:maPhi/xac-nhan', handle((req) => service.xacNhanPhiPhatSinh(req.user, req.params.maPhi)));
router.delete('/phi-phat-sinh/:maPhi', handle((req) => service.xoaPhiPhatSinh(req.user, req.params.maPhi)));

export default router;
