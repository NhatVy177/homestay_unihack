import { httpClient } from '../../api/httpClient.js';

// D-080: kế toán thu tiền mặt cho hóa đơn đặt cọc và hóa đơn nhận phòng.
export const thuTienMatApi = {
  danhSach: () => httpClient.get('/thu-tien-mat'),
  ghiNhan: (payload) => httpClient.post('/thu-tien-mat', payload),
};
