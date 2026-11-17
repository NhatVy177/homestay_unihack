import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import AccountMenu from '../components/common/AccountMenu.jsx';
import DemoAccounts from '../components/common/DemoAccounts.jsx';
import GoogleAuthSection from '../components/common/GoogleAuthSection.jsx';
import ForgotPasswordForm from '../components/common/ForgotPasswordForm.jsx';
import TrustStrip from './homeExperience/TrustStrip.jsx';
import ServicesShowcase from './homeExperience/ServicesShowcase.jsx';
import { safeNextPath } from '../auth/returnPath.js';
import { httpClient } from '../api/httpClient.js';
import { Icon } from '../components/common/Icon.jsx';
import '../styles/TrangChu.css';
import { GallerySection, AboutSection, LocationSection, ContactSection, RoomCard, FooterPublic, FloatingContact, SectionHeading, Reveal, useReducedMotion } from './homeExperience/HomeExperience.jsx';
import { normalizeRoom } from './homeExperience/homeData.js';

const INIT_LOGIN = { tenDangNhap: '', matKhau: '' };
const INIT_REGISTER = { tenDangNhap: '', hoTen: '', ngaySinh: '', gioiTinh: '', email: '', soDienThoai: '', matKhau: '', xacNhanMatKhau: '' };

function AuthModal({ mode, onClose, onSwitchMode, initialEmail = '' }) {
  const { dangNhap, dangKy } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loginForm, setLoginForm] = useState(INIT_LOGIN);
  const [regForm, setRegForm] = useState(() => ({ ...INIT_REGISTER, email: initialEmail }));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState(false);
  const overlayRef = useRef();

  // Close on ESC
  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await dangNhap(loginForm);
      onClose();
      const requested = new URLSearchParams(location.search).get('next');
      const from = location.state?.from;
      const statePath = from ? `${from.pathname || ''}${from.search || ''}${from.hash || ''}` : '';
      // Không có trang cần quay lại thì ở lại trang chủ; vào khu làm việc bằng menu "Tài khoản của tôi".
      const back = safeNextPath(requested) || safeNextPath(statePath);
      if (back) navigate(back, { replace: true });
      else if (user && location.pathname !== '/') navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể đăng nhập lúc này.');
    } finally { setLoading(false); }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    if (regForm.matKhau !== regForm.xacNhanMatKhau) { setError('Mật khẩu xác nhận không khớp.'); return; }
    setLoading(true);
    try {
      await dangKy(regForm);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể đăng ký lúc này.');
    } finally { setLoading(false); }
  }

  function updateLogin(e) { setLoginForm(f => ({ ...f, [e.target.name]: e.target.value })); }
  function updateReg(e) { setRegForm(f => ({ ...f, [e.target.name]: e.target.value })); }

  return (
    <div className="tc-modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="tc-modal-outer">
        <div className="tc-modal tc-modal-inner" role="dialog" aria-modal="true">
          {/* Tabs */}
          <div className="tc-modal-tabs">
            <button
              className={`tc-modal-tab ${mode === 'login' ? 'tc-modal-tab--active' : ''}`}
              onClick={() => { setError(''); onSwitchMode('login'); }}
              type="button"
            >Đăng nhập</button>
            <button
              className={`tc-modal-tab ${mode === 'register' ? 'tc-modal-tab--active' : ''}`}
              onClick={() => { setError(''); onSwitchMode('register'); }}
              type="button"
            >Đăng ký</button>
            <button className="tc-modal-close-btn" onClick={onClose} type="button" aria-label="Đóng">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Error */}
          {error && <div className="tc-modal-error">{error}</div>}

          {/* ── LOGIN ── */}
          {mode === 'login' && forgot && (
            <ForgotPasswordForm initialEmail={loginForm.tenDangNhap.includes('@') ? loginForm.tenDangNhap : ''} onBack={() => { setError(''); setForgot(false); }}
              onReset={(email) => { setForgot(false); setLoginForm({ tenDangNhap: email, matKhau: '' }); setError(''); }} />
          )}
          {mode === 'login' && !forgot && (
            <form className="tc-modal-form" onSubmit={handleLogin}>
              <div className="tc-modal-header">
                <span className="tc-modal-emoji ui-auth-symbol"><Icon name="login" /></span>
                <h2>Chào mừng trở lại</h2>
                <p>Đăng nhập để quản lý thuê phòng của bạn.</p>
              </div>
              <label className="tc-form-field">
                <span>Tên hoặc email đăng nhập</span>
                <span className="ui-field-control">
                  <Icon name="person" />
                  <input name="tenDangNhap" value={loginForm.tenDangNhap} onChange={updateLogin}
                    placeholder="Tên đăng nhập hoặc email" required autoComplete="username" />
                </span>
              </label>
              <label className="tc-form-field">
                <span>Mật khẩu</span>
                <span className="ui-field-control">
                  <Icon name="lock" />
                  <input name="matKhau" type="password" value={loginForm.matKhau} onChange={updateLogin}
                    placeholder="••••••••" required autoComplete="current-password" />
                </span>
              </label>
              <p className="tc-modal-switch tc-forgot-link"><button type="button" onClick={() => { setError(''); setForgot(true); }}>Quên mật khẩu?</button></p>
              <button className="tc-modal-submit" type="submit" disabled={loading}>
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
              <p className="tc-modal-switch">
                Chưa có tài khoản?{' '}
                <button type="button" onClick={() => { setError(''); onSwitchMode('register'); }}>Đăng ký ngay</button>
              </p>
              <GoogleAuthSection onDone={onClose} />
              <DemoAccounts onPick={setLoginForm} />
            </form>
          )}

          {/* ── REGISTER ── */}
          {mode === 'register' && (
            <form className="tc-modal-form" onSubmit={handleRegister}>
              <div className="tc-modal-header">
                <span className="tc-modal-emoji ui-auth-symbol"><Icon name="home" /></span>
                <h2>Tạo tài khoản mới</h2>
                <p>Đăng ký để tìm phòng và quản lý hợp đồng dễ dàng.</p>
              </div>
              <label className="tc-form-field">
                <span>Họ và tên <span className="tc-required">*</span></span>
                <input name="hoTen" value={regForm.hoTen} onChange={updateReg}
                  placeholder="Nguyễn Văn An" required />
              </label>
              <div className="tc-form-row">
                <label className="tc-form-field">
                  <span>Giới tính <span className="tc-required">*</span></span>
                  <select name="gioiTinh" value={regForm.gioiTinh} onChange={updateReg} required>
                    <option value="">Chọn</option>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </label>
                <label className="tc-form-field">
                  <span>Ngày sinh <span className="tc-required">*</span></span>
                  <input name="ngaySinh" type="date" value={regForm.ngaySinh} onChange={updateReg} required />
                </label>
              </div>
              <div className="tc-form-row">
                <label className="tc-form-field">
                  <span>Email <span className="tc-required">*</span></span>
                  <input name="email" type="email" value={regForm.email} onChange={updateReg}
                    placeholder="ban@example.com" required maxLength={100} autoComplete="email" />
                </label>
                <label className="tc-form-field">
                  <span>Số điện thoại <span className="tc-required">*</span></span>
                  <input name="soDienThoai" type="tel" value={regForm.soDienThoai} onChange={updateReg}
                    placeholder="0901234567" required />
                </label>
              </div>
              <div className="tc-form-row">
                <label className="tc-form-field">
                  <span>Mật khẩu <span className="tc-required">*</span></span>
                  <input name="matKhau" type="password" value={regForm.matKhau} onChange={updateReg}
                    placeholder="••••••••" required autoComplete="new-password" />
                </label>
                <label className="tc-form-field">
                  <span>Xác nhận mật khẩu <span className="tc-required">*</span></span>
                  <input name="xacNhanMatKhau" type="password" value={regForm.xacNhanMatKhau} onChange={updateReg}
                    placeholder="••••••••" required autoComplete="new-password" />
                </label>
              </div>
              <button className="tc-modal-submit" type="submit" disabled={loading}>
                {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
              </button>
              <p className="tc-modal-switch">
                Đã có tài khoản?{' '}
                <button type="button" onClick={() => { setError(''); onSwitchMode('login'); }}>Đăng nhập</button>
              </p>
              <GoogleAuthSection onDone={onClose} label="Hoặc đăng ký với tài khoản Google" buttonText="signup_with" />
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Header
// ────────────────────────────────────────────────────────────
function HeaderPublic({ onOpenAuth }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function closeOnEscape(event) { if (event.key === 'Escape') setMobileOpen(false); }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  return (
    <header className="tc-header">
      <nav className="tc-nav-inner">
        <a href="#trang-chu" className="tc-logo">
          <svg className="tc-logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9.5L12 3l9 6.5V21H3V9.5z"/><path d="M9 21V12h6v9"/>
          </svg>
          Homestay<strong>Dorm</strong>
        </a>

        <div id="tc-public-menu" className={`tc-nav-links ${mobileOpen ? 'tc-nav-links--open' : ''}`} onClick={() => setMobileOpen(false)}>
          <a href="#phong-noi-bat" className="tc-nav-link">Phòng</a>
          <a href="/dich-vu" className="tc-nav-link" onClick={(event) => { event.preventDefault(); navigate('/dich-vu'); }}>Dịch vụ</a>
          <a href="#vi-tri" className="tc-nav-link">Vị trí</a>
          <a href="#gioi-thieu" className="tc-nav-link">Giới thiệu</a>
          <a href="#lien-he" className="tc-nav-link">Liên hệ</a>
          {!user && <button className="tc-nav-register" type="button" onClick={() => onOpenAuth('register')}>Đăng ký tài khoản <Icon name="arrow_forward" /></button>}
        </div>

        <div className="tc-nav-actions">
          {user ? (
            <AccountMenu />
          ) : (
            <>
              <button className="tc-btn-ghost" type="button" onClick={() => onOpenAuth('login')}>Đăng nhập</button>
              <button className="tc-btn-primary" type="button" onClick={() => onOpenAuth('register')}>Đăng ký</button>
            </>
          )}
          <button
            className={`tc-hamburger ${mobileOpen ? 'tc-hamburger--open' : ''}`}
            type="button" aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={mobileOpen} aria-controls="tc-public-menu"
            onClick={() => setMobileOpen(v => !v)}
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>
    </header>
  );
}

// ────────────────────────────────────────────────────────────
// Hero Section
// ────────────────────────────────────────────────────────────
function SearchFieldIcon({ name }) {
  const icons = {
    area: (
      <>
        <path d="M12 21s6-5.3 6-11a6 6 0 1 0-12 0c0 5.7 6 11 6 11Z" />
        <circle cx="12" cy="10" r="2.2" />
      </>
    ),
    rent: (
      <>
        <path d="M4 20V9.5L12 4l8 5.5V20" />
        <path d="M8 20v-6h8v6" />
        <path d="M9 10.5h.01M15 10.5h.01" />
      </>
    ),
    room: (
      <>
        <path d="M4 19v-8a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1h3a3 3 0 0 1 3 3v4" />
        <path d="M4 14h16M4 19h16" />
        <path d="M7 8V6" />
      </>
    ),
    price: (
      <>
        <rect x="3.5" y="7" width="17" height="10" rx="2" />
        <circle cx="12" cy="12" r="2.2" />
        <path d="M6.8 10.1h.01M17.2 13.9h.01" />
      </>
    )
  };

  return (
    <svg className="tc-search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {icons[name] || icons.area}
    </svg>
  );
}

function SearchDropdown({ icon, label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const selected = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    function handlePointerDown(event) {
      if (!dropdownRef.current || dropdownRef.current.contains(event.target)) return;
      setOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  return (
    <div className={`tc-search-field ${open ? 'tc-search-field--open' : ''}`} ref={dropdownRef}>
      <SearchFieldIcon name={icon} />
      <div className="tc-search-field-inner">
        <span className="tc-search-label">{label}</span>
        <button
          className="tc-search-dropdown-toggle"
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <span>{selected.label}</span>
          <svg className="tc-search-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m7 10 5 5 5-5" />
          </svg>
        </button>
        {open && (
          <div className="tc-search-dropdown-menu" role="listbox">
            {options.map((option) => (
              <button
                className={`tc-search-dropdown-option ${option.value === value ? 'is-selected' : ''}`}
                key={`${label}-${option.value || 'all'}`}
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HeroSection() {
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const reduced = useReducedMotion();
  const slides = [
    { image: '/images/home/hero.jpg', label: 'Một góc nghỉ ngơi ấm cúng' },
    { image: '/images/home/living.jpg', label: 'Không gian sống ngập ánh sáng' },
    { image: '/images/home/dorm.jpg', label: 'Cùng chia sẻ một mái nhà' },
  ];
  useEffect(() => {
    if (reduced || paused || interactionPaused) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setSlide(current => (current + 1) % 3);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [reduced, paused, interactionPaused]);
  const [search, setSearch] = useState({ area: '', type: '', price: '' });
  const areaOptions = [
    { value: '', label: 'Tất cả' },
    { value: 'Quận 1', label: 'Quận 1' },
    { value: 'Bình Thạnh', label: 'Bình Thạnh' },
    { value: 'Thủ Đức', label: 'Thủ Đức' }
  ];
  const roomOptions = [
    { value: '', label: 'Tất cả' },
    { value: 'Phòng 2 người', label: 'Phòng 2 người' },
    { value: 'Phòng 4 người', label: 'Phòng 4 người' },
    { value: 'Phòng 6 người', label: 'Phòng 6 người' },
    { value: 'Phòng VIP 2 người', label: 'Phòng VIP 2 người' }
  ];
  const priceOptions = [
    { value: '', label: 'Tất cả mức giá' },
    { value: '1500000', label: 'Dưới 1,5 triệu' },
    { value: '2000000', label: 'Dưới 2 triệu' },
    { value: '3000000', label: 'Dưới 3 triệu' },
    { value: '3500000', label: 'Dưới 3,5 triệu' }
  ];
  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.area) params.set('khuVuc', search.area);
    if (search.type) params.set('loaiPhong', search.type);
    if (search.price) params.set('mucGiaToiDa', search.price);
    navigate(`/phong${params.toString() ? `?${params.toString()}` : ''}`);
  }

  return (
    <section className="tc-hero hx-hero" id="trang-chu" aria-label="Chào mừng đến HomestayDorm" onMouseEnter={() => setInteractionPaused(true)} onMouseLeave={() => setInteractionPaused(false)} onFocusCapture={() => setInteractionPaused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteractionPaused(false); }}>
      <div className="hx-hero-slides">{slides.map((item, index) => <div className={`hx-hero-slide ${slide === index ? 'is-active' : ''}`} key={item.image} aria-hidden={slide !== index}><img className="tc-hero-photo" src={item.image} alt={item.label} fetchpriority={index === 0 ? 'high' : 'auto'} /></div>)}</div>
      <div className="tc-hero-overlay" />
      <div className="hx-hero-orb hx-hero-orb--one" /><div className="hx-hero-orb hx-hero-orb--two" />
      <div className="tc-hero-content">
        <span className="tc-hero-kicker">HOMESTAY & DORM · THÀNH PHỐ HỒ CHÍ MINH</span>
        <h1 className="tc-hero-title">
          HomestayDorm
        </h1>
        <span className="hx-hero-line" />
        <p className="tc-hero-subtitle">
          Ngôi nhà ấm cúng của bạn tại Sài Gòn
        </p>

        <form className="tc-search-bar" onSubmit={handleSearch}>
          <SearchDropdown
            icon="area"
            label="Khu vực"
            value={search.area}
            options={areaOptions}
            onChange={(area) => setSearch((current) => ({ ...current, area }))}
          />
          <div className="tc-search-divider" />
          <SearchDropdown
            icon="room"
            label="Loại phòng"
            value={search.type}
            options={roomOptions}
            onChange={(type) => setSearch((current) => ({ ...current, type }))}
          />
          <div className="tc-search-divider" />
          <SearchDropdown
            icon="price"
            label="Mức giá"
            value={search.price}
            options={priceOptions}
            onChange={(price) => setSearch((current) => ({ ...current, price }))}
          />
          <div className="tc-search-divider tc-search-divider--native" />
          <div className="tc-search-field tc-search-field--native">
            <SearchFieldIcon name="area" />
            <div className="tc-search-field-inner">
              <label className="tc-search-label">Khu vực</label>
              <select className="tc-search-select" value={search.area}
                onChange={e => setSearch(s => ({ ...s, area: e.target.value }))}>
                <option value="">Tất cả</option>
                <option>Quận 1</option>
                <option>Bình Thạnh</option>
                <option>Thủ Đức</option>
              </select>
            </div>
          </div>
          <div className="tc-search-divider" />
          <div className="tc-search-field tc-search-field--native">
            <SearchFieldIcon name="room" />
            <div className="tc-search-field-inner">
              <label className="tc-search-label">Loại phòng</label>
              <select className="tc-search-select" value={search.type}
                onChange={e => setSearch(s => ({ ...s, type: e.target.value }))}>
                <option value="">Tất cả</option>
                <option>Phòng 2 người</option>
                <option>Phòng 4 người</option>
                <option>Phòng 6 người</option>
                <option>Phòng VIP 2 người</option>
              </select>
            </div>
          </div>
          <div className="tc-search-divider" />
          <div className="tc-search-field tc-search-field--native">
            <SearchFieldIcon name="price" />
            <div className="tc-search-field-inner">
              <label className="tc-search-label">Mức giá</label>
              <select className="tc-search-select" value={search.price}
                onChange={e => setSearch(s => ({ ...s, price: e.target.value }))}>
                <option value="">Tất cả mức giá</option>
                <option value="1500000">Dưới 1,5 triệu</option>
                <option value="2000000">Dưới 2 triệu</option>
                <option value="3000000">Dưới 3 triệu</option>
                <option value="3500000">Dưới 3,5 triệu</option>
              </select>
            </div>
          </div>
          <button className="tc-search-btn" type="submit" aria-label="Tìm kiếm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span>Tìm phòng trống</span>
          </button>
        </form>
        <a href="#phong-noi-bat" className="tc-hero-explore">Xem Phòng <Icon name="arrow_forward" /></a>
      </div>
      <button className="tc-slide-arrow tc-slide-arrow--prev" type="button" aria-label="Ảnh trước" onClick={() => setSlide((slide + slides.length - 1) % slides.length)}><Icon name="chevron_left" /></button>
      <button className="tc-slide-arrow tc-slide-arrow--next" type="button" aria-label="Ảnh tiếp theo" onClick={() => setSlide((slide + 1) % slides.length)}><Icon name="chevron_right" /></button>
      <div className="tc-hero-bottom">
        <span />
        <div className="tc-slide-dots" aria-label="Chọn ảnh không gian">
          {slides.map((item, index) => <button key={item.image} type="button" aria-label={`Xem ảnh ${index + 1}`} aria-pressed={slide === index} onClick={() => setSlide(index)} />)}
        </div>
        <button className="hx-pause-slides" type="button" aria-label={paused ? 'Tiếp tục chuyển ảnh' : 'Tạm dừng chuyển ảnh'} onClick={() => setPaused(current => !current)}>{paused ? '▶' : 'Ⅱ'}</button>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────
// Room Card — dữ liệu từ DB
// ────────────────────────────────────────────────────────────
export default function TrangChu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [branches, setBranches] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [authModal, setAuthModal] = useState(null); // null | 'login' | 'register'
  // Link trong thư mời thành viên cư trú: /?dangKy=1&email=... mở sẵn form đăng ký (không bắt buộc).
  const inviteParams = new URLSearchParams(location.search);
  const inviteEmail = inviteParams.get('dangKy') === '1' ? String(inviteParams.get('email') || '').slice(0, 100) : '';
  useEffect(() => {
    if (inviteParams.get('dangKy') === '1' && !isLoading && !user) setAuthModal('register');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, isLoading, user]);
  useEffect(() => {
    const auth = new URLSearchParams(location.search).get('auth');
    if ((auth === 'login' || auth === 'register') && !isLoading && !user) setAuthModal(auth);
  }, [location.search, isLoading, user]);
  useEffect(() => {
    const next = safeNextPath(new URLSearchParams(location.search).get('next'));
    if (!next || isLoading) return;
    if (user) navigate(next, { replace: true });
    else setAuthModal('login');
  }, [location.search, isLoading, user, navigate]);

  // Liên kết kiểu /#phong-noi-bat (vd. nút "Khám phá phòng" của khách đã đăng nhập) cuộn tới đúng mục sau khi trang dựng xong.
  useEffect(() => {
    const id = location.hash.slice(1);
    if (!id || loadingRooms) return undefined;
    const timer = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    return () => clearTimeout(timer);
  }, [location.hash, loadingRooms]);

  const openAuth = useCallback((mode) => setAuthModal(mode), []);
  const closeAuth = useCallback(() => setAuthModal(null), []);
  const switchMode = useCallback((mode) => setAuthModal(mode), []);
  const viewRoomDetail = useCallback((room) => {
    if (!room?.MaPhong) return;
    navigate(`/phong/${encodeURIComponent(room.MaPhong)}`);
  }, [navigate]);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      httpClient.get('/trang-chu/phong-noi-bat'),
      httpClient.get('/trang-chu/kham-pha-phong'),
      httpClient.get('/trang-chu/kham-pha-phong/bo-loc'),
    ]).then(([featured, all, filters]) => {
      if (!active) return;
      const featuredRooms = featured.status === 'fulfilled' && Array.isArray(featured.value.data.data) ? featured.value.data.data.map(normalizeRoom) : [];
      const allRooms = all.status === 'fulfilled' && Array.isArray(all.value.data.data) ? all.value.data.data.map(normalizeRoom) : [];
      const unique = [...new Map([...featuredRooms, ...allRooms].filter(room => room.MaPhong).map(room => [room.MaPhong, room])).values()];
      setCatalog(unique);
      setRooms(unique.slice(0, 4));
      if (filters.status === 'fulfilled') {
        setBranches(filters.value.data.data?.khuVuc || []);
        setRoomTypes(filters.value.data.data?.loaiPhong || []);
      }
      setLoadingRooms(false);
    });
    return () => { active = false; };
  }, []);

  return (
    <div className={`tc-page ${authModal ? 'tc-page--blurred' : ''}`}>
      <HeaderPublic onOpenAuth={openAuth} />

      <main>
        <HeroSection />
        <GallerySection rooms={catalog} />

        {/* Phòng nổi bật */}
        <section className="hx-section tc-rooms-section" id="phong-noi-bat">
          <div className="tc-container">
            <div className="hx-rooms-head">
              <div><span className="hx-rooms-eyebrow">Phòng trống</span><h2>Phòng trống tiêu biểu</h2></div>
              <button className="hx-rooms-all" type="button" onClick={() => navigate('/phong')}>Xem tất cả phòng <Icon name="arrow_forward" /></button>
            </div>

            {loadingRooms ? (
              <div className="tc-rooms-loading">
                <div className="tc-spinner" />
                <p>Đang tải danh sách phòng...</p>
              </div>
            ) : rooms.length > 0 ? (
              <div className="tc-rooms-grid">
                {rooms.map((room, index) => <RoomCard key={room.MaPhong} room={room} index={index} onViewDetail={viewRoomDetail} />)}
              </div>
            ) : (
              <div className="tc-rooms-empty">Hiện chưa có phòng nào để hiển thị.</div>
            )}
          </div>
        </section>

        <ServicesShowcase />
        <TrustStrip />
        <AboutSection rooms={catalog} branches={branches} roomTypes={roomTypes} onViewDetail={viewRoomDetail} />
        <LocationSection rooms={catalog} branches={branches} />
        <ContactSection />
      </main>

      <FooterPublic onOpenAuth={openAuth} />
      <FloatingContact />

      {/* Auth Modal */}
      {authModal && (
        <AuthModal mode={authModal} onClose={closeAuth} onSwitchMode={switchMode} initialEmail={inviteEmail} />
      )}
    </div>
  );
}
