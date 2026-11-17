import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/common/Icon.jsx';
import { Reveal } from './HomeExperience.jsx';
import './servicesShowcase.css';

// Mục "Dịch vụ" ở trang chủ: ảnh bên trái, bốn nhóm tiện ích bên phải.
const SERVICES = [
  { icon: 'bolt', title: 'Dịch vụ thiết yếu', text: 'Điện nước sinh hoạt ổn định, thanh toán minh bạch theo chỉ số tiêu dùng thực tế.' },
  { icon: 'wifi', title: 'Kết nối và xe cộ', text: 'Wifi tốc độ cao phủ sóng toàn khu, bãi gửi xe có người trông coi.' },
  { icon: 'cleaning_services', title: 'Giặt là và vệ sinh', text: 'Khu giặt sấy tiện lợi, dọn dẹp khu vực chung định kỳ.' },
  { icon: 'bed', title: 'Tiện nghi trong phòng', text: 'Điều hòa, giường tủ, bàn học và khóa cửa an toàn, tùy loại phòng.' },
];

export default function ServicesShowcase() {
  return <section className="hx-section sv" id="dich-vu" aria-labelledby="sv-title">
    <div className="sv-inner">
      <Reveal className="sv-photo"><img src="/images/home/living.jpg" alt="Không gian sinh hoạt chung" loading="lazy" /></Reveal>
      <div className="sv-content">
        <Reveal><span className="sv-eyebrow">Dịch vụ</span></Reveal>
        <Reveal delay={80}><h2 id="sv-title">Dịch vụ đa dạng,<br />cuộc sống tiện nghi</h2></Reveal>
        <Reveal delay={140}><p>HomestayDorm không chỉ là chỗ ở: mỗi phòng đi kèm các tiện ích cần thiết để bạn dọn vào là sống được ngay, và mọi khoản phí đều được ghi rõ.</p></Reveal>
        <div className="sv-grid">
          {SERVICES.map((item, index) => <Reveal key={item.title} delay={200 + index * 60} className="sv-item">
            <span className="sv-icon"><Icon name={item.icon} /></span>
            <div><h3>{item.title}</h3><p>{item.text}</p></div>
          </Reveal>)}
        </div>
        <Reveal delay={460}><Link to="/dich-vu" className="sv-link">Xem bảng giá dịch vụ <Icon name="arrow_forward" /></Link></Reveal>
      </div>
    </div>
  </section>;
}
