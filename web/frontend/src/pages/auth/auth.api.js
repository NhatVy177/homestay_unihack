import { httpClient } from '../../api/httpClient.js';

export const authApi = {
  dangKy: (data) => httpClient.post('/auth/dang-ky', data),
  kiemTraSoDienThoai: (sdt) => httpClient.get('/auth/kiem-tra-sdt', { params: { sdt } }),
  dangNhap: (data) => httpClient.post('/auth/dang-nhap', data),
  cauHinhGoogle: () => httpClient.get('/auth/google/cau-hinh'),
  dangNhapGoogle: (credential) => httpClient.post('/auth/google', { credential }),
  hoanTatGoogle: (data) => httpClient.post('/auth/google/hoan-tat', data),
  getToi: () => httpClient.get('/auth/toi'),
  dangXuat: () => httpClient.post('/auth/dang-xuat')
};
