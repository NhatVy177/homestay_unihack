import { httpClient } from '../../api/httpClient.js';

export const datCocApi = {
  getAll: () => httpClient.get('/dat-coc'),
  thuTienMat: (id, formData) => httpClient.post(`/dat-coc/${id}/thu-tien-mat`, formData, { headers: { 'Content-Type': undefined } }),
  tienMatChoNopQuy: () => httpClient.get('/dat-coc/tien-mat-cho-nop-quy'),
  ghiNhanNopQuy: (id) => httpClient.put(`/dat-coc/${id}/nop-quy`),
  xacNhanKhaNang: (id, data) => httpClient.put(`/dat-coc/${id}/xac-nhan-kha-nang-nhan-coc`, data),
  phatHanhThanhToan: (id, data) => httpClient.put(`/dat-coc/${id}/phat-hanh-thanh-toan`, data),
  // formData: FormData gồm file ảnh + các trường giao dịch (multipart)
  capNhatMinhChung: (id, formData) => httpClient.put(`/dat-coc/${id}/minh-chung-thanh-toan`, formData, { headers: { 'Content-Type': undefined } }),
  // DC04 - khách hàng tự gửi chứng từ (FormData: file ảnh/PDF + ghiChu)
  capNhatMinhChungKhach: (id, formData) => httpClient.put(`/dat-coc/${id}/minh-chung-khach`, formData, { headers: { 'Content-Type': undefined } }),
  // DC04 - khách hàng chọn phương thức thanh toán ({ phuongThucThanhToan: 'Tiền mặt' | 'Chuyển khoản' })
  chonPhuongThucKhach: (id, data) => httpClient.put(`/dat-coc/${id}/phuong-thuc-khach`, data),
  chonPhuongThuc: (id, data) => httpClient.put(`/dat-coc/${id}/phuong-thuc`, data),
  xacNhanThanhToan: (id, data) => httpClient.put(`/dat-coc/${id}/xac-nhan-thanh-toan`, data),
  guiYeuCauDatCoc: (data) => httpClient.post('/dat-coc/gui-yeu-cau', data),
  // DC01 (A4) - Sale chỉnh sửa thông tin cá nhân/liên hệ/giấy tờ khách hàng trước khi gửi yêu cầu.
  capNhatThongTinCaNhan: (maDangKy, data) => httpClient.put(`/dat-coc/gui-yeu-cau/${maDangKy}/thong-tin-ca-nhan`, data),
  getDanhSachChoXacNhan: () => httpClient.get('/dat-coc/cho-xac-nhan'),
  getGiuongTrong: (maPhong) => httpClient.get('/dat-coc/giuong-trong', { params: { maPhong } }),
  // DC01 - các phòng khách đã xem (để Sale chốt phòng khách muốn thuê)
  getPhongDaXem: (maDangKy) => httpClient.get('/dat-coc/phong-da-xem', { params: { maDangKy } }),
  // DC01 - Sale chốt/đổi phòng khách muốn thuê ({ maPhong: 'P102' })
  chonPhongChot: (maDangKy, data) => httpClient.put(`/dat-coc/gui-yeu-cau/${maDangKy}/phong-chot`, data),
  // D-026 - khách tự gửi yêu cầu giữ chỗ sau khi đã xem
  getPhongDaXemKhach: (maDangKy) => httpClient.get('/dat-coc/khach/phong-da-xem', { params: { maDangKy } }),
  khachGuiYeuCauGiuCho: (data) => httpClient.post('/dat-coc/khach/gui-yeu-cau', data),
  getDanhSachChoGhiNhanChungTu: () => httpClient.get('/dat-coc/cho-ghi-nhan-chung-tu'),
  getDanhSachChoXacNhanThanhToan: () => httpClient.get('/dat-coc/cho-xac-nhan-thanh-toan')
};
