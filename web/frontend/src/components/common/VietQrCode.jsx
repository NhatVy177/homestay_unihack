import React, { useState } from 'react';

// Mã VietQR thật (chuẩn NAPAS): quét bằng app ngân hàng/ví bất kỳ sẽ điền sẵn tài khoản, số tiền, nội dung.
// Ảnh do img.vietqr.io dựng nên cần mạng; chỉ hiện khi backend đã cấu hình tài khoản thật (account.vietQr).
export function vietQrUrl(account, amount, content) {
  const params = new URLSearchParams();
  if (Number(amount) > 0) params.set('amount', String(Math.round(Number(amount))));
  if (content) params.set('addInfo', String(content).slice(0, 50));
  if (account?.chuTaiKhoan) params.set('accountName', account.chuTaiKhoan);
  return `https://img.vietqr.io/image/${encodeURIComponent(account.maNganHang)}-${encodeURIComponent(account.soTaiKhoan)}-compact2.png?${params}`;
}

export default function VietQrCode({ account, amount, content }) {
  const [failed, setFailed] = useState(false);
  if (!account?.vietQr || !account.maNganHang || !account.soTaiKhoan || failed) return null;
  return <figure className="vietqr-code">
    <img src={vietQrUrl(account, amount, content)} alt={`Mã VietQR chuyển khoản ${content || ''}`.trim()} width="260" height="300" loading="lazy" onError={() => setFailed(true)} />
    <figcaption>Mở app ngân hàng hoặc ví (MoMo, ZaloPay…) và quét mã. Số tiền và nội dung đã điền sẵn, vui lòng không sửa nội dung.</figcaption>
  </figure>;
}
