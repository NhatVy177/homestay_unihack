import React, { useEffect, useRef, useState } from 'react';
import { formatMoney, formatServiceMoney, getDemoRoomImage } from './roomDetail.js';
import ShareRoomButton from '../common/ShareRoomButton.jsx';
import { gioiTinhIcon, nhanGioiTinhPhong } from '../../utils/genderRules.js';
import './roomDetail.css';

const ROOM_FULL_LABEL = 'Hết chỗ';

function getRoomStatusTone(status = '') {
  if (status === 'Còn trống') return 'is-open';
  if (status === 'Đang chờ cọc') return 'is-waiting';
  if (status === ROOM_FULL_LABEL) return 'is-full';
  return '';
}

function Icon({ name, className = '' }) {
  const shapes = {
    man: <><circle cx="12" cy="4.5" r="1.8" /><path d="M9 9h6v6l-1 .3V21h-4v-5.7L9 15Z" /></>,
    woman: <><circle cx="12" cy="4.5" r="1.8" /><path d="M12 8l4 8h-2.4V21h-3.2v-5H8Z" /></>,
    wc: <><circle cx="7" cy="4.5" r="1.6" /><path d="M5 8h4v6l-.7.2V21H5.7v-6.8L5 14Z" /><circle cx="17" cy="4.5" r="1.6" /><path d="M17 8l3 7h-2.2V21h-1.6v-6H14l3-7Z" /></>,
    clipboard: <><rect x="6" y="4.5" width="12" height="16" rx="2" /><path d="M9.5 4.5V3.5h5v1M9.5 10h5M9.5 14h5M9.5 17.5h3" /></>,
    shield: <><path d="M12 3.5 5 6.2v5.3c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6.2z" /><path d="m9 12 2.2 2.2L15.5 10" /></>,
    home: <><path d="M3.5 11.2 12 4l8.5 7.2" /><path d="M5.5 10.4V20h13v-9.6" /><path d="M9.5 20v-5.8h5V20" /></>,
    explore: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2.4 5.1-5.1 2.4 2.4-5.1 5.1-2.4Z" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
    profile: <><path d="M7 4h7l3 3v13H7z" /><path d="M14 4v4h4M10 13h4M10 17h4" /></>,
    calendar: <><rect x="4" y="5.5" width="16" height="14" rx="2" /><path d="M8 3.5v4M16 3.5v4M4 10h16" /></>,
    deposit: <><rect x="3.5" y="6" width="17" height="12" rx="2" /><path d="M3.5 10h17M7 14h4" /></>,
    contract: <><path d="M6 3.8h8l4 4V20H6z" /><path d="M14 4v5h5M9 13h6M9 17h6" /></>,
    invoice: <><path d="M7 4h10v17l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2z" /><path d="M10 9h4M10 13h4M10 17h2" /></>,
    payment: <><rect x="3.5" y="6.5" width="17" height="11" rx="2" /><path d="M3.5 10h17M15.5 14h2" /></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M17 8 12 3 7 8" /><path d="M12 3v12" /></>,
    bank: <><path d="M4 10h16" /><path d="m12 4 8 4H4z" /><path d="M6 10v7M10 10v7M14 10v7M18 10v7" /><path d="M4 20h16" /></>,
    copy: <><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" /></>,
    repair: <path d="M14.5 6.2a4.2 4.2 0 0 0-5.2 5.2L4 16.7 7.3 20l5.3-5.3a4.2 4.2 0 0 0 5.2-5.2l-2.9 2.9-2.3-2.3z" />,
    support: <><path d="M5 5.5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-5 3v-3a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z" /><path d="M8 11.5h.01M12 11.5h.01M16 11.5h.01" /></>,
    phone: <path d="M7.1 3.5 9.7 7.8 7.9 9.6c1.3 2.6 3.4 4.7 6 6l1.8-1.8 4.3 2.6v2.8c0 1-0.8 1.8-1.8 1.8C9.8 20.5 3.5 14.2 3 5.8 3 4.8 3.8 4 4.8 4h2.3Z" />,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    people: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
    room: <><path d="M4 20V8.5L12 4l8 4.5V20" /><path d="M8 20v-7h8v7M9 9.5h.01M15 9.5h.01" /></>,
    layers: <><path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z" /><path d="m4 12 8 4.5 8-4.5" /><path d="m4 16.5 8 4.5 8-4.5" /></>,
    tile: <><rect x="4" y="4" width="6" height="6" /><rect x="14" y="4" width="6" height="6" /><rect x="4" y="14" width="6" height="6" /><rect x="14" y="14" width="6" height="6" /></>,
    check: <path d="m5 12 4.2 4.2L19 6.5" />,
    'arrow-left': <><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></>,
    'arrow-right': <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 10v6M12 7h.01" /></>,
    map: (
      <>
        <path d="M12 21s6-5.3 6-11a6 6 0 1 0-12 0c0 5.7 6 11 6 11Z" />
        <circle cx="12" cy="10" r="2.2" />
      </>
    ),
    bed: <><path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7" /><path d="M3 15h18M7 9V7h4v2" /></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" /><path d="M10 20a2 2 0 0 0 4 0" /></>
  };

  return (
    <svg className={`kp-line-icon ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {shapes[name] || shapes.home}
    </svg>
  );
}

function GalleryPhoto({ urlAnh, fallbackUrl, moTa, index }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? fallbackUrl : (urlAnh || fallbackUrl);

  if (!src) {
    return (
      <div className="kh-gallery-placeholder">
        <Icon name="room" />
      </div>
    );
  }

  return <img src={src} alt={moTa || `Ảnh ${index + 1}`} onError={() => setFailed(true)} loading="lazy" />;
}

// Các prop sau chỉ dùng ở trang khách đã đăng nhập (D-042/D-043): lịch xem đang có, hồ sơ đang mở để thêm phòng quan tâm,
// đăng ký theo nhóm. Trang công khai không truyền thì giữ nguyên nút "Đăng ký thuê ngay".
export default function RoomDetailView({ phong, onBack, onRent, onRentGroup, heartState = null, scheduledMessage = '', profile = null, isInProfile = false, profileBusy = false, onAddToProfile, onRemoveFromProfile }) {
  const [lightbox, setLightbox] = useState(null);
  const lightboxRef = useRef(null);
  const anh = phong.hinhAnh || [];
  const tienNghi = phong.tienNghi || [];
  const dichVuUocTinh = phong.dichVuUocTinh || [];
  const mainAnh = anh[0];
  const extraAnh = anh.slice(1, 5);

  useEffect(() => {
    if (lightbox === null) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    lightboxRef.current?.querySelector('button')?.focus();
    function onKey(event) {
      if (event.key === 'Escape') setLightbox(null);
      if (event.key === 'ArrowLeft') { event.preventDefault(); setLightbox(current => (current - 1 + anh.length) % anh.length); }
      if (event.key === 'ArrowRight') { event.preventDefault(); setLightbox(current => (current + 1) % anh.length); }
      if (event.key === 'Tab') {
        const buttons = [...lightboxRef.current.querySelectorAll('button')];
        const first = buttons[0]; const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', onKey); previousFocus?.focus(); };
  }, [lightbox === null, anh.length]);

  return (
    <section className="kh-detail-view">
      <button className="kh-detail-back" type="button" onClick={onBack}>
        <Icon name="arrow-left" />Quay lại danh sách phòng
      </button>

      <div className="kh-detail-header">
        <h1 className="kh-detail-title">{phong.tenPhong}</h1>
        <p className="kh-detail-addr"><Icon name="map" />{phong.diaChi}</p>
        <ShareRoomButton room={phong} />
      </div>

      {/* Gallery */}
      <div className="kh-gallery-grid">
        <button className="kh-gallery-main" type="button" aria-label="Xem ảnh chính" disabled={!mainAnh} onClick={() => mainAnh && setLightbox(0)}>
          {mainAnh
            ? <GalleryPhoto urlAnh={mainAnh.urlAnh} fallbackUrl={mainAnh.fallbackUrl} moTa={mainAnh.moTa || phong.tenPhong} index={0} />
            : <div className="kh-gallery-placeholder"><Icon name="room" /></div>}
        </button>
        <div className="kh-gallery-thumbs">
          {extraAnh.map((img, idx) => (
            <button key={img.stt} type="button" aria-label={`Xem ảnh ${idx + 2}`} className="kh-gallery-thumb" onClick={() => setLightbox(idx + 1)}>
              <GalleryPhoto urlAnh={img.urlAnh} fallbackUrl={img.fallbackUrl} moTa={img.moTa} index={idx + 1} />
              {idx === 3 && anh.length > 5 && (
                <div className="kh-gallery-more">+{anh.length - 5} ảnh</div>
              )}
            </button>
          ))}
        </div>
      </div>
      {anh.some(image => image.laAnhDemo) && <p className="kh-detail-photo-note">Một số ảnh là ảnh minh họa không gian.</p>}

      {/* Body grid */}
      <div className="kh-detail-body">
        <div className="kh-detail-left">
          {/* Thông tin chung */}
          <div className="kh-detail-section">
            <h2>Thông tin chung</h2>
            <div className="kh-detail-stats">
              <div>
                <Icon name="people" />
                <span>Sức chứa tối đa</span>
                <strong>{phong.sucChua} người</strong>
              </div>
              <div>
                <Icon name={gioiTinhIcon(phong.gioiTinhChoPhep)} />
                <span>Giới tính phù hợp</span>
                <strong>{nhanGioiTinhPhong(phong.gioiTinhChoPhep) || 'Chưa cập nhật'}</strong>
              </div>
              {phong.tang != null && (
                <div>
                  <Icon name="layers" />
                  <span>Vị trí tầng</span>
                  <strong>Tầng {phong.tang}</strong>
                </div>
              )}
            </div>
            <div className="kh-detail-stats kh-detail-stats--more">
              {phong.loaiPhong && <div><Icon name="room" /><span>Loại phòng</span><strong>{phong.loaiPhong}</strong></div>}
              {phong.chiNhanh && <div><Icon name="map" /><span>Chi nhánh</span><strong>{phong.chiNhanh}</strong></div>}
              {phong.giaThueTheoGiuong ? <div><Icon name="payment" /><span>Giá mỗi giường</span><strong>{Number(phong.giaThueTheoGiuong).toLocaleString('vi-VN')}đ/tháng</strong></div> : null}
              {Number(phong.soGiuongTrong) > 0 && <div><Icon name="bed" /><span>Giường còn trống</span><strong>{phong.soGiuongTrong} giường</strong></div>}
            </div>
            <p className="kh-detail-mota">{phong.moTa || `${phong.tenPhong || 'Phòng'} thuộc ${phong.chiNhanh || 'HomeStayDorm'}${phong.loaiPhong ? `, loại ${phong.loaiPhong.toLowerCase()}` : ''}${phong.sucChua ? `, sức chứa tối đa ${phong.sucChua} người` : ''}. Phòng được dọn dẹp định kỳ, có an ninh và hỗ trợ từ nhân viên quản lý trong suốt thời gian thuê.`}</p>
          </div>

          {tienNghi.length > 0 && (
            <div className="kh-detail-section">
              <h2>Tiện nghi phòng</h2>
              <div className="kh-amenity-list">
                {tienNghi.map((item) => (
                  <div key={item.maTaiSan || item.tenTienNghi || item.tenTaiSan}>
                    <Icon name="check" />
                    <span>{item.tenTienNghi || item.tenTaiSan}</span>
                    {Number(item.soLuong) > 1 && <small>x{item.soLuong}</small>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tat ca anh */}
          {anh.length > 0 && (
            <div className="kh-detail-section">
              <h2>Tất cả hình ảnh ({anh.length})</h2>
              <div className="kh-all-photos">
                {anh.map((img, idx) => (
                  <button key={img.stt} type="button" aria-label={`Phóng to ảnh ${idx + 1}`} className="kh-all-photo-item" onClick={() => setLightbox(idx)}>
                    <GalleryPhoto urlAnh={img.urlAnh} fallbackUrl={img.fallbackUrl} moTa={img.moTa} index={idx} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {dichVuUocTinh.length > 0 && (
            <div className="kh-detail-section">
              <h2>Dịch vụ đi kèm</h2>
              <div className="kh-extra-services">
                {dichVuUocTinh.map((item) => (
                  <div key={item.maDichVu || item.tenDichVu}><span>{item.tenDichVu}</span><strong>{formatServiceMoney(item.donGia, item.donViTinh)}</strong></div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="kh-detail-sidebar">
          <div className="kh-detail-price-card">
            <div className="kh-detail-price-top">
              <span>Giá thuê hàng tháng</span>
              <strong>{formatMoney(phong.giaThue)}</strong>
            </div>
            {dichVuUocTinh.length > 0 && (
              <div className="kh-detail-service-list">
                <h3>Chi phí dịch vụ ước tính</h3>
                {dichVuUocTinh.map((item) => (
                  <div className="kh-detail-service-row" key={item.maDichVu || item.tenDichVu}>
                    <span>{item.tenDichVu}</span>
                    <strong>{formatServiceMoney(item.donGia, item.donViTinh)}</strong>
                  </div>
                ))}
              </div>
            )}
            {phong.trangThaiQuanTam && (
              <p className="kh-detail-room-status"><span className={`kh-room-status ${getRoomStatusTone(phong.trangThaiQuanTam)}`}>{phong.trangThaiQuanTam}</span></p>
            )}
            {scheduledMessage ? (
              <>
                <button className="kp-btn kp-btn-primary kp-full kh-detail-cta kh-detail-register" type="button" disabled>
                  <Icon name="calendar" />
                  Đang có lịch xem phòng
                </button>
                <p className="kh-detail-flow-note">{scheduledMessage}</p>
              </>
            ) : profile ? (
              <button
                className={`kp-btn kp-full kh-detail-cta kh-detail-heart ${isInProfile ? 'is-active' : ''}`}
                type="button"
                aria-pressed={isInProfile}
                title={heartState?.title || ''}
                disabled={phong.trangThaiQuanTam === ROOM_FULL_LABEL || profileBusy || Boolean(heartState?.disabled)}
                onClick={() => (isInProfile ? onRemoveFromProfile(phong) : onAddToProfile(phong))}
              >
                {phong.trangThaiQuanTam === ROOM_FULL_LABEL
                  ? ROOM_FULL_LABEL
                  : heartState?.disabled
                    ? 'Không cùng loại/chi nhánh với hồ sơ'
                    : isInProfile ? `Đã quan tâm · hồ sơ ${profile.maDangKy}` : 'Quan tâm phòng này'}
              </button>
            ) : (
              <button
                className="kp-btn kp-btn-primary kp-full kh-detail-cta kh-detail-register"
                type="button"
                disabled={phong.trangThaiQuanTam === ROOM_FULL_LABEL}
                onClick={() => onRent(phong)}
              >
                {phong.trangThaiQuanTam !== ROOM_FULL_LABEL && <Icon name="clipboard" />}
                {phong.trangThaiQuanTam === ROOM_FULL_LABEL ? ROOM_FULL_LABEL : 'Tôi quan tâm phòng này'}
              </button>
            )}
            {onRentGroup && !scheduledMessage && !profile && phong.trangThaiQuanTam !== ROOM_FULL_LABEL && (
              <button className="kp-btn kp-full kh-detail-group" type="button" onClick={() => onRentGroup(phong)}>
                <Icon name="people" />
                Đăng ký thuê theo nhóm
              </button>
            )}
            {phong.trangThaiQuanTam === ROOM_FULL_LABEL || phong.trangThaiQuanTam === 'Đang chờ cọc' ? (
              <div className="kh-detail-note">
                <Icon name="info" />
                <span>
                  {phong.trangThaiQuanTam === ROOM_FULL_LABEL
                    ? 'Phòng này đã hết chỗ. Vui lòng chọn phòng khác.'
                    : 'Phòng đang có người giữ chỗ. Bạn vẫn có thể gửi nhu cầu; nếu phòng không còn, nhân viên Sale sẽ tư vấn phòng khác.'}
                </span>
              </div>
            ) : (
              <>
                <p className="kh-detail-flow-help">Nhân viên Sale sẽ kiểm tra tình trạng thực tế và sắp xếp lịch xem phòng phù hợp. Khách chỉ đặt cọc sau khi đã xem phòng.</p>
                <p className="kh-detail-flow-badge"><Icon name="shield" />Gửi phiếu nhu cầu trước, Sale xếp phòng sau</p>
              </>
            )}
          </div>

        </aside>
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div className="kh-lightbox" ref={lightboxRef} role="dialog" aria-modal="true" aria-label="Ảnh phòng phóng to" onClick={() => setLightbox(null)}>
          <button className="kh-lightbox-close" type="button" aria-label="Đóng ảnh" onClick={() => setLightbox(null)}>✕</button>
          <button className="kh-lightbox-prev" type="button" aria-label="Ảnh trước" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + anh.length) % anh.length); }}>‹</button>
          <div className="kh-lightbox-img" onClick={(e) => e.stopPropagation()}>
            <img
              src={anh[lightbox]?.urlAnh || anh[lightbox]?.fallbackUrl}
              alt={anh[lightbox]?.moTa || ''}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = anh[lightbox]?.fallbackUrl || getDemoRoomImage(phong.maPhong, lightbox);
              }}
            />
            {anh[lightbox]?.moTa && <p>{anh[lightbox].moTa}</p>}
          </div>
          <button className="kh-lightbox-next" type="button" aria-label="Ảnh tiếp theo" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % anh.length); }}>›</button>
        </div>
      )}
    </section>
  );
}
