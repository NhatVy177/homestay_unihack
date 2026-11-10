import React, { useEffect, useMemo, useState } from 'react';
import { dangKyThueApi } from '../dangKyThue/dangKyThue.api.js';
import { Icon } from '../../components/common/Icon.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { customersFromRegistrations } from './salePresentation.js';

export default function SaleCustomerWorkspace() {
  const [rows, setRows] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [filters, setFilters] = useState({ name: '', code: '', phone: '', email: '' }), [selectedKey, setSelectedKey] = useState(null);
  async function load() {
    setLoading(true); setError('');
    try { const r = await dangKyThueApi.getAll(); setRows(r.data || []); }
    catch (e) { setError(e.response?.data?.message || 'Không tải được danh sách khách. Vui lòng thử lại.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  const customers = useMemo(() => customersFromRegistrations(rows), [rows]);
  const contains = (value, search) => String(value || '').toLocaleLowerCase('vi-VN').includes(search.trim().toLocaleLowerCase('vi-VN'));
  const filtered = customers.filter(c => contains(c.name, filters.name) && contains([c.key, ...c.records.map(r => r.maDangKy)].join(' '), filters.code)
    && contains(c.phone.replace(/\s/g, ''), filters.phone.replace(/\s/g, '')) && contains(c.email, filters.email));
  const selected = filtered.find(c => c.key === selectedKey);
  return <div className="sale-view sale-lookup">
    <div className="sale-section-heading"><p>Tra cứu thông tin khách hàng và hồ sơ liên quan tại chi nhánh.</p><button className="ui-btn ui-btn--secondary" disabled={loading} onClick={load}><Icon name="refresh" /> Làm mới</button></div>
    <section className="ui-card sale-lookup-filters" aria-label="Tìm kiếm khách hàng">{[['name', 'Họ và tên', 'Nhập tên khách...'], ['code', 'Mã khách / hồ sơ', 'Nhập mã khách hoặc hồ sơ...'], ['phone', 'Số điện thoại', 'Nhập số điện thoại...'], ['email', 'Email', 'Nhập email...']].map(([key, label, placeholder]) => <label className="ui-form-field" key={key}>{label}<input className="ui-input" value={filters[key]} onChange={e => setFilters(current => ({ ...current, [key]: e.target.value }))} placeholder={placeholder} /></label>)}<button className="ui-btn ui-btn--ghost" disabled={!Object.values(filters).some(Boolean)} onClick={() => setFilters({ name: '', code: '', phone: '', email: '' })}>Xóa lọc</button></section>
    {error && <p role="alert" className="sale-alert sale-alert--danger">{error}</p>}
    {loading ? <p role="status">Đang tải khách hàng...</p> : !filtered.length ? <section className="ui-card sale-panel"><EmptyState message="Không tìm thấy khách hàng phù hợp. Thử thay đổi thông tin tìm kiếm." /></section> : <div className="sale-customer-columns">
      <section className="sale-customer-list" aria-label="Danh sách khách"><p className="sale-eyebrow">{filtered.length} KHÁCH HÀNG</p>{filtered.map(c => <button type="button" className={`ui-card sale-customer-item ${selected?.key === c.key ? 'is-selected' : ''}`} key={c.key} onClick={() => setSelectedKey(c.key)}><span className="sale-person-icon"><Icon name="person" /></span><span><strong>{c.name}</strong><small>{c.phone || 'Chưa có số điện thoại'}</small><small>{c.records.length} hồ sơ đăng ký</small></span><Icon name="chevron_right" /></button>)}</section>
      <section className="ui-card sale-panel">{selected ? <><span className="sale-person-icon sale-person-icon--large"><Icon name="person" /></span><h2>{selected.name}</h2><dl className="sale-definition"><div><dt>Mã khách / hồ sơ</dt><dd>{selected.key}</dd></div><div><dt>Điện thoại</dt><dd>{selected.phone || 'Chưa cập nhật'}</dd></div><div><dt>Email</dt><dd>{selected.email || 'Chưa có trong hồ sơ'}</dd></div></dl><h3>Hồ sơ liên quan</h3>{selected.records.map(r => <div className="sale-record" key={r.maDangKy}><strong>{r.maDangKy}</strong><StatusBadge status={r.trangThaiHienThi || r.trangThai} /></div>)}</> : <EmptyState message="Chọn một khách hàng để xem thông tin chi tiết." />}</section>
    </div>}
  </div>;
}
