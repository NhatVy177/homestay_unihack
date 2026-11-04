export const paymentAccount = {
  nganHang: process.env.PAYMENT_BANK || 'MB Bank',
  soTaiKhoan: process.env.PAYMENT_ACCOUNT_NUMBER || '0123456789',
  chuTaiKhoan: process.env.PAYMENT_ACCOUNT_HOLDER || 'HAPPYROOM CO LTD',
  chiNhanh: process.env.PAYMENT_BRANCH || 'TP. Ho Chi Minh'
};

export function getPaymentAccount() {
  return { ...paymentAccount };
}

export function attachPaymentAccount(data) {
  if (Array.isArray(data)) {
    return data.map((item) => ({
      ...item,
      taiKhoanThanhToan: getPaymentAccount()
    }));
  }
  if (data && typeof data === 'object') {
    return {
      ...data,
      taiKhoanThanhToan: getPaymentAccount()
    };
  }
  return data;
}

export default {
  paymentAccount,
  getPaymentAccount,
  attachPaymentAccount
};

