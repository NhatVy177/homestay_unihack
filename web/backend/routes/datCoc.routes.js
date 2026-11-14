import { Router } from 'express';
import * as controller from '../controllers/datCoc.controller.js';
import { uploadChungTu } from '../middleware/upload.middleware.js';

const router = Router();

router.get('/', controller.getPhieuDatCoc);
router.post('/gui-yeu-cau', controller.guiYeuCauDatCoc);
// D-026: khách tự gửi yêu cầu giữ chỗ sau khi đã xem phòng.
router.get('/khach/phong-da-xem', controller.getPhongDaXemKhach);
router.post('/khach/gui-yeu-cau', controller.khachGuiYeuCauGiuCho);
// DC01 (A4) - Sale chỉnh sửa thông tin cá nhân/liên hệ/giấy tờ khách hàng trước khi gửi yêu cầu.
router.put('/gui-yeu-cau/:maDangKy/thong-tin-ca-nhan', controller.capNhatThongTinCaNhan);
// DC01 - Sale chốt phòng khách muốn thuê (trong các phòng khách đã xem).
router.put('/gui-yeu-cau/:maDangKy/phong-chot', controller.chonPhongKhachChot);
router.get('/cho-xac-nhan', controller.getDanhSachChoXacNhan);
router.get('/giuong-trong', controller.getGiuongTrong);
// DC01 - các phòng khách đã xem, để Sale chọn phòng chốt.
router.get('/phong-da-xem', controller.getPhongDaXem);
router.get('/cho-ghi-nhan-chung-tu', controller.getDanhSachChoGhiNhanChungTu);
router.get('/cho-xac-nhan-thanh-toan', controller.getDanhSachChoXacNhanThanhToan);
router.put('/:id/xac-nhan-kha-nang-nhan-coc', controller.xacNhanKhaNangNhanCoc);
router.get('/tien-mat-cho-nop-quy', controller.tienMatChoNopQuy);
router.put('/:id/nop-quy', controller.ghiNhanNopQuy);
router.post('/:id/thu-tien-mat', uploadChungTu.single('file'), controller.thuTienMat);
router.put('/:id/phat-hanh-thanh-toan', controller.phatHanhYeuCauThanhToanCoc);
router.put('/:id/minh-chung-thanh-toan', uploadChungTu.single('file'), controller.capNhatMinhChungThanhToanCoc);
// DC04 - khách hàng tự ghi nhận chứng từ (cùng multer + SP, có check quyền sở hữu trong service).
router.put('/:id/minh-chung-khach', uploadChungTu.single('file'), controller.capNhatMinhChungCocKhach);
// DC04 - khách hàng chọn phương thức thanh toán (Tiền mặt / Chuyển khoản).
router.put('/:id/phuong-thuc-khach', controller.chonPhuongThucCocKhach);
// DC04 - nhân viên sale chọn phương thức thanh toán (Tiền mặt / Chuyển khoản).
router.put('/:id/phuong-thuc', controller.chonPhuongThucCoc);
router.put('/:id/xac-nhan-thanh-toan', controller.xacNhanThanhToanCoc);

export default router;
