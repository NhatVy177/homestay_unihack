import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { getAuthenticatedHomePath } from '../../auth/auth.routes.js';
import { resolveAvatarUrl } from './avatarUrl.js';
import './accountMenu.css';

const initialsOf = (name = '') => String(name).trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase() || 'U';

// Menu tài khoản ở thanh đầu trang công khai: trang chủ giữ nguyên sau khi đăng nhập,
// "Tài khoản của tôi" mới đưa vào khu làm việc của vai trò, "Đăng xuất" luôn hỏi lại.
export default function AccountMenu() {
  const { user, dangXuat } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => { if (ref.current && !ref.current.contains(event.target)) setOpen(false); };
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  if (!user) return null;
  return <div className="acm" ref={ref}>
    <button type="button" className="acm-trigger" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <span className="acm-avatar" aria-hidden="true">{user.avatarUrl ? <img src={resolveAvatarUrl(user.avatarUrl)} alt="" /> : initialsOf(user.hoTen)}</span>
      <span className="acm-name">{user.hoTen || user.tenDangNhap}</span>
      <svg className={`acm-chevron${open ? ' is-open' : ''}`} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </button>
    {open && <div className="acm-menu" role="menu">
      <div className="acm-who"><strong>{user.hoTen}</strong><span>{user.email || user.tenDangNhap}</span></div>
      <button type="button" role="menuitem" onClick={() => { setOpen(false); navigate(getAuthenticatedHomePath(user)); }}>Tài khoản của tôi</button>
      <button type="button" role="menuitem" className="acm-logout" onClick={() => { setOpen(false); dangXuat(); }}>Đăng xuất</button>
    </div>}
  </div>;
}
