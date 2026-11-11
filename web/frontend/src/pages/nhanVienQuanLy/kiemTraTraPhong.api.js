import { httpClient } from '../../api/httpClient.js';

export const kiemTraTraPhongApi = {
  quanLyDanhSachChoXuLy: (trangThaiLoc = 'Chờ xử lý') =>
    httpClient.get('/kiem-tra-tra-phong/quan-ly/cho-xu-ly', { params: { trangThaiLoc } }),

  quanLyChiTietPhieu: (maPhieuTra) =>
    httpClient.get(`/kiem-tra-tra-phong/quan-ly/chi-tiet/${maPhieuTra}`),

  quanLyXacNhanHuyCoc: (data) =>
    httpClient.post('/kiem-tra-tra-phong/quan-ly/xac-nhan-huy-coc', data),

  quanLyLapBienBanKiemTra: (data) =>
    httpClient.post('/kiem-tra-tra-phong/quan-ly/kiem-tra', data),

  // C2 / D-030 (1): biên bản lúc nhận phòng (bản khách đã xác nhận) và ảnh lúc trả phòng.
  quanLyBanGiaoVao: (maPhieuTra) =>
    httpClient.get(`/kiem-tra-tra-phong/quan-ly/ban-giao-vao/${maPhieuTra}`),

  quanLyDanhSachAnh: (maPhieuTra) =>
    httpClient.get(`/kiem-tra-tra-phong/quan-ly/anh/${maPhieuTra}`),

  quanLyTaiAnh: (maPhieuTra, file, keyTaiSan) => {
    const body = new FormData();
    body.append('file', file);
    if (keyTaiSan) body.append('keyTaiSan', keyTaiSan);
    return httpClient.post(`/kiem-tra-tra-phong/quan-ly/anh/${maPhieuTra}`, body, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  quanLyXoaAnh: (maPhieuTra, maAnh) =>
    httpClient.delete(`/kiem-tra-tra-phong/quan-ly/anh/${maPhieuTra}/${maAnh}`),

  // Ảnh cần token nên tải qua httpClient rồi hiển thị bằng object URL.
  quanLyFileAnh: (maPhieuTra, maAnh) =>
    httpClient.get(`/kiem-tra-tra-phong/quan-ly/anh/${maPhieuTra}/${maAnh}/file`, { responseType: 'blob' }),
};
