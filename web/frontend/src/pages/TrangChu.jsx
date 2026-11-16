import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { getAuthenticatedHomePath } from '../auth/auth.routes.js';
import { safeNextPath } from '../auth/returnPath.js';
import { httpClient } from '../api/httpClient.js';
import { Icon } from '../components/common/Icon.jsx';
import '../styles/TrangChu.css';

// ── Ảnh placeholder theo loại phòng ─────────────────────────
const ROOM_IMAGES = {
  LP0001: '/images/home/dorm.jpg',
  LP0002: '/images/home/hero.jpg',
  LP0003: '/images/home/room.jpg',
  LP0004: '/images/home/living.jpg',
};

// ── Tiện ích mặc định theo loại phòng ───────────────────────
const ROOM_AMENITIES = {
  LP0001: ['Điều hòa', 'Wifi', 'Tủ cá nhân'],
  LP0002: ['Điều hòa', 'Wifi', 'Tủ cá nhân'],
  LP0003: ['Wifi', 'Quạt', 'Tủ cá nhân'],
  LP0004: ['Điều hòa', 'Wifi', 'WC riêng'],
};

// ── Đánh giá tĩnh ───────────────────────────────────────────
const TESTIMONIALS = [
  { id: 1, name: 'Nguyễn Văn An', role: 'Sinh viên ĐH Bách Khoa', avatar: 'A', rating: 5,
    text: 'Giao diện rất dễ dùng, tìm phòng nhanh và quy trình đặt cọc rõ ràng. Mình đã thuê phòng chỉ trong 1 ngày!' },
  { id: 2, name: 'Trần Thị Bình', role: 'Nhân viên văn phòng', avatar: 'B', rating: 5,
    text: 'Phòng chất lượng, đúng như mô tả. Hệ thống thông báo hạn thanh toán rất tiện, không lo quên.' },
  { id: 3, name: 'Lê Quốc Cường', role: 'Học viên cao học', avatar: 'C', rating: 4,
    text: 'Thích nhất là phần quản lý hợp đồng và gửi yêu cầu sửa chữa ngay trên app. Nhân viên phản hồi rất nhanh.' },
];

const PROCESS_STEPS = [
  { step: '01', icon: 'register', title: 'Đăng ký tài khoản', desc: 'Tạo tài khoản khách hàng miễn phí và điền thông tin cá nhân cần thiết.' },
  { step: '02', icon: 'search', title: 'Tìm & xem phòng', desc: 'Lọc phòng theo khu vực, loại phòng, giá thuê và xem chi tiết tiện ích.' },
  { step: '03', icon: 'deposit', title: 'Đặt cọc xác nhận', desc: 'Nhân viên xác nhận thông tin và hướng dẫn bạn hoàn tất đặt cọc nhanh chóng.' },
  { step: '04', icon: 'home', title: 'Nhận phòng & ở', desc: 'Nhận bàn giao phòng, ký hợp đồng và bắt đầu cuộc sống mới tiện nghi.' },
];

function ProcessIcon({ name }) {
  const icons = {
    register: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="tc-step-svg">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <circle cx="9" cy="9" r="1" />
      </svg>
    ),
    search: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="tc-step-svg">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <path d="M11 8v6M8 11h6" />
      </svg>
    ),
    deposit: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="tc-step-svg">
        <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
        <path d="M12 14v2M8 15h8" />
      </svg>
    ),
    home: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="tc-step-svg">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  };
  return icons[name] || null;
}

// ────────────────────────────────────────────────────────────
// Auth Modal (Đăng nhập / Đăng ký inline)
// ────────────────────────────────────────────────────────────
const INIT_LOGIN = { tenDangNhap: '', matKhau: '' };
const INIT_REGISTER = { tenDangNhap: '', hoTen: '', ngaySinh: '', gioiTinh: '', email: '', soDienThoai: '', matKhau: '', xacNhanMatKhau: '' };

