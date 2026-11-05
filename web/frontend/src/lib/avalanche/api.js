import { httpClient } from '../../api/httpClient.js';
export const avalancheApi = {
  get: async path => (await httpClient.get('/avalanche' + path)).data,
  post: async (path, body = {}) => (await httpClient.post('/avalanche' + path, body)).data,
};
export const errorMessage = (error, fallback = 'Có lỗi xảy ra, vui lòng thử lại.') =>
  error?.response?.data?.message || error?.message || fallback;
// Trust anchor for browser-side checks: from the build config, never from the API response.
export const trustedDeployment = {
  chainId: Number(import.meta.env.VITE_AVALANCHE_CHAIN_ID || 43113),
  address: import.meta.env.VITE_AVALANCHE_CONTRACT_ADDRESS || '',
};
export const rpcUrl = import.meta.env.VITE_AVALANCHE_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc';
export const privyAppId = import.meta.env.VITE_PRIVY_APP_ID || '';
export const explorerTx = hash => trustedDeployment.chainId === 43113 ? 'https://testnet.snowtrace.io/tx/' + hash : null;
// Plain-language states (D-012): no wallet/chain jargon in the main UI.
export const tenantStateLabels = {
  review: ['Chờ bạn xác nhận', 'warn'],
  'change-requested': ['Đã gửi yêu cầu chỉnh sửa', 'info'],
  'handover-pending': ['Chờ bạn xác nhận', 'warn'],
  active: ['Đã xác nhận bàn giao', 'done'],
  'settlement-pending': ['Đối soát chờ bạn xem', 'warn'],
  disputed: ['Đã gửi phản hồi đối soát', 'info'],
  accepted: ['Đã thống nhất đối soát', 'done'],
};
export const staffStateLabels = {
  review: ['Chờ khách xác nhận', 'warn'],
  'change-requested': ['Khách yêu cầu chỉnh sửa', 'danger'],
  'handover-pending': ['Chờ khách ký xác nhận', 'warn'],
  active: ['Khách đã xác nhận bàn giao', 'done'],
  'settlement-pending': ['Đối soát chờ khách xem', 'warn'],
  disputed: ['Khách phản hồi đối soát', 'danger'],
  accepted: ['Đã thống nhất đối soát', 'done'],
};
export const money = value => Number(value || 0).toLocaleString('vi-VN') + ' đ';
export const dateTime = value => value ? new Date(value).toLocaleString('vi-VN') : '';
