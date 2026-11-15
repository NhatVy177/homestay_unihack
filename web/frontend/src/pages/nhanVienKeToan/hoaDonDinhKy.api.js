import { httpClient } from '../../api/httpClient.js';

const base = '/ke-toan/hoa-don-dinh-ky';
export const hoaDonDinhKyApi = {
  danhSachHopDong: () => httpClient.get(`${base}/hop-dong`),
  chiTietLap: (maHopDong) => httpClient.get(`${base}/hop-dong/${encodeURIComponent(maHopDong)}`),
  lapHoaDon: (payload) => httpClient.post(base, payload),
  danhSachHoaDon: () => httpClient.get(base),
  chiTietHoaDon: (maHoaDon) => httpClient.get(`${base}/${encodeURIComponent(maHoaDon)}`),
  thuTien: (maHoaDon, phuongThuc) => httpClient.post(`${base}/${encodeURIComponent(maHoaDon)}/thu-tien`, { phuongThuc }),
  themPhi: (payload) => httpClient.post(`${base}/phi-phat-sinh/them`, payload),
  xacNhanPhi: (maPhi) => httpClient.post(`${base}/phi-phat-sinh/${encodeURIComponent(maPhi)}/xac-nhan`),
  xoaPhi: (maPhi) => httpClient.delete(`${base}/phi-phat-sinh/${encodeURIComponent(maPhi)}`),
};
