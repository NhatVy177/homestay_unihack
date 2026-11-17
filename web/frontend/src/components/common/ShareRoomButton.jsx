import React, { useState } from 'react';
import './shareRoomButton.css';

// Nút chia sẻ phòng: Facebook, sao chép link (dán vào Messenger/Zalo), hoặc chia sẻ của điện thoại.
// Link mở thẳng hộp chi tiết phòng ở /phong/<mã>, khách xem không cần tài khoản.
export const roomShareUrl = (maPhong) => `${window.location.origin}/phong/${encodeURIComponent(maPhong)}`;

export default function ShareRoomButton({ room }) {
  // room: { maPhong, tenPhong }; link luôn trỏ về trang khám phá công khai của phòng đó.
  const [open, setOpen] = useState(false), [copied, setCopied] = useState(false);
  const url = roomShareUrl(room.maPhong);
  const text = `${room.tenPhong} - HomeStayDorm`;
  const nativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  async function copy() {
    try { await navigator.clipboard.writeText(url); }
    catch { const input = document.createElement('input'); input.value = url; document.body.appendChild(input); input.select(); document.execCommand('copy'); input.remove(); }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }
  return <div className="srb">
    <button type="button" className="srb-trigger" aria-expanded={open} onClick={() => setOpen((value) => !value)}>Chia sẻ</button>
    {open && <div className="srb-menu" role="menu">
      <a role="menuitem" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer">Chia sẻ lên Facebook</a>
      <button type="button" role="menuitem" onClick={copy}>{copied ? 'Đã sao chép link' : 'Sao chép link (dán vào Messenger, Zalo)'}</button>
      {nativeShare && <button type="button" role="menuitem" onClick={() => navigator.share({ title: text, url }).catch(() => {})}>Chia sẻ qua ứng dụng khác</button>}
    </div>}
  </div>;
}
