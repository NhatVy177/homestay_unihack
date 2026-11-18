import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { getAuthenticatedHomePath } from '../../auth/auth.routes.js';
import { Icon } from '../../components/common/Icon.jsx';
import { CONTACT_PHONE, groupBranches, imageFallback, imageFor, money, priceFor, unitFor } from './homeData.js';
import { buildBranchLayout } from './houseLayout.js';
import { gioiTinhHienThi, gioiTinhIcon } from '../../components/rooms/RoomDetailView.jsx';
import './experience.css';

const CurvedGallery = lazy(() => import('./HomeScenes.jsx').then(module => ({ default: module.CurvedGallery })));
const HouseScene = lazy(() => import('./HomeScenes.jsx').then(module => ({ default: module.HouseScene })));
const HomeMap = lazy(() => import('./HomeMap.jsx'));

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

function useNearScreen() {
  const ref = useRef(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNear(true); observer.disconnect(); }
    }, { rootMargin: '250px' });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, near];
}

export function Reveal({ children, className = '', delay = 0, kind = 'up' }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(reduced);
  useEffect(() => {
    if (reduced) { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold: .12 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [reduced]);
  return <div ref={ref} className={`hx-reveal hx-reveal--${kind} ${visible ? 'is-visible' : ''} ${className}`} style={{ '--reveal-delay': `${delay}ms` }}>{children}</div>;
}

export function SectionHeading({ title, subtitle }) {
  return <div className="hx-section-head"><Reveal kind="text"><h2>{title}</h2></Reveal><Reveal delay={200}><span className="hx-heading-line" /></Reveal>{subtitle && <Reveal delay={300}><p>{subtitle}</p></Reveal>}</div>;
}

function CountUp({ value }) {
  const ref = useRef(null);
  const [count, setCount] = useState(value);
  const reduced = useReducedMotion();
  useEffect(() => {
    let frame;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      if (reduced) { setCount(value); return; }
      const start = performance.now();
      const tick = time => {
        const t = Math.min((time - start) / 1100, 1);
        setCount(Math.round(value * (1 - (1 - t) ** 3)));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    if (ref.current) observer.observe(ref.current);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [value, reduced]);
  return <span ref={ref}>{count}</span>;
}

export function GallerySection({ rooms }) {
  const [ref, near] = useNearScreen();
  const photos = [...new Set([...rooms.slice(0, 6).map(imageFor), '/images/home/hero.jpg', '/images/home/room.jpg', '/images/home/living.jpg', '/images/home/dorm.jpg'])].slice(0, 10);
  return <section className="hx-gallery-section" ref={ref} aria-label="Bộ ảnh các phòng">
    <div className="hx-gallery-heading"><Reveal kind="text"><h2>Không gian dành cho bạn,<br />cảm hứng cho mỗi ngày.</h2></Reveal><Reveal delay={180}><p>Những góc nhỏ được chăm chút để việc học, làm việc và nghỉ ngơi đều thật dễ chịu.</p></Reveal></div>
    <Suspense fallback={<div className="hx-gallery-fallback">{photos.slice(0, 5).map(photo => <img key={photo} src={photo} alt="Không gian phòng" onError={imageFallback} />)}</div>}>
      {near && <CurvedGallery photos={photos} />}
    </Suspense>
  </section>;
}

export function RoomCard({ room, onViewDetail, index = 0 }) {
  const card = useRef(null);
  const reduced = useReducedMotion();
  const { user } = useAuth();
  function tilt(event) {
    if (reduced || event.pointerType !== 'mouse') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    card.current.style.setProperty('--rx', `${(0.5 - y) * 7}deg`);
    card.current.style.setProperty('--ry', `${(x - 0.5) * 9}deg`);
    card.current.style.setProperty('--glow-x', `${x * 100}%`);
    card.current.style.setProperty('--glow-y', `${y * 100}%`);
  }
  function reset() { card.current.style.setProperty('--rx', '0deg'); card.current.style.setProperty('--ry', '0deg'); }
  // Dấu tim: chưa đăng nhập thì yêu cầu đăng nhập, rồi vào đúng phòng trong cổng khách để thêm vào hồ sơ quan tâm.
  function interest() {
    const target = `/khach-hang?phong=${encodeURIComponent(room.MaPhong)}`;
    window.location.assign(user ? (user.vaiTro === 'KhachHang' ? target : getAuthenticatedHomePath(user)) : `/?next=${encodeURIComponent(target)}`);
  }
  return <Reveal delay={(index % 3) * 100} kind="spring">
    <article className="hx-room-card tc-room-card" ref={card} onPointerMove={tilt} onPointerLeave={reset}>
      <button className="hx-room-heart" type="button" aria-label={`Quan tâm ${room.TenPhong}`} title="Quan tâm phòng này" onClick={interest}><Icon name="favorite" /></button>
      <button className="hx-room-image" type="button" onClick={() => onViewDetail(room)} aria-label={`Xem ${room.TenPhong}`}><img src={imageFor(room)} alt={room.TenPhong} loading="lazy" onError={imageFallback} /></button>
      <div className="hx-room-body"><h3>{room.TenPhong}</h3><p className="hx-room-area"><Icon name="home" />{room.TenChiNhanh}</p>
        <div className="hx-room-tags"><span><Icon name="wifi" />Wifi miễn phí</span>{room.SucChuaToiDa && <span><Icon name="group" />{room.SucChuaToiDa} người</span>}<span><Icon name={gioiTinhIcon(room.GioiTinhChoPhep ?? room.gioiTinhChoPhep)} />{gioiTinhHienThi(room.GioiTinhChoPhep ?? room.gioiTinhChoPhep)}</span></div>
        <div className="hx-room-bottom"><div><strong>{priceFor(room) ? money(priceFor(room)) : 'Liên hệ'}</strong><span> / {unitFor(room)}</span></div><button className="tc-room-cta hx-room-view" type="button" onClick={() => onViewDetail(room)}>Xem ngay</button></div>
      </div>
    </article>
  </Reveal>;
}

export function AboutSection({ rooms, branches, roomTypes, onViewDetail }) {
  const groups = useMemo(() => groupBranches(rooms, branches).map(group => ({ ...group, layout: buildBranchLayout(group.rooms) })), [rooms, branches]);
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [floorChoice, setFloorChoice] = useState(null);
  const [ref, near] = useNearScreen();
  const selected = groups[index % Math.max(groups.length, 1)];
  const layout = selected?.layout;
  const currentFloor = floorChoice === 'unknown' ? null : layout?.floors.find(floor => floor.number === floorChoice) || layout?.floors.find(floor => floor.rooms.length);
  const listedRooms = floorChoice === 'unknown' || !layout?.floors.length ? layout?.unassigned : currentFloor?.rooms;
  function changeBranch(next) { setIndex(next); setFloorChoice(null); }
  return <section className="hx-section hx-about-section" id="gioi-thieu" ref={ref}>
    <div className="tc-container hx-about-grid">
      <div className="hx-about-copy"><Reveal kind="text"><h2>Về HomestayDorm</h2></Reveal><Reveal delay={150}><span className="hx-heading-line" /></Reveal>
        <Reveal delay={230}><p>HomestayDorm mang đến những lựa chọn homestay và ký túc xá tại TP.HCM dành cho sinh viên, người đi làm. Một góc riêng để tập trung hay không gian chung để kết nối — bạn có thể tìm nơi ở phù hợp với nhịp sống của mình.</p><p>Xem hình ảnh, tiện ích và giá thuê trước khi chọn phòng. Nhân viên sẽ đồng hành cùng bạn từ buổi xem phòng đến khi nhận chìa khóa.</p></Reveal>
        <Reveal delay={330}><dl className="hx-stats"><div><dt>phòng đang giới thiệu</dt><dd><CountUp value={rooms.length} /></dd></div><div><dt>chi nhánh</dt><dd><CountUp value={groups.length} /></dd></div><div><dt>loại phòng</dt><dd><CountUp value={roomTypes.length} /></dd></div></dl></Reveal>
        <Reveal delay={430}><a href="#phong-noi-bat" className="hx-inline-link">Khám phá các phòng <Icon name="arrow_forward" /></a></Reveal>
      </div>
      <Reveal className="hx-house-panel" delay={220}>
        <div className="hx-house-toolbar"><div><h3>{selected?.name || 'HomestayDorm'}</h3><p>{selected?.address || 'Không gian homestay & dorm'}</p><p className="hx-house-summary" aria-live="polite">{layout?.floorCount ? `${layout.floorCount} tầng · ${layout.roomCount} phòng` : layout?.roomCount ? `${layout.roomCount} phòng · Chưa có thông tin tầng` : 'Chưa có dữ liệu phòng'}</p></div><div><button type="button" aria-label="Chi nhánh trước" disabled={groups.length < 2} onClick={() => changeBranch((index + groups.length - 1) % groups.length)}><Icon name="chevron_left" /></button><button type="button" aria-label="Chi nhánh tiếp theo" disabled={groups.length < 2} onClick={() => changeBranch((index + 1) % groups.length)}><Icon name="chevron_right" /></button></div></div>
        <button className="hx-house-expand" type="button" aria-expanded={expanded} disabled={!layout?.floorCount} onClick={() => setExpanded(current => !current)}><Icon name="apartment" />{expanded ? 'Gộp lại' : 'Mở các căn'}</button>
        <Suspense fallback={<div className="hx-house-loading"><Icon name="home" /></div>}>{near && layout && <HouseScene expanded={expanded} variant={index} layout={layout} selectedFloor={currentFloor?.number} />}</Suspense>
        <div className="hx-house-floors" role="group" aria-label="Chọn tầng xem phòng">{layout?.floors.map(floor => <button type="button" key={floor.number} aria-pressed={floorChoice !== 'unknown' && currentFloor?.number === floor.number} onClick={() => setFloorChoice(floor.number)}>{floor.name}<span>{floor.rooms.length} phòng</span></button>)}{layout?.unassigned.length > 0 && <button type="button" aria-pressed={floorChoice === 'unknown' || !layout.floorCount} onClick={() => setFloorChoice('unknown')}>Chưa rõ tầng<span>{layout.unassigned.length} phòng</span></button>}</div>
        <div className="hx-house-rooms" aria-live="polite">{listedRooms?.map(room => <button type="button" key={room.MaPhong} onClick={() => onViewDetail(room)}>{room.TenPhong}<span>{money(priceFor(room))}</span><Icon name="arrow_forward" /></button>)}{currentFloor && listedRooms?.length === 0 && <p className="hx-house-empty">Chưa có phòng {currentFloor.name.toLocaleLowerCase('vi-VN')} trong danh sách.</p>}</div>
        <div className="hx-house-dots">{groups.map((group, i) => <button key={group.name} type="button" aria-label={`Xem ${group.name}`} aria-pressed={index === i} onClick={() => changeBranch(i)} />)}</div>
        <small className="hx-house-caption">Số tầng/phòng theo danh sách chi nhánh; bố trí nội thất minh họa. Kéo để xoay, bấm “Mở các căn” để khám phá.{layout?.unassigned.length > 0 && ` ${layout.unassigned.length} phòng chưa rõ tầng được liệt kê riêng.`}</small>
      </Reveal>
    </div>
  </section>;
}

export function LocationSection({ rooms, branches }) {
  const [ref, near] = useNearScreen();
  const groups = groupBranches(rooms, branches);
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();
  return <section className="hx-section hx-location-section" id="vi-tri" ref={ref}>
    <div className="tc-container"><SectionHeading title="Vị Trí Của Chúng Tôi" subtitle="Khám phá các chi nhánh trên bản đồ, chọn nơi thuận tiện với bạn." />
      <Reveal delay={100}><div className="hx-location-layout">
        <div className="hx-map-list">{groups.length ? groups.map((group, i) => <button className={`hx-map-item ${selected === i ? 'is-active' : ''}`} type="button" key={group.name} onClick={() => setSelected(i)}><img src={group.image} alt="" onError={imageFallback} /><span><strong>{group.name}</strong><small>{group.address}</small><em>{group.rooms.length} phòng đang giới thiệu</em></span><Icon name="arrow_forward" /></button>) : <p>Chưa có thông tin chi nhánh để hiển thị.</p>}</div>
        <div className="hx-map-panel"><Suspense fallback={<div className="hx-map-loading">Đang tải bản đồ...</div>}>{near && <HomeMap groups={groups} selected={selected} onSelect={setSelected} />}</Suspense>
          {selected !== null && groups[selected] && <div className="hx-map-detail"><strong>{groups[selected].name}</strong><span>{groups[selected].address}</span><button type="button" onClick={() => navigate(`/phong?khuVuc=${encodeURIComponent(groups[selected].area || groups[selected].name)}`)}>Xem các phòng <Icon name="arrow_forward" /></button></div>}
        </div>
      </div></Reveal><p className="hx-map-caption">Điểm ghim biểu thị khu vực tham khảo; địa chỉ chi tiết hiển thị trong danh sách chi nhánh.</p>
    </div>
  </section>;
}

function ContactIcon({ name }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{name === 'phone' ? <path d="m7 3 3 5-3 2a15 15 0 0 0 7 7l2-3 5 3v3a2 2 0 0 1-2 2C9 22 2 15 2 5a2 2 0 0 1 2-2Z" /> : name === 'mail' ? <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></> : <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />}</svg>;
}

export function ContactSection() {
  // The project has no verified Zalo account; show the same third contact card as an onsite enquiry.
  return <section className="hx-section hx-contact-section" id="lien-he"><div className="tc-container"><SectionHeading title="Liên Hệ" subtitle="Chúng mình luôn sẵn sàng lắng nghe bạn." />
    <div className="hx-contact-cards">{[
      ['phone', 'Điện thoại', CONTACT_PHONE, `tel:${CONTACT_PHONE}`],
      ['mail', 'Email', 'q1@homedorm.vn', 'mailto:q1@homedorm.vn'],
      ['chat', 'Tư vấn', 'Trao đổi về phòng của bạn', '#tu-van'],
    ].map(([icon, title, value, href], i) => <Reveal key={icon} delay={180 + i * 150} kind="spring"><a href={href} className="hx-contact-card" onClick={icon === 'chat' ? event => { event.preventDefault(); window.dispatchEvent(new Event('homedorm:open-contact')); } : undefined}><span className="hx-contact-icon"><ContactIcon name={icon} /></span><span className="hx-contact-label">{title}</span><strong>{value}</strong></a></Reveal>)}</div>
  </div></section>;
}

export function FloatingContact() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    const close = event => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('homedorm:open-contact', show);
    window.addEventListener('keydown', close);
    return () => { window.removeEventListener('homedorm:open-contact', show); window.removeEventListener('keydown', close); };
  }, []);
  return <aside className="hx-floating-contact" aria-label="Liên hệ nhanh">
    {open && <div className="hx-contact-popover" role="dialog" aria-label="Tư vấn phòng"><button type="button" aria-label="Đóng tư vấn" onClick={() => setOpen(false)}><Icon name="close" /></button><strong>Chào bạn, mình có thể giúp gì?</strong><p>Gọi hoặc gửi email để được tư vấn phòng, lịch xem và thông tin thuê.</p><a href={`tel:${CONTACT_PHONE}`}><ContactIcon name="phone" />{CONTACT_PHONE}</a><a href="mailto:q1@homedorm.vn"><ContactIcon name="mail" />q1@homedorm.vn</a></div>}
    <button className="hx-float-chat" type="button" aria-label="Mở tư vấn" aria-expanded={open} onClick={() => setOpen(current => !current)}><ContactIcon name="chat" /></button>
    <a className="hx-float-phone" href={`tel:${CONTACT_PHONE}`} aria-label="Gọi HomestayDorm"><ContactIcon name="phone" /></a>
  </aside>;
}

export function FooterPublic({ onOpenAuth }) {
  const [policyOpen, setPolicyOpen] = useState(false);
  const policyButton = useRef(null);
  const closeButton = useRef(null);
  useEffect(() => {
    if (!policyOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const close = event => { if (event.key === 'Escape') setPolicyOpen(false); };
    window.addEventListener('keydown', close);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', close); policyButton.current?.focus(); };
  }, [policyOpen]);
  return <><footer className="tc-footer hx-footer"><div className="tc-container"><div className="hx-footer-grid">
    <Reveal><a href="#trang-chu" className="tc-logo tc-logo--light"><Icon name="home" />Homestay<strong>Dorm</strong></a><p>Ngôi nhà ấm cúng của bạn tại Sài Gòn.</p></Reveal>
    <Reveal delay={120}><h3>Liên kết nhanh</h3><a href="#phong-noi-bat">Phòng</a><button className="hx-policy-link" ref={policyButton} type="button" onClick={() => setPolicyOpen(true)}>Điều khoản và chính sách bảo mật</button></Reveal>
    <Reveal delay={240}><h3>Kết nối với chúng mình</h3><div className="hx-footer-social"><a href={`tel:${CONTACT_PHONE}`} aria-label="Điện thoại"><ContactIcon name="phone" /></a><a href="mailto:q1@homedorm.vn" aria-label="Email"><ContactIcon name="mail" /></a><button type="button" aria-label="Tư vấn" onClick={() => window.dispatchEvent(new Event('homedorm:open-contact'))}><ContactIcon name="chat" /></button></div><div className="hx-footer-auth"><button type="button" onClick={() => onOpenAuth('login')}>Đăng nhập</button><button type="button" onClick={() => onOpenAuth('register')}>Đăng ký</button></div></Reveal>
    </div><Reveal><div className="hx-copyright">© {new Date().getFullYear()} HomestayDorm. Đồ án môn học.</div></Reveal></div></footer>
    {policyOpen && <div className="hx-policy-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setPolicyOpen(false); }}><div className="hx-policy-dialog" role="dialog" aria-modal="true" aria-labelledby="hx-policy-title"><button type="button" ref={closeButton} aria-label="Đóng điều khoản" onClick={() => setPolicyOpen(false)}><Icon name="close" /></button><h2 id="hx-policy-title">Điều khoản và chính sách bảo mật</h2><h3>Thông tin thuê phòng</h3><p>Giá và tiện ích được trình bày trong từng phòng. Các khoản thu, tiền cọc và điều kiện thuê cụ thể được xác nhận trong hồ sơ thuê và hợp đồng; hãy đọc kỹ trước khi xác nhận.</p><h3>Tài khoản và hồ sơ</h3><p>Bạn cần đăng nhập để xem và thực hiện các thao tác trong hồ sơ thuê của mình. Không chia sẻ mật khẩu hoặc mã xác nhận với người khác.</p><h3>Liên hệ</h3><p>Nếu cần làm rõ thông tin hoặc yêu cầu hỗ trợ về tài khoản, liên hệ <a href="mailto:q1@homedorm.vn">q1@homedorm.vn</a>.</p></div></div>}
  </>;
}