function AuthModal({ mode, onClose, onSwitchMode }) {
  const { dangNhap, dangKy } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loginForm, setLoginForm] = useState(INIT_LOGIN);
  const [regForm, setRegForm] = useState(INIT_REGISTER);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
      navigate(safeNextPath(requested) || safeNextPath(statePath) || getAuthenticatedHomePath(user), { replace: true });
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
      navigate('/khach-hang', { replace: true });
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
          {mode === 'login' && (
            <form className="tc-modal-form" onSubmit={handleLogin}>
              <div className="tc-modal-header">
                <span className="tc-modal-emoji ui-auth-symbol"><Icon name="login" /></span>
                <h2>Chào mừng trở lại</h2>
                <p>Đăng nhập để quản lý thuê phòng của bạn.</p>
              </div>
              <label className="tc-form-field">
                <span>Tên đăng nhập</span>
                <span className="ui-field-control">
                  <Icon name="person" />
                  <input name="tenDangNhap" value={loginForm.tenDangNhap} onChange={updateLogin}
                    placeholder="kh0001" required autoComplete="username" />
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
              <button className="tc-modal-submit" type="submit" disabled={loading}>
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
              <p className="tc-modal-switch">
                Chưa có tài khoản?{' '}
                <button type="button" onClick={() => { setError(''); onSwitchMode('register'); }}>Đăng ký ngay</button>
              </p>
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
              <label className="tc-form-field">
                <span>Tên đăng nhập <span className="tc-required">*</span></span>
                <input name="tenDangNhap" value={regForm.tenDangNhap} onChange={updateReg}
                  placeholder="nguyenvanan" required maxLength={50} autoComplete="username" />
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
  const { user, dangXuat } = useAuth();
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
          <a href="#trang-chu" className="tc-nav-link tc-nav-link--active">Trang chủ</a>
          <a href="#phong-noi-bat" className="tc-nav-link">Phòng & Giường</a>
          <a href="#gioi-thieu" className="tc-nav-link">Giới thiệu</a>
          <a href="#lien-he" className="tc-nav-link">Liên hệ</a>
          {!user && <button className="tc-nav-register" type="button" onClick={() => onOpenAuth('register')}>Đăng ký tài khoản <Icon name="arrow_forward" /></button>}
        </div>

        <div className="tc-nav-actions">
          {user ? (
            <>
              <button className="tc-btn-ghost" type="button" onClick={() => navigate(getAuthenticatedHomePath(user))}>
                Dashboard
              </button>
              <button className="tc-btn-outline" type="button" onClick={dangXuat}>Đăng xuất</button>
            </>
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
  const slides = [
    { image: '/images/home/hero.jpg', label: 'Một góc nghỉ ngơi ấm cúng' },
    { image: '/images/home/living.jpg', label: 'Không gian sống ngập ánh sáng' },
    { image: '/images/home/dorm.jpg', label: 'Cùng chia sẻ một mái nhà' },
  ];
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
    navigate(`/kham-pha-phong${params.toString() ? `?${params.toString()}` : ''}`);
  }

  return (
    <section className="tc-hero" id="trang-chu" aria-label="Chào mừng đến HomestayDorm">
      <img className="tc-hero-photo" src={slides[slide].image} alt={slides[slide].label} fetchPriority="high" />
      <div className="tc-hero-overlay" />
      <div className="tc-hero-content">
        <span className="tc-hero-kicker">HOMESTAY & DORM · THÀNH PHỐ HỒ CHÍ MINH</span>
        <h1 className="tc-hero-title">
          Một nơi ở.<br /><span>Một cảm giác về nhà.</span>
        </h1>
        <p className="tc-hero-subtitle">
          Tìm không gian của riêng bạn giữa Sài Gòn — ấm cúng, tiện nghi và vừa vặn với cuộc sống mỗi ngày.
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
            <span>Tìm phòng</span>
          </button>
        </form>
        <a href="#phong-noi-bat" className="tc-hero-explore">Khám phá không gian <Icon name="arrow_forward" /></a>
      </div>
      <button className="tc-slide-arrow tc-slide-arrow--prev" type="button" aria-label="Ảnh trước" onClick={() => setSlide((slide + slides.length - 1) % slides.length)}><Icon name="chevron_left" /></button>
      <button className="tc-slide-arrow tc-slide-arrow--next" type="button" aria-label="Ảnh tiếp theo" onClick={() => setSlide((slide + 1) % slides.length)}><Icon name="chevron_right" /></button>
      <div className="tc-hero-bottom">
        <span>CHẬM LẠI MỘT CHÚT. SỐNG THOẢI MÁI HƠN.</span>
        <div className="tc-slide-dots" aria-label="Chọn ảnh không gian">
          {slides.map((item, index) => <button key={item.image} type="button" aria-label={`Xem ảnh ${index + 1}`} aria-pressed={slide === index} onClick={() => setSlide(index)} />)}
        </div>
        <a href="#phong-noi-bat">CUỘN KHÁM PHÁ ↓</a>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────
// Room Card — dữ liệu từ DB
// ────────────────────────────────────────────────────────────
function GallerySection() {
  const photos = [
    ['hero', 'Một chút bình yên', 'Góc nghỉ ngơi với ánh đèn ấm áp'],
    ['living', 'Một chút nắng', 'Không gian sống thoáng sáng'],
    ['room', 'Một góc riêng', 'Phòng ngủ tiện nghi, gọn gàng'],
    ['dorm', 'Một mái nhà chung', 'Không gian dorm dành cho bạn bè'],
  ];
  return (
    <section className="tc-gallery-section" aria-label="Những góc nhỏ tại HomestayDorm">
      <div className="tc-gallery-caption"><span>KHÔNG CHỈ LÀ MỘT CHỖ Ở</span><p>Là nơi bạn bắt đầu những ngày thật dễ chịu.</p></div>
      <div className="tc-gallery-strip">
        {photos.map(([image, title, alt]) => (
          <figure key={image}>
            <img src={`/images/home/${image}.jpg`} alt={alt} loading="lazy" />
            <figcaption>{title}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section className="tc-section tc-about-section" id="gioi-thieu">
      <div className="tc-container tc-about-grid">
        <div className="tc-about-visual">
          <img src="/images/home/living.jpg" alt="Một không gian sống sáng và ấm áp" loading="lazy" />
          <span className="tc-about-note">Ở thoải mái.<br />Sống theo cách của bạn.</span>
        </div>
        <div className="tc-about-copy">
          <span className="tc-eyebrow">Về HomestayDorm</span>
          <h2 className="tc-section-title">Giữa thành phố vội,<br />có một nơi để về.</h2>
          <p>Một căn phòng vừa ý có thể khiến ngày mới nhẹ nhàng hơn. HomestayDorm mang đến những lựa chọn homestay và ký túc xá dành cho sinh viên, người đi làm tại TP.HCM.</p>
          <p>Dù bạn thích một góc riêng yên tĩnh hay không gian chia sẻ cùng bạn bè, hãy bắt đầu từ nơi phù hợp với nhịp sống và ngân sách của mình.</p>
          <div className="tc-about-benefits">
            <div><Icon name="bed" /><span><strong>Không gian tiện nghi</strong><small>Xem phòng, hình ảnh và tiện ích trước khi chọn.</small></span></div>
            <div><Icon name="payments" /><span><strong>Chi phí rõ ràng</strong><small>Theo dõi giá thuê và thông tin hợp đồng của bạn.</small></span></div>
            <div><Icon name="group" /><span><strong>Có người đồng hành</strong><small>Nhân viên hỗ trợ xem phòng và trong quá trình thuê.</small></span></div>
          </div>
          <a href="#quy-trinh" className="tc-text-link">Tìm hiểu cách thuê phòng <Icon name="arrow_forward" /></a>
        </div>
      </div>
    </section>
  );
}

function LocationSection() {
  const navigate = useNavigate();
  return (
    <section className="tc-section tc-location-section" id="khu-vuc">
      <div className="tc-container">
        <div className="tc-section-head tc-section-head--center">
          <span className="tc-eyebrow">Gần hơn với cuộc sống của bạn</span>
          <h2 className="tc-section-title">Bạn muốn ở khu vực nào?</h2>
          <p className="tc-section-sub">Chọn khu vực để khám phá những phòng phù hợp với lịch học và công việc.</p>
        </div>
        <div className="tc-location-grid">
          {[
            ['01', 'Quận 1', 'Giữa nhịp sống trung tâm'],
            ['02', 'Bình Thạnh', 'Kết nối những hành trình mỗi ngày'],
            ['03', 'Thủ Đức', 'Gần hơn với những năm tháng sinh viên'],
          ].map(([number, area, subtitle]) => (
            <button className="tc-location-card" type="button" key={area} onClick={() => navigate(`/kham-pha-phong?khuVuc=${encodeURIComponent(area)}`)}>
              <span className="tc-location-number">{number} / TP.HCM</span>
              <SearchFieldIcon name="area" />
              <strong>{area}</strong><span>{subtitle}</span>
              <span className="tc-location-link">Khám phá phòng <Icon name="arrow_forward" /></span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactSection({ onOpenAuth }) {
  return (
    <section className="tc-section tc-contact-section" id="lien-he">
      <div className="tc-container tc-contact-grid">
        <div>
          <span className="tc-eyebrow">Hẹn gặp bạn ở nhà</span>
          <h2 className="tc-section-title">Căn phòng tiếp theo<br />đang chờ bạn.</h2>
          <p className="tc-section-sub">Bạn cần thêm thông tin? Liên hệ với chúng mình hoặc tạo tài khoản để bắt đầu tìm nơi ở phù hợp.</p>
          <button className="tc-btn-primary tc-btn-large" type="button" onClick={() => onOpenAuth('register')}>Bắt đầu tìm nơi ở <Icon name="arrow_forward" /></button>
        </div>
        <div className="tc-contact-details">
          <a href="https://www.google.com/maps/search/?api=1&query=12+Nguyen+Trai+Quan+1+TP+HCM" target="_blank" rel="noreferrer"><SearchFieldIcon name="area" /><span><small>Ghé thăm chúng mình</small><strong>12 Nguyễn Trãi, Quận 1, TP.HCM</strong></span><Icon name="arrow_forward" /></a>
          <a href="tel:02811110001"><svg className="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m7 3 3 5-3 2a15 15 0 0 0 7 7l2-3 5 3v3a2 2 0 0 1-2 2C9 22 2 15 2 5a2 2 0 0 1 2-2Z" /></svg><span><small>Gọi để được tư vấn</small><strong>028 1111 0001</strong></span><Icon name="arrow_forward" /></a>
          <a href="mailto:q1@homedorm.vn"><svg className="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></svg><span><small>Gửi một lời nhắn</small><strong>q1@homedorm.vn</strong></span><Icon name="arrow_forward" /></a>
        </div>
      </div>
    </section>
  );
}

function RoomCard({ room, onViewDetail }) {
  const img = room.UrlImg || ROOM_IMAGES[room.MaLoaiPhong] || ROOM_IMAGES.LP0001;
  const amenities = ROOM_AMENITIES[room.MaLoaiPhong] || ['Wifi', 'Điều hòa'];
  const gia = room.GiaThueTheoGiuong
    ? room.GiaThueTheoGiuong.toLocaleString('vi-VN')
    : room.GiaThueNguyenPhong?.toLocaleString('vi-VN') ?? '—';

  return (
    <div className="tc-card-outer">
      <article className="tc-room-card tc-card-inner">
        <div className="tc-room-img-wrap">
          <img className="tc-room-img" src={img} alt={room.TenPhong} loading="lazy" onError={(event) => {
            const fallback = ROOM_IMAGES[room.MaLoaiPhong] || ROOM_IMAGES.LP0001;
            if (event.currentTarget.getAttribute('src') !== fallback) event.currentTarget.src = fallback;
          }} />
          <span className="tc-room-price-badge">{gia}đ/<span>giường/tháng</span></span>
        </div>
        <div className="tc-room-body">
          <div className="tc-room-meta">
            <span className="tc-room-type">{room.TenLoaiPhong}</span>
            <span className="tc-room-capacity"><Icon name="group" /> {room.SucChuaToiDa} người</span>
          </div>
          <h3 className="tc-room-name">{room.TenPhong}</h3>
          <p className="tc-room-area"><SearchFieldIcon name="area" /> {room.TenChiNhanh}</p>
          {room.MoTa && <p className="tc-room-desc">{room.MoTa}</p>}
          <div className="tc-room-tags">
            {amenities.map(a => <span key={a} className="tc-tag">{a}</span>)}
          </div>
          <div className="tc-room-footer">
            <button className="tc-room-cta" type="button" onClick={() => onViewDetail(room)}>
              Xem chi tiết <span className="tc-arrow-circle">→</span>
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Testimonials
// ────────────────────────────────────────────────────────────
function TestimonialSection() {
  return (
    <section className="tc-section tc-testimonials-section" id="danh-gia">
      <div className="tc-container">
        <div className="tc-section-head tc-section-head--center">
          <span className="tc-eyebrow">Khách hàng nói gì</span>
          <h2 className="tc-section-title">Những câu chuyện ở lại</h2>
          <p className="tc-section-sub">Một góc nhìn về cuộc sống tại HomestayDorm. Nội dung đánh giá minh họa.</p>
        </div>
        <div className="tc-testimonials-grid">
          {TESTIMONIALS.map(t => (
            <div key={t.id} className="tc-card-outer">
              <div className="tc-testimonial-card tc-card-inner">
                <div className="tc-stars">{'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}</div>
                <p className="tc-testimonial-text">"{t.text}"</p>
                <div className="tc-testimonial-author">
                  <div className="tc-avatar">{t.avatar}</div>
                  <div>
                    <div className="tc-author-name">{t.name}</div>
                    <div className="tc-author-role">{t.role}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────
// Process
// ────────────────────────────────────────────────────────────
function ProcessSection({ onOpenAuth }) {
  return (
    <section className="tc-section tc-process-section" id="quy-trinh">
      <div className="tc-container">
        <div className="tc-section-head tc-section-head--center">
          <span className="tc-eyebrow">Quy trình thuê phòng</span>
          <h2 className="tc-section-title">4 bước đơn giản để có chỗ ở</h2>
          <p className="tc-section-sub">Từ tìm phòng đến nhận chìa khóa, luôn có người đồng hành cùng bạn.</p>
        </div>
        <div className="tc-process-grid">
          {PROCESS_STEPS.map((s, idx) => (
            <div key={s.step} className="tc-card-outer">
              <div className="tc-step-card tc-card-inner">
                <div className="tc-step-number">{s.step}</div>
                <div className="tc-step-icon">
                  <ProcessIcon name={s.icon} />
                </div>
                <h3 className="tc-step-title">{s.title}</h3>
                <p className="tc-step-desc">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="tc-process-cta">
          <button className="tc-btn-primary tc-btn-large" type="button" onClick={() => onOpenAuth('register')}>
            Bắt đầu ngay — Miễn phí
          </button>
          <button className="tc-btn-outline tc-btn-large" type="button" onClick={() => onOpenAuth('login')}>
            Đã có tài khoản
          </button>
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────
// Footer
// ────────────────────────────────────────────────────────────
function FooterPublic({ onOpenAuth }) {
  return (
    <footer className="tc-footer">
      <div className="tc-container">
        <div className="tc-footer-grid">
          <div className="tc-footer-brand">
            <a href="#trang-chu" className="tc-logo tc-logo--light">
              <svg className="tc-logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9.5L12 3l9 6.5V21H3V9.5z"/><path d="M9 21V12h6v9"/>
              </svg>
              Homestay<strong>Dorm</strong>
            </a>
            <p className="tc-footer-tagline">
              Một nơi ở, một cảm giác về nhà.<br />Homestay & Dorm tại TP.HCM.
            </p>
          </div>
          <div>
            <h4 className="tc-footer-heading">Điều hướng</h4>
            <ul className="tc-footer-links">
              <li><a href="#trang-chu">Trang chủ</a></li>
              <li><a href="#phong-noi-bat">Phòng nổi bật</a></li>
              <li><a href="#gioi-thieu">Về HomestayDorm</a></li>
              <li><a href="#quy-trinh">Quy trình thuê</a></li>
              <li><a href="#danh-gia">Đánh giá</a></li>
            </ul>
          </div>
          <div>
            <h4 className="tc-footer-heading">Tài khoản</h4>
            <ul className="tc-footer-links">
              <li><button type="button" onClick={() => onOpenAuth('login')}>Đăng nhập</button></li>
              <li><button type="button" onClick={() => onOpenAuth('register')}>Đăng ký</button></li>
            </ul>
          </div>
          <div>
            <h4 className="tc-footer-heading">Liên hệ</h4>
            <ul className="tc-footer-contact">
              <li>📍 12 Nguyễn Trãi, Quận 1, TP.HCM</li>
              <li>☎ 028 1111 0001</li>
              <li>✉ q1@homedorm.vn</li>
            </ul>
          </div>
        </div>
        <div className="tc-footer-bottom">
          <span>© 2026 HomestayDorm. Đồ án môn học.</span>
          <span>Homestay &amp; Dorm Management System</span>
        </div>
      </div>
    </footer>
  );
}

// ────────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────────
export default function TrangChu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [authModal, setAuthModal] = useState(null); // null | 'login' | 'register'
  useEffect(() => {
    const next = safeNextPath(new URLSearchParams(location.search).get('next'));
    if (!next || isLoading) return;
    if (user) navigate(next, { replace: true });
    else setAuthModal('login');
  }, [location.search, isLoading, user, navigate]);

  const openAuth = useCallback((mode) => setAuthModal(mode), []);
  const closeAuth = useCallback(() => setAuthModal(null), []);
  const switchMode = useCallback((mode) => setAuthModal(mode), []);
  const viewRoomDetail = useCallback((room) => {
    if (!room?.MaPhong) return;
    navigate(`/kham-pha-phong?phong=${encodeURIComponent(room.MaPhong)}`);
  }, [navigate]);

  useEffect(() => {
    httpClient.get('/trang-chu/phong-noi-bat')
      .then(res => setRooms(res.data.data || []))
      .catch(() => setRooms([]))
      .finally(() => setLoadingRooms(false));
  }, []);

  return (
    <div className={`tc-page ${authModal ? 'tc-page--blurred' : ''}`}>
      <HeaderPublic onOpenAuth={openAuth} />

      <main>
        <HeroSection />
        <GallerySection />

        {/* Phòng nổi bật */}
        <section className="tc-section tc-rooms-section" id="phong-noi-bat">
          <div className="tc-container">
            <div className="tc-section-head tc-section-head--center">
              <span className="tc-eyebrow">Phòng nổi bật</span>
              <h2 className="tc-section-title">Tìm một góc dành riêng cho bạn</h2>
              <p className="tc-section-sub">Từ phòng riêng ấm cúng đến dorm thân thiện, chọn không gian bạn muốn gọi là nhà.</p>
            </div>

            {loadingRooms ? (
              <div className="tc-rooms-loading">
                <div className="tc-spinner" />
                <p>Đang tải danh sách phòng...</p>
              </div>
            ) : rooms.length > 0 ? (
              <div className="tc-rooms-grid">
                {rooms.map(room => <RoomCard key={room.MaPhong} room={room} onViewDetail={viewRoomDetail} />)}
              </div>
            ) : (
              <div className="tc-rooms-empty">Hiện chưa có phòng nào để hiển thị.</div>
            )}

            <div className="tc-rooms-more">
              <button className="tc-btn-outline" type="button" onClick={() => navigate('/kham-pha-phong')}>
                Khám phá thêm phòng →
              </button>
            </div>
          </div>
        </section>

        <AboutSection />
        <TestimonialSection />
        <LocationSection />
        <ProcessSection onOpenAuth={openAuth} />
        <ContactSection onOpenAuth={openAuth} />
      </main>

      <FooterPublic onOpenAuth={openAuth} />

      {/* Auth Modal */}
      {authModal && (
        <AuthModal mode={authModal} onClose={closeAuth} onSwitchMode={switchMode} />
      )}
    </div>
  );
}
