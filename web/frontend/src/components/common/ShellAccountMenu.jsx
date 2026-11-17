import React, { useEffect, useRef, useState } from 'react';
import { resolveAvatarUrl } from './avatarUrl.js';
import './accountMenu.css';

const initialOf = (name = '') => (String(name).trim().split(/\s+/).filter(Boolean).pop() || '?').charAt(0).toUpperCase();

// Menu tài khoản ở thanh đầu của khu làm việc (mọi vai trò): bấm vào mới xổ ra "Thông tin cá nhân" và "Đăng xuất",
// giống menu ở trang chủ; đăng xuất luôn hỏi lại (do onLogout của trang).
export default function ShellAccountMenu({ user, roleLabel, onAccount, onLogout }) {
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
  const name = user?.hoTen || roleLabel;
  const avatar = resolveAvatarUrl(user?.avatarUrl);
  return <div className="acm acm--shell" ref={ref}>
    <button type="button" className="acm-trigger" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <span className="acm-avatar" aria-hidden="true">{avatar ? <img src={avatar} alt="" /> : initialOf(name)}</span>
      <span className="acm-name"><strong>{name}</strong><small>{roleLabel}</small></span>
      <svg className={`acm-chevron${open ? ' is-open' : ''}`} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </button>
    {open && <div className="acm-menu" role="menu">
      <div className="acm-who"><strong>{name}</strong><span>{user?.email || user?.tenDangNhap || roleLabel}</span></div>
      {onAccount && <button type="button" role="menuitem" onClick={() => { setOpen(false); onAccount(); }}>Thông tin cá nhân</button>}
      <button type="button" role="menuitem" className="acm-logout" onClick={() => { setOpen(false); onLogout(); }}>Đăng xuất</button>
    </div>}
  </div>;
}
