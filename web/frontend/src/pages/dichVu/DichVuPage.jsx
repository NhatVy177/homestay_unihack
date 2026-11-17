import React, { useEffect, useMemo, useState } from 'react';
import { httpClient } from '../../api/httpClient.js';
import { Icon } from '../../components/common/Icon.jsx';
import PublicLayout from '../../components/publicSite/PublicLayout.jsx';
import './dichVu.css';

// Trang "Dịch vụ & tiện ích": bảng giá dịch vụ công khai, có tìm kiếm, bộ lọc và cửa sổ chi tiết. Dữ liệu lấy từ bảng DichVu.
const ICONS = [
  [/điện/i, 'bolt'], [/nước tinh khiết|bơi/i, 'water_drop'], [/nước/i, 'water_drop'], [/wifi|internet/i, 'wifi'], [/xe/i, 'two_wheeler'],
  [/rác/i, 'delete'], [/giặt|vệ sinh|dọn/i, 'cleaning_services'], [/máy lạnh/i, 'build'], [/nệm/i, 'bed'], [/gym|fitness/i, 'group'], [/tủ lạnh/i, 'room_service'],
];
const money = (value) => `${Number(value).toLocaleString('vi-VN')} VNĐ`;
const feeOf = (unit) => (/kwh|m3|m³/i.test(unit) ? 'Theo chỉ số' : /tháng/i.test(unit) ? 'Theo tháng' : 'Theo lần');
const unitLabel = (unit) => (/tháng/i.test(unit) ? 'Tháng' : unit.replace(/^m3$/i, 'm³').replace(/^lần$/i, 'Lần').replace(/^bình$/i, 'Bình'));
const enrich = (item) => ({
  ...item, icon: (ICONS.find(([test]) => test.test(item.tenDichVu)) || [null, 'room_service'])[1],
  group: item.nhom || 'Khác', text: item.moTa || 'Dịch vụ đi kèm khi thuê phòng.', fee: feeOf(item.donViTinh), unit: unitLabel(item.donViTinh),
  active: (item.trangThai || 'Đang cung cấp') === 'Đang cung cấp', status: item.trangThai || 'Đang cung cấp',
});
const FEE_NOTE = {
  'Theo tháng': 'Tính phí định kỳ hằng tháng vào hóa đơn tổng.',
  'Theo chỉ số': 'Tính theo chỉ số ghi trên đồng hồ riêng của phòng mỗi kỳ.',
  'Theo lần': 'Tính theo số lần sử dụng thực tế; liên hệ nhân viên để hẹn lịch.',
};
const PRICE_BANDS = [
  { value: '', label: 'Tất cả', test: () => true },
  { value: 'low', label: 'Dưới 100.000đ', test: (price) => price < 100000 },
  { value: 'mid', label: '100.000đ - 500.000đ', test: (price) => price >= 100000 && price <= 500000 },
  { value: 'high', label: 'Trên 500.000đ', test: (price) => price > 500000 },
];

function DetailDialog({ item, onClose }) {
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', onKey); };
  }, [onClose]);
  return <div className="dv-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="dv-dialog" role="dialog" aria-modal="true" aria-labelledby="dv-dialog-title">
      <header><span className="dv-dialog-eyebrow">Chi tiết dịch vụ</span>
        <button type="button" className="dv-close" aria-label="Đóng" onClick={onClose}><Icon name="close" /></button></header>
      <div className="dv-dialog-body">
        <div className="dv-dialog-title"><span className="dv-icon"><Icon name={item.icon} /></span>
          <div><h2 id="dv-dialog-title">{item.tenDichVu}</h2><span className="dv-group-badge">{item.group}</span>{!item.active && <span className="dv-status-badge">{item.status}</span>}</div></div>
        <section><h3>Mô tả dịch vụ</h3><p>{item.text}</p></section>
        <section className="dv-dialog-price"><h3>Đơn giá áp dụng</h3><strong>{money(item.donGia)} <span>/{item.unit}</span></strong><small>* {FEE_NOTE[item.fee]}</small></section>
        <section className="dv-policy"><h3>Chính sách sử dụng</h3><ul>
          <li>Dịch vụ tính theo tháng và theo chỉ số được cộng vào hóa đơn kỳ hằng tháng của hợp đồng.</li>
          <li>Dịch vụ được chọn cùng nhân viên khi lập hợp đồng thuê; thay đổi dịch vụ giữa kỳ vui lòng liên hệ nhân viên.</li>
          <li>Dịch vụ theo lần (vệ sinh, giặt sấy, giao nước…): vui lòng hẹn trước nhân viên ít nhất 24 giờ.</li>
          {!item.active && <li>Dịch vụ này hiện {item.status.toLowerCase()}, chưa nhận đăng ký.</li>}
        </ul></section>
      </div>
    </div>
  </div>;
}

export default function DichVuPage() {
  const [items, setItems] = useState(null), [error, setError] = useState(false), [detail, setDetail] = useState(null);
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
  const popular = useMemo(() => (items || []).filter((item) => item.active && item.soHopDong > 0).sort((a, b) => b.soHopDong - a.soHopDong).slice(0, 2).map((item) => item.tenDichVu), [items]);
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
          {popular.length > 0 && <div><span className="dv-stat-icon dv-stat-icon--warm"><Icon name="wifi" /></span><div><small>Phổ biến nhất</small><strong>{popular.join(' / ')}</strong></div></div>}
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
        {visible.map((item) => <button type="button" className={`dv-card${item.active ? '' : ' is-inactive'}`} key={item.maDichVu} onClick={() => setDetail(item)} aria-label={`Xem chi tiết ${item.tenDichVu}`}>
          <span className="dv-card-top"><span className="dv-icon"><Icon name={item.icon} /></span><span className="dv-tag">{item.active ? item.fee : item.status}</span></span>
          <small className="dv-group">{item.group}</small>
          <h2>{item.tenDichVu}</h2>
          <p>{item.text}</p>
          <span className="dv-price"><span><small>Đơn giá</small><strong>{money(item.donGia)} <span>/{item.unit}</span></strong></span><Icon name="arrow_forward" /></span>
        </button>)}
      </div>
    </div>
    {detail && <DetailDialog item={detail} onClose={() => setDetail(null)} />}
  </PublicLayout>;
}
