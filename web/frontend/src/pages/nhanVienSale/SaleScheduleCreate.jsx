import React, { useEffect, useState } from 'react';
import { Icon } from '../../components/common/Icon.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { dangKyThueApi } from '../dangKyThue/dangKyThue.api.js';
import LapLichChoHoSo from './LapLichChoHoSo.jsx';

export default function SaleScheduleCreate({ schedules, onBack, onCreated, onSchedulingChange }) {
  const [profiles, setProfiles] = useState([]), [selected, setSelected] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    onSchedulingChange?.(true);
    let active = true;
    dangKyThueApi.getAll().then(r => { if (active) setProfiles(r.data || []); })
      .catch(e => { if (active) setError(e.response?.data?.message || 'Không tải được hồ sơ. Vui lòng quay lại và thử lần nữa.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; onSchedulingChange?.(false); };
  }, [onSchedulingChange]);
  if (selected) return <LapLichChoHoSo profile={selected} onBack={onBack} onCreated={onCreated} />;
  const existing = new Set(schedules.map(s => s.maDangKy));
  const available = profiles.filter(p => ['Đã tiếp nhận', 'Chấp nhận'].includes(p.trangThai) && !existing.has(p.maDangKy));
  const filtered = available.filter(p => [p.maDangKy, p.hoTenKhach, p.sdtKhach].join(' ').toLocaleLowerCase('vi-VN').includes(search.toLocaleLowerCase('vi-VN').trim()));
  return <section className="sale-view"><div className="sale-section-heading"><div><p className="sale-eyebrow">LỊCH HẸN MỚI</p><h2>Chọn hồ sơ đã tiếp nhận</h2><p>Một buổi xem có thể gồm nhiều phòng phù hợp trong cùng chi nhánh.</p></div><button className="ui-btn ui-btn--secondary" onClick={onBack}><Icon name="arrow_back" /> Quay lại</button></div>
    <label className="sale-search"><Icon name="search" /><span className="sale-sr-only">Tìm hồ sơ để lập lịch</span><input className="ui-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Mã hồ sơ, tên hoặc số điện thoại..." /></label>
    {error && <p className="sale-alert sale-alert--danger" role="alert">{error}</p>}
    {loading ? <p role="status">Đang tải hồ sơ...</p> : !filtered.length ? <div className="ui-card sale-panel"><EmptyState message="Không có hồ sơ phù hợp chưa lập lịch. Bạn có thể tiếp nhận hồ sơ ở Tra cứu khách hàng." /><button className="ui-btn ui-btn--secondary" onClick={onBack}>Quay lại lịch hẹn</button></div>
      : <div className="sale-profile-picker">{filtered.map(p => <button className="ui-card sale-customer-item" key={p.maDangKy} onClick={() => setSelected(p)}><span className="sale-person-icon"><Icon name="person" /></span><span><strong>{p.hoTenKhach}</strong><small>{p.maDangKy} · {p.sdtKhach}</small><small>{p.khuVucMongMuon} · {p.loaiPhongYeuCau}</small></span><Icon name="arrow_forward" /></button>)}</div>}
  </section>;
}
