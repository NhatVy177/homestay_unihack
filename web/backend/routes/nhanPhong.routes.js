import { Router } from 'express';
import * as controller from '../controllers/nhanPhong.controller.js';
import { guardRecord } from '../middleware/recordAccess.middleware.js';

const guardContract = guardRecord('contract', 'maHopDong');
const guardHandover = guardRecord('handover', 'maBienBan');

const router = Router();

router.get('/danh-sach', controller.getDanhSachChoNhanPhong);
router.post('/thong-tin-cu-tru', controller.capNhatThongTinCuTru);
router.get('/cu-tru/phieu-coc', controller.traCuuPhieuCocCapNhatCuTru);
router.post('/cu-tru/ho-so', controller.luuHoSoCuTru);
router.post('/cu-tru/ho-so/:maHoSo/gui-duyet', controller.guiDuyetHoSoCuTru);
router.get('/cu-tru/cho-duyet', controller.layDanhSachHoSoCuTruChoDuyet);
router.get('/cu-tru/ho-so/:maHoSo', controller.layChiTietHoSoCuTru);
router.post('/cu-tru/ho-so/:maHoSo/duyet', controller.duyetHoSoCuTru);
router.post('/hop-dong', controller.lapHopDongThue);
router.post('/thu-dau-ky', controller.ghiNhanKhoanThuNhanPhong);
router.get('/cho-thu-dau-ky', controller.getDanhSachHDChoThuDauKy);
router.post('/ghi-nhan-thu-dau-ky', controller.ghiNhanThuDauKy);
router.get('/tinh-khoan-thu/:maHopDong', guardContract, controller.tinhKhoanThuNhanPhong);
router.get('/chi-tiet-thu/:maHopDong', guardContract, controller.layChiTietThuNhanPhong);
router.get('/chung-tu-ky-dau/:maHopDong', guardContract, controller.layChungTuKyDau);
router.get('/kiem-tra-ban-giao/:maHopDong', guardContract, controller.kiemTraDieuKienBanGiaoSauThuTien);
router.get('/ban-giao/ket-qua/:maBienBan', guardHandover, controller.layKetQuaLapBienBanBanGiao);
router.get('/ban-giao/chi-tiet/:maBienBan', guardHandover, controller.layChiTietBienBanBanGiao);
router.get('/ban-giao/:maHopDong/dieu-kien', guardContract, controller.kiemTraDieuKienBanGiaoVao);
router.get('/ban-giao/:maHopDong/tai-san', guardContract, controller.layDanhSachTaiSanBanGiaoTheoHopDong);
router.get('/ban-giao/:maHopDong', guardContract, controller.traCuuHopDongBanGiao);
router.post('/ban-giao', controller.lapBienBanBanGiao);
router.get('/cho-ban-giao', controller.getDanhSachChoBanGiaoVao);
router.get('/tai-san-ban-giao/:maPhong', controller.getDanhSachTaiSanBanGiao);

export default router;
