import { Router } from 'express';
import * as controller from '../controllers/hopDong.controller.js';
import * as evidence from '../controllers/contractEvidence.controller.js';
import { danhSachHopDongQuanLy } from '../services/quanLyHopDong.service.js';
import { guardRecord, allowedSlipIds } from '../middleware/recordAccess.middleware.js';

const guardSlip = guardRecord('slip', 'id');
const guardContract = guardRecord('contract', 'id');

const router = Router();

router.get('/phieu-coc/:id/chinh-sach', evidence.policy);
router.post('/phieu-coc/:id/chinh-sach/xac-nhan', evidence.confirmPolicy);
router.get('/:id/ban-ky', evidence.metadata);
router.get('/:id/ban-ky/file', evidence.download);
router.post('/:id/ban-ky', evidence.signedUpload, evidence.upload);

router.get('/phieu-coc', async (req, res, next) => {
  // Danh sách phiếu cọc chỉ gồm hồ sơ người dùng được xem (khách: của mình; nhân viên: chi nhánh mình).
  try {
    const allowed = await allowedSlipIds(req.user);
    const send = res.json.bind(res);
    if (allowed) res.json = list => send(Array.isArray(list) ? list.filter(item => allowed.has(item.maPhieuDatCoc)) : list);
    await controller.traCuuPhieuCoc(req, res, next);
  } catch (error) { next(error); }
});
router.get('/phieu-coc/:id', guardSlip, controller.layChiTietPhieuCoc);
router.get('/phieu-coc/:id/kiem-tra', guardSlip, controller.kiemTraDieuKienLapHopDong);
router.get('/phieu-coc/:id/cu-tru-duyet', guardSlip, controller.layHoSoCuTruDaDuyetTheoPhieuCoc);
router.get('/dich-vu', controller.layDanhSachDichVu);
router.get('/quan-ly', controller.layDanhSachQuanLy);
router.get('/quan-ly-chi-nhanh', async (req, res, next) => { try { res.json(await danhSachHopDongQuanLy(req.user)); } catch (error) { next(error); } });
router.post('/phieu-coc/:id/thanh-vien/kiem-tra', guardSlip, controller.kiemTraThanhVienHopDongTam);
router.post('/', controller.lapHopDongThue);
router.get('/phieu-coc/:id/hop-dong', guardSlip, controller.layChiTietHopDongTheoPhieuCoc);
router.get('/:id', guardContract, controller.layChiTietHopDongThue);

export default router;
