import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import AccountMenu from '../common/AccountMenu.jsx';
import BrandLogo from '../common/BrandLogo.jsx';
import '../../styles/TrangChu.css';
import '../../pages/homeExperience/experience.css';
import './publicLayout.css';

// Khung chung cho các trang công khai ngoài trang chủ (Danh sách phòng, Dịch vụ): cùng đầu trang, màu và phông với trang chủ.
export default function PublicLayout({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const link = ({ isActive }) => `tc-nav-link${isActive ? ' tc-nav-link--active' : ''}`;
  return <div className="tc-page pl-page">
    <header className="tc-header">
      <nav className="tc-nav-inner">
        <Link to="/" className="tc-logo">
          <BrandLogo />
        </Link>
        <div id="tc-public-menu" className={`tc-nav-links ${open ? 'tc-nav-links--open' : ''}`} onClick={() => setOpen(false)}>
          <NavLink to="/phong" className={link}>Phòng</NavLink>
          <NavLink to="/dich-vu" className={link}>Dịch vụ</NavLink>
          <Link to="/#vi-tri" className="tc-nav-link">Vị trí</Link>
          <Link to="/#gioi-thieu" className="tc-nav-link">Giới thiệu</Link>
          <Link to="/#lien-he" className="tc-nav-link">Liên hệ</Link>
        </div>
        <div className="tc-nav-actions">
          {user ? <AccountMenu /> : <>
            <button className="tc-btn-ghost" type="button" onClick={() => navigate('/?auth=login')}>Đăng nhập</button>
            <button className="tc-btn-primary" type="button" onClick={() => navigate('/?auth=register')}>Đăng ký</button>
          </>}
          <button className={`tc-hamburger ${open ? 'tc-hamburger--open' : ''}`} type="button" aria-label={open ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={open} aria-controls="tc-public-menu" onClick={() => setOpen((v) => !v)}><span /><span /><span /></button>
        </div>
      </nav>
    </header>
    <main className="pl-main">{children}</main>
    <footer className="pl-footer"><p>© HomestayDorm. Thuê phòng minh bạch, cọc rõ ràng.</p><Link to="/">Về trang chủ</Link></footer>
  </div>;
}
