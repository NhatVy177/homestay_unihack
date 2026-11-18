import { httpClient } from '../../api/httpClient.js';

export const suaChuaApi = {
  hopDongCuaToi: () => httpClient.get('/sua-chua-bao-tri/hop-dong-cua-toi'),
  danhSach: () => httpClient.get('/sua-chua-bao-tri'),
  theoHopDong: (maHopDong) => httpClient.get(`/sua-chua-bao-tri/hop-dong/${encodeURIComponent(maHopDong)}`),
  tao: (data) => httpClient.post('/sua-chua-bao-tri', data),
  tiepNhan: (id, data = {}) => httpClient.put(`/sua-chua-bao-tri/${encodeURIComponent(id)}/tiep-nhan`, data),
  hoanTat: (id, data) => httpClient.put(`/sua-chua-bao-tri/${encodeURIComponent(id)}/hoan-tat`, data),
  tuChoi: (id, data) => httpClient.put(`/sua-chua-bao-tri/${encodeURIComponent(id)}/tu-choi`, data),
};

// Thu nhỏ ảnh trên máy khách trước khi gửi (cạnh dài tối đa 1600px, JPEG) để ảnh điện thoại vài MB vẫn gửi được.
export function shrinkImage(file, maxSide = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Không đọc được ảnh này.')); };
    img.src = url;
  });
}

export const errorText = (error, fallback) => error?.response?.data?.message || fallback;
export const dateVi = (value) => (value ? new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '');
export const moneyVi = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
