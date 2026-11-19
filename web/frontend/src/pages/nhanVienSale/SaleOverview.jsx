import React, { useEffect, useState } from 'react';
import { Icon } from '../../components/common/Icon.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import SourceReport from '../../components/nguonKhach/SourceReport.jsx';
import SaleKpiReport from '../../components/kpiSale/SaleKpiReport.jsx';
import { dangKyThueApi } from '../dangKyThue/dangKyThue.api.js';
import { lichXemPhongApi } from '../lichXemPhong/lichXemPhong.api.js';
import { customersFromRegistrations, dateKey, dateLabel, timeLabel } from './salePresentation.js';

export default function SaleOverview({ user, onNavigate }) {
  const [data, setData] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  async function load() {
    setLoading(true); setError('');
    try {
      const [registrations, schedules] = await Promise.all([dangKyThueApi.getAll(), lichXemPhongApi.getAll()]);
      setData({ registrations: registrations.data || [], schedules: schedules.data || [] });
    } catch (e) { setError(e.response?.data?.message || 'Không tải được tổng quan. Vui lòng thử lại.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  const today = dateKey(new Date());
  const daySchedules = (data?.schedules || []).filter(s => dateKey(s.thoiGianHen) === today).sort((a, b) => new Date(a.thoiGianHen) - new Date(b.thoiGianHen));
  const scheduledIds = new Set((data?.schedules || []).map(s => s.maDangKy));
  const pending = (data?.registrations || []).filter(r => ['Chờ tiếp nhận', 'Đã tiếp nhận'].includes(r.trangThai) && !scheduledIds.has(r.maDangKy));
  const upcoming = (data?.schedules || []).filter(s => new Date(s.thoiGianHen) > new Date() && !['Đã hủy', 'Đã xem'].includes(s.trangThai));
  const stats = [
    ['Phiếu chờ xếp lịch', pending.length, 'description', 'warning'],
    ['Lịch hẹn hôm nay', daySchedules.length, 'event_note', 'success'],
    ['Lịch hẹn sắp tới', upcoming.length, 'pending_actions', 'info'],
    ['Khách có hồ sơ', customersFromRegistrations(data?.registrations || []).length, 'group', 'neutral'],
  ];
  return <div className="sale-view">
    <div className="sale-section-heading"><div><p className="sale-eyebrow">MỘT NGÀY LÀM VIỆC MỚI</p><h2>Chào {user?.hoTen || 'bạn'},</h2><p>{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p></div>
      <button className="ui-btn ui-btn--secondary" onClick={load} disabled={loading}><Icon name="refresh" /> Làm mới</button></div>
    {error && <div className="sale-alert sale-alert--danger" role="alert">{error}</div>}
    <section className="sale-stats" aria-label="Tổng quan Sale">
      {stats.map(([label, value, icon, tone]) => <article className={`ui-card sale-stat sale-tone-${tone}`} key={label}><span className="sale-stat-icon"><Icon name={icon} /></span><span>{label}</span><strong>{loading ? '—' : data ? value : '—'}</strong></article>)}
    </section>
    <section className="sale-shortcuts" aria-label="Thao tác nhanh">
      {[
        ['Lập lịch xem phòng', 'event_note', 'lich-xem'],
        ['Lập hợp đồng thuê', 'article', 'hop-dong-thue'], ['Tra cứu khách hàng', 'search', 'khach-hang'],
      ].map(([label, icon, tab]) => <button className="sale-shortcut" key={tab} onClick={() => onNavigate(tab)}><span><Icon name={icon} /></span><strong>{label}</strong><Icon name="arrow_forward" /></button>)}
    </section>
    <button type="button" className="sale-context-link" onClick={() => onNavigate('dat-coc')}><Icon name="account_balance_wallet" /> Xử lý đặt cọc / thu tiền tại quầy <Icon name="chevron_right" /></button>
    <div className="sale-overview-columns">
      <section className="ui-card sale-panel"><div className="sale-section-heading"><div><p className="sale-eyebrow">LỊCH TRÌNH</p><h2>Lịch hẹn hôm nay</h2></div><button className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => onNavigate('lich-xem')}>Xem tất cả <Icon name="arrow_forward" /></button></div>
        {loading ? <p role="status">Đang tải lịch hẹn...</p> : daySchedules.length ? <div className="sale-agenda">{daySchedules.map(s => <button className="sale-agenda-row" key={s.id} onClick={() => onNavigate('lich-xem')}><strong className="sale-agenda-time">{timeLabel(s.thoiGianHen)}</strong><span><strong>{s.hoTenKhach}</strong><small>{s.danhSachPhong || s.maPhong || 'Chưa có phòng'}</small></span><StatusBadge status={s.trangThai} /></button>)}</div> : <EmptyState message="Hôm nay chưa có lịch hẹn xem phòng." />}
      </section>
      <section className="ui-card sale-panel"><div className="sale-section-heading"><div><p className="sale-eyebrow">CHỜ XẾP LỊCH</p><h2>Phiếu nhu cầu mới</h2></div><span className="ui-badge ui-badge--warning">{data ? pending.length : '—'}</span></div>
        {loading ? <p role="status">Đang tải hồ sơ...</p> : pending.length ? <div className="sale-registration-list">{pending.slice(0, 5).map(r => <button key={r.maDangKy} onClick={() => onNavigate('lich-xem')}><span className="sale-person-icon"><Icon name="person" /></span><span><strong>{r.hoTenKhach}</strong><small>{r.maDangKy} · {dateLabel(r.ngayDangKy)}</small></span><Icon name="chevron_right" /></button>)}</div> : <EmptyState message="Không có hồ sơ chờ tiếp nhận." />}
      </section>
    </div>
    <SaleKpiReport />
    <SourceReport />
  </div>;
}
