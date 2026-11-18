import React, { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';
import './shareRoomButton.css';

// Nút chia sẻ phòng: Facebook, sao chép link (dán vào Messenger/Zalo), hoặc chia sẻ của điện thoại.
// Link đi qua máy chủ (/chia-se/phong/<mã>) để Facebook/Messenger/Zalo đọc được ảnh, giá, địa chỉ (thẻ Open Graph),
// rồi chuyển người bấm sang trang phòng /phong/<mã>; khách xem không cần tài khoản.
const apiOrigin = () => (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
export const roomShareUrl = (maPhong) => `${apiOrigin()}/chia-se/phong/${encodeURIComponent(maPhong)}`;

export default function ShareRoomButton({ room }) {
  // room: { maPhong, tenPhong }; link luôn trỏ về trang khám phá công khai của phòng đó.
  const [open, setOpen] = useState(false), [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef(null);
  const trigger = useRef(null), copyTimer = useRef(null);
  const menuId = useId();
  useEffect(() => () => clearTimeout(copyTimer.current), []);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => { if (ref.current && !ref.current.contains(event.target)) setOpen(false); };
    const onKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
    };
    ref.current?.querySelector('[role="menuitem"]')?.focus();
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey, true); };
  }, [open]);
  const url = roomShareUrl(room.maPhong);
  const text = `${room.tenPhong} - HomeStayDorm`;
  const nativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  async function copy() {
    setCopied(false); setError(''); clearTimeout(copyTimer.current);
    try {
      try { await navigator.clipboard.writeText(url); }
      catch {
        const previous = document.activeElement;
        const input = document.createElement('textarea'); input.value = url; input.className = 'srb-copy-buffer';
        document.body.appendChild(input);
        try { input.select(); if (!document.execCommand('copy')) throw new Error('Clipboard unavailable'); }
        finally { input.remove(); previous?.focus(); }
      }
      setCopied(true); copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch { setError('Chưa sao chép được liên kết. Vui lòng thử lại.'); }
  }
  function navigateMenu(event) {
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    const items = [...ref.current.querySelectorAll('[role="menuitem"]')];
    const current = items.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    event.preventDefault(); items[next]?.focus();
  }
  return <div className="srb" ref={ref}>
    <button ref={trigger} type="button" className="srb-trigger" aria-haspopup="menu" aria-controls={open ? menuId : undefined} aria-expanded={open} onClick={() => { setError(''); setCopied(false); clearTimeout(copyTimer.current); setOpen((value) => !value); }}><Icon name="send" />Chia sẻ</button>
    {open && <div id={menuId} className="srb-menu" role="menu" aria-label="Chia sẻ phòng" onKeyDown={navigateMenu}>
      <a role="menuitem" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}><Icon name="groups" />Chia sẻ lên Facebook</a>
      <button type="button" role="menuitem" onClick={copy}><Icon name={copied ? 'check' : 'list'} />{copied ? 'Đã sao chép link' : 'Sao chép link (dán vào Messenger, Zalo)'}</button>
      {nativeShare && <button type="button" role="menuitem" onClick={() => { setOpen(false); navigator.share({ title: text, url }).catch(() => {}); }}><Icon name="phone" />Chia sẻ qua ứng dụng khác</button>}
      {error && <p className="srb-error" role="alert">{error}</p>}
    </div>}
  </div>;
}
