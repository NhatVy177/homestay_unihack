export const paymentAccount = {
  nganHang: process.env.PAYMENT_BANK || 'MB Bank',
  soTaiKhoan: process.env.PAYMENT_ACCOUNT_NUMBER || '0123456789',
  chuTaiKhoan: process.env.PAYMENT_ACCOUNT_HOLDER || 'HAPPYROOM CO LTD',
  chiNhanh: process.env.PAYMENT_BRANCH || 'TP. Ho Chi Minh',
  // Mã BIN ngân hàng theo NAPAS (MB Bank = 970422) để dựng VietQR.
  maNganHang: process.env.PAYMENT_BANK_BIN || '970422',
  // Chỉ hiện VietQR khi đã cấu hình tài khoản thật, tránh in mã của số tài khoản mẫu.
  vietQr: Boolean(process.env.PAYMENT_ACCOUNT_NUMBER),
  // Đặt PAYMENT_VIETQR_HIEN_SO_TIEN=false để QR không kèm số tiền: app ngân hàng/MoMo sẽ cho khách tự nhập (dùng khi demo chuyển thử số nhỏ).
  hienSoTienQr: process.env.PAYMENT_VIETQR_HIEN_SO_TIEN !== 'false'
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

