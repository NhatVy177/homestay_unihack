import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';
import './shareRoomButton.css';

// Nút chia sẻ phòng: bấm là sao chép link và báo ngay cạnh nút (dán vào Messenger/Zalo/Facebook).
// Link đi qua máy chủ (/chia-se/phong/<mã>) để Facebook/Messenger/Zalo đọc được ảnh, giá, địa chỉ (thẻ Open Graph),
// rồi chuyển người bấm sang trang phòng /phong/<mã>; khách xem không cần tài khoản.
const apiOrigin = () => (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
export const roomShareUrl = (maPhong) => `${apiOrigin()}/chia-se/phong/${encodeURIComponent(maPhong)}`;

export default function ShareRoomButton({ room }) {
  const [copied, setCopied] = useState(false), [error, setError] = useState('');
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const url = roomShareUrl(room.maPhong);
  async function copy() {
    setCopied(false); setError(''); clearTimeout(timer.current);
    try {
      try { await navigator.clipboard.writeText(url); }
      catch {
        const previous = document.activeElement;
        const input = document.createElement('textarea'); input.value = url; input.className = 'srb-copy-buffer';
        document.body.appendChild(input);
        try { input.select(); if (!document.execCommand('copy')) throw new Error('Clipboard unavailable'); }
        finally { input.remove(); previous?.focus(); }
      }
      setCopied(true); timer.current = setTimeout(() => setCopied(false), 3000);
    } catch { setError('Chưa sao chép được liên kết. Vui lòng thử lại.'); }
  }
  return <div className="srb">
    <button type="button" className="srb-trigger" onClick={copy}><Icon name="send" />Chia sẻ</button>
    {copied && <span className="srb-copied" role="status"><Icon name="check" />Đã sao chép link</span>}
    {error && <span className="srb-error" role="alert">{error}</span>}
  </div>;
}
