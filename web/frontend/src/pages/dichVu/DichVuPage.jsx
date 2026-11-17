import React, { useEffect, useMemo, useState } from 'react';
import { httpClient } from '../../api/httpClient.js';
import { Icon } from '../../components/common/Icon.jsx';
import PublicLayout from '../../components/publicSite/PublicLayout.jsx';
import './dichVu.css';

// Trang "Dịch vụ & tiện ích": bảng giá dịch vụ công khai, có tìm kiếm và bộ lọc. Dữ liệu lấy từ bảng DichVu;
// nhóm và mô tả là lời giải thích cho khách nên suy ra từ tên dịch vụ (dịch vụ lạ thì vào nhóm "Khác").
const META = [
  { match: /điện/i, group: 'Thiết yếu', icon: 'bolt', text: 'Tính theo chỉ số công tơ của phòng, thanh toán theo mức dùng thực tế.' },
  { match: /nước/i, group: 'Thiết yếu', icon: 'water_drop', text: 'Tính theo chỉ số đồng hồ nước của phòng, thanh toán theo mức dùng thực tế.' },
  { match: /wifi|internet|mạng/i, group: 'Kết nối', icon: 'wifi', text: 'Internet tốc độ cao phủ sóng toàn khu, dùng chung cho cả phòng.' },
  { match: /xe/i, group: 'Xe cộ', icon: 'two_wheeler', text: 'Phí giữ xe hằng tháng tại bãi xe của tòa nhà.' },
  { match: /vệ sinh|dọn/i, group: 'Vệ sinh', icon: 'cleaning_services', text: 'Dọn dẹp, giữ vệ sinh khu vực chung định kỳ.' },
];
const money = (value) => `${Number(value).toLocaleString('vi-VN')} VNĐ`;
const enrich = (item) => {
  const meta = META.find((entry) => entry.match.test(item.tenDichVu)) || { group: 'Khác', icon: 'room_service', text: 'Dịch vụ đi kèm khi thuê phòng.' };
  const monthly = /tháng/i.test(item.donViTinh);
  return { ...item, ...meta, fee: monthly ? 'Theo tháng' : 'Theo mức dùng', unitLabel: monthly ? 'Tháng' : item.donViTinh };
};
const PRICE_BANDS = [
  { value: '', label: 'Tất cả', test: () => true },
  { value: 'low', label: 'Dưới 100.000đ', test: (price) => price < 100000 },
  { value: 'mid', label: '100.000đ - 200.000đ', test: (price) => price >= 100000 && price <= 200000 },
  { value: 'high', label: 'Trên 200.000đ', test: (price) => price > 200000 },
];

export default function DichVuPage() {
  const [items, setItems] = useState(null), [error, setError] = useState(false);
  const [query, setQuery] = useState(''), [group, setGroup] = useState(''), [band, setBand] = useState(''), [fee, setFee] = useState('');
  useEffect(() => {
    let alive = true;
    httpClient.get('/trang-chu/dich-vu').then(({ data }) => { if (alive) setItems((data.data || []).map(enrich)); }).catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, []);
  const groups = useMemo(() => [...new Set((items || []).map((item) => item.group))], [items]);
  const fees = useMemo(() => [...new Set((items || []).map((item) => item.fee))], [items]);
  const visible = useMemo(() => {
    const test = PRICE_BANDS.find((entry) => entry.value === band).test, needle = query.trim().toLowerCase();
    return (items || []).filter((item) => (!needle || item.tenDichVu.toLowerCase().includes(needle)) && (!group || item.group === group) && (!fee || item.fee === fee) && test(item.donGia));
  }, [items, query, group, band, fee]);
  const monthly = (items || []).filter((item) => item.fee === 'Theo tháng');
  const cheapest = monthly.length ? Math.min(...monthly.map((item) => item.donGia)) : null;
  const clear = () => { setQuery(''); setGroup(''); setBand(''); setFee(''); };
  const filtered = Boolean(query || group || band || fee);

  return <PublicLayout>
    <div className="pl-wrap dv">
      <div className="dv-head">
        <div>
          <h1>Dịch vụ &amp; tiện ích</h1>
          <p>Tra cứu danh mục dịch vụ, bảng giá và các tiện ích đi kèm trước khi đăng ký thuê phòng.</p>
        </div>
        {items?.length > 0 && <div className="dv-stats">
          <div><span className="dv-stat-icon"><Icon name="apartment" /></span><div><small>Hiện có</small><strong>{items.length} dịch vụ</strong></div></div>
          {cheapest !== null && <div><span className="dv-stat-icon"><Icon name="payments" /></span><div><small>Phí tháng từ</small><strong>{money(cheapest)}</strong></div></div>}
        </div>}
      </div>

      <form className="dv-filters" onSubmit={(event) => event.preventDefault()} aria-label="Bộ lọc dịch vụ">
        <label className="dv-search"><span>Tìm kiếm dịch vụ</span>
          <span className="dv-input"><Icon name="search" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tên dịch vụ..." /></span>
        </label>
        <label><span>Loại dịch vụ</span>
          <select value={group} onChange={(e) => setGroup(e.target.value)}><option value="">Tất cả</option>{groups.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label><span>Khoảng giá</span>
          <select value={band} onChange={(e) => setBand(e.target.value)}>{PRICE_BANDS.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select></label>
        <label><span>Hình thức phí</span>
          <select value={fee} onChange={(e) => setFee(e.target.value)}><option value="">Tất cả</option>{fees.map((name) => <option key={name}>{name}</option>)}</select></label>
        <button type="button" className="dv-clear" onClick={clear} disabled={!filtered}>Xoá bộ lọc</button>
      </form>

      {error && <p className="dv-empty" role="alert">Chưa tải được danh sách dịch vụ. Vui lòng thử lại sau.</p>}
      {!error && items === null && <p className="dv-empty">Đang tải dịch vụ...</p>}
      {items && !visible.length && <p className="dv-empty">Không có dịch vụ nào phù hợp với bộ lọc.</p>}
      <div className="dv-grid">
        {visible.map((item) => <article className="dv-card" key={item.maDichVu}>
          <div className="dv-card-top"><span className="dv-icon"><Icon name={item.icon} /></span><span className="dv-tag">{item.fee}</span></div>
          <small className="dv-group">{item.group}</small>
          <h2>{item.tenDichVu}</h2>
          <p>{item.text}</p>
          <div className="dv-price"><small>Đơn giá</small><strong>{money(item.donGia)} <span>/{item.unitLabel}</span></strong></div>
        </article>)}
      </div>
    </div>
  </PublicLayout>;
}
