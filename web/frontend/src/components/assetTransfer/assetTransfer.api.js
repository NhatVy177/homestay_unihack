import { httpClient } from '../../api/httpClient.js';

const base = '/dieu-phoi-tai-san';

export const assetTransferApi = {
  warehouse: (params) => httpClient.get(`${base}/kho`, { params }),
  rooms: (params) => httpClient.get(`${base}/phong`, { params }),
  history: (params) => httpClient.get(`${base}/lich-su`, { params }),
  transfer: (payload) => httpClient.post(`${base}/chuyen`, payload),
};
