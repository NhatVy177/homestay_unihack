import React, { useEffect, useMemo, useState } from 'react';
import { dangKyThueApi } from '../dangKyThue/dangKyThue.api.js';
import { Icon } from '../../components/common/Icon.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { customersFromRegistrations } from './salePresentation.js';
import HoSoDangKyTab from './HoSoDangKyTab.jsx';
import DatCocTab from './DatCocTab.jsx';
import NhanPhongTab from './NhanPhongTab.jsx';
import DangKyTraPhongTab from './DangKyTraPhongTab.jsx';

const tabs = [['khach-hang', 'Khách hàng'], ['ho-so', 'Hồ sơ đăng ký'], ['dat-coc', 'Đặt cọc'], ['nhan-phong', 'Nhập hộ cư trú'], ['tra-phong', 'Trả phòng']];
export default function SaleCustomerWorkspace({ initialTab = 'khach-hang', onSchedulingChange, scheduling }) {
  const [tab, setTab] = useState(initialTab), [rows, setRows] = useState([]), [loading, setLoading] = useState(true);
  const [error, setError] = useState(''), [search, setSearch] = useState(''), [selected, setSelected] = useState(null);
  useEffect(() => { setTab(initialTab); }, [initialTab]);
  async function load() {
    setLoading(true); setError('');
    try { const r = await dangKyThueApi.getAll(); setRows(r.data || []); }
    catch (e) { setError(e.response?.data?.message || 'Không tải được danh sách khách. Vui lòng thử lại.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  const customers = useMemo(() => customersFromRegistrations(rows), [rows]);
  const filtered = customers.filter(c => [c.name, c.phone, c.email, c.key].join(' ').toLocaleLowerCase('vi-VN').includes(search.trim().toLocaleLowerCase('vi-VN')));
  return <div className="sale-view">
    <div className="sale-work-tabs" role="group" aria-label="Hồ sơ và giao dịch khách hàng">{tabs.map(([id, label]) => <button className={tab === id ? 'is-active' : ''} type="button" key={id} aria-pressed={tab === id} disabled={scheduling && tab !== id} onClick={() => setTab(id)}>{label}</button>)}</div>
    {tab === 'khach-hang' && <>
      <div className="sale-section-heading"><div><h2>Danh sách khách hàng</h2><p>Khách hàng có hồ sơ trong danh sách Sale được phân công.</p></div><button className="ui-btn ui-btn--secondary" disabled={loading} onClick={load}><Icon name="refresh" /> Làm mới</button></div>
      <label className="sale-search"><Icon name="search" /><span className="sale-sr-only">Tìm khách hàng</span><input className="ui-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm tên, số điện thoại, email hoặc mã khách..." /></label>
      {error && <p role="alert" className="sale-alert sale-alert--danger">{error}</p>}
      {loading ? <p role="status">Đang tải khách hàng...</p> : !filtered.length ? <EmptyState message="Chưa có khách hàng phù hợp. Mở Hồ sơ đăng ký để tiếp nhận hồ sơ mới." /> : <div className="sale-customer-columns">
        <section className="sale-customer-list" aria-label="Danh sách khách">{filtered.map(c => <button type="button" className={`ui-card sale-customer-item ${selected?.key === c.key ? 'is-selected' : ''}`} key={c.key} onClick={() => setSelected(c)}><span className="sale-person-icon"><Icon name="person" /></span><span><strong>{c.name}</strong><small>{c.phone || 'Chưa có số điện thoại'}</small><small>{c.records.length} hồ sơ đăng ký</small></span><Icon name="chevron_right" /></button>)}</section>
        <section className="ui-card sale-panel">{selected ? <><span className="sale-person-icon sale-person-icon--large"><Icon name="person" /></span><h2>{selected.name}</h2><dl className="sale-definition"><div><dt>Mã khách / hồ sơ</dt><dd>{selected.key}</dd></div><div><dt>Điện thoại</dt><dd>{selected.phone || 'Chưa cập nhật'}</dd></div><div><dt>Email</dt><dd>{selected.email || 'Chưa có trong hồ sơ'}</dd></div></dl><h3>Hồ sơ đăng ký</h3>{selected.records.map(r => <div className="sale-record" key={r.maDangKy}><strong>{r.maDangKy}</strong><StatusBadge status={r.trangThaiHienThi || r.trangThai} /></div>)}</> : <EmptyState message="Chọn một khách để xem thông tin và hồ sơ liên quan." />}</section>
      </div>}
    </>}
    {tab === 'ho-so' && <HoSoDangKyTab onSchedulingChange={onSchedulingChange} />}
    {tab === 'dat-coc' && <DatCocTab />}
    {tab === 'nhan-phong' && <><div className="sale-alert"><Icon name="info" /><p><strong>Nhập hộ thông tin người ở</strong><br />Sale hỗ trợ khai thông tin khi cần. Hồ sơ được hệ thống kiểm tra và chuyển quản lý xử lý ngoại lệ theo luồng hiện hành.</p></div><NhanPhongTab /></>}
    {tab === 'tra-phong' && <DangKyTraPhongTab />}
  </div>;
}
