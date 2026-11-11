import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../components/common/Icon.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { lichXemPhongApi } from '../lichXemPhong/lichXemPhong.api.js';
import SaleCalendar from './SaleCalendar.jsx';
import SaleScheduleCreate from './SaleScheduleCreate.jsx';
import { dateKey as toDateInput, dateLabel, timeLabel } from './salePresentation.js';

function toTimeInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export default function LichXemPhongTab({ onNavigate, onSchedulingChange }) {
  const [schedules, setSchedules] = useState([]), [loading, setLoading] = useState(false), [error, setError] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState(null), [modalType, setModalType] = useState(null);
  const [outcomeError, setOutcomeError] = useState(''), [success, setSuccess] = useState('');
  const [newDate, setNewDate] = useState(''), [newTime, setNewTime] = useState(''), [note, setNote] = useState(''), [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ keyword: '', status: '', fromDate: '', toDate: '' });
  const [month, setMonth] = useState(new Date()), [selectedDay, setSelectedDay] = useState(''), [detailId, setDetailId] = useState(null), [creating, setCreating] = useState(false);

  const filteredSchedules = useMemo(() => {
    const keyword = filters.keyword.trim().toLocaleLowerCase('vi-VN');
    return schedules.filter(schedule => {
      const searchableText = [schedule.id, schedule.maDangKy, schedule.hoTenKhach, schedule.sdtKhach, schedule.danhSachPhong, schedule.maPhong].filter(Boolean).join(' ').toLocaleLowerCase('vi-VN');
      const scheduleDate = toDateInput(schedule.thoiGianHen);
      if (keyword && !searchableText.includes(keyword)) return false;
      if (filters.status && schedule.trangThai !== filters.status) return false;
      if (filters.fromDate && (!scheduleDate || scheduleDate < filters.fromDate)) return false;
      if (filters.toDate && (!scheduleDate || scheduleDate > filters.toDate)) return false;
      return true;
    });
  }, [filters, schedules]);
  const hasActiveFilters = Object.values(filters).some(Boolean);
  const clearFilters = () => { setFilters({ keyword: '', status: '', fromDate: '', toDate: '' }); setSelectedDay(''); };
  const fetchSchedules = async () => {
    setLoading(true); setError('');
    try { const res = await lichXemPhongApi.getAll(); setSchedules(res.data || []); }
    catch (err) { setError(err.response?.data?.message || err.message || 'Không thể tải danh sách lịch hẹn.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchSchedules(); }, []);
  const openReschedule = schedule => { setSelectedSchedule(schedule); setNewDate(toDateInput(schedule.thoiGianHen)); setNewTime(toTimeInput(schedule.thoiGianHen)); setNote(''); setModalType('reschedule'); };
  const openCancel = schedule => { setSelectedSchedule(schedule); setNote(''); setModalType('cancel'); };
  const openOutcome = (schedule, outcome) => { setSelectedSchedule(schedule); setNote(''); setOutcomeError(''); setSuccess(''); setModalType(outcome); };
  const handleOutcome = async () => {
    if (!selectedSchedule || !['da-xem', 'khach-khong-den'].includes(modalType)) return;
    setSaving(true); setOutcomeError('');
    try {
      const label = modalType === 'da-xem' ? 'Đã xem' : 'Khách không đến';
      await lichXemPhongApi.capNhat(selectedSchedule.id, { thaoTac: modalType, ghiChuXuLy: note || null });
      setModalType(null); setSuccess(`Đã ghi nhận ${selectedSchedule.id}: ${label}.`); await fetchSchedules();
    } catch (err) { setOutcomeError(err.response?.data?.message || 'Chưa ghi nhận được kết quả. Vui lòng tải lại lịch và thử lại.'); }
    finally { setSaving(false); }
  };
  const handleReschedule = async () => {
    if (!selectedSchedule || !newDate || !newTime) return;
    setSaving(true);
    try {
      await lichXemPhongApi.capNhat(selectedSchedule.id, { thaoTac: 'doi-lich', thoiGianXem: `${newDate}T${newTime}:00`, ghiChuXuLy: note || null });
      setModalType(null); await fetchSchedules();
    } catch (err) { alert('Lỗi khi đổi lịch: ' + (err.response?.data?.message || err.message)); }
    finally { setSaving(false); }
  };
  const handleCancel = async () => {
    if (!selectedSchedule) return;
    setSaving(true);
    try {
      await lichXemPhongApi.capNhat(selectedSchedule.id, { thaoTac: 'huy', ghiChuXuLy: note || null });
      setModalType(null); await fetchSchedules();
    } catch (err) { alert('Lỗi khi hủy lịch: ' + (err.response?.data?.message || err.message)); }
    finally { setSaving(false); }
  };
  const visible = filteredSchedules.filter(s => !selectedDay || toDateInput(s.thoiGianHen) === selectedDay).sort((a, b) => new Date(a.thoiGianHen) - new Date(b.thoiGianHen));
  const detail = visible.find(s => s.id === detailId) || visible[0];
  const recordingOutcome = ['da-xem', 'khach-khong-den'].includes(modalType);
  const outcomeLabel = modalType === 'da-xem' ? 'Đã xem' : 'Khách không đến';
  if (creating) return <SaleScheduleCreate schedules={schedules} onBack={() => setCreating(false)} onCreated={fetchSchedules} onSchedulingChange={onSchedulingChange} />;

  return <div className="sale-view">
    <button className="sale-context-link" onClick={() => onNavigate?.('ho-so')}><Icon name="description" /> Tiếp nhận hồ sơ đăng ký <Icon name="chevron_right" /></button>
    <div className="sale-section-heading"><div><p className="sale-eyebrow">LỊCH TRÌNH CỦA BẠN</p><h2>Lịch hẹn xem phòng</h2><p>Theo dõi buổi xem, thông tin khách và các phòng trong lịch hẹn.</p></div><div className="sale-actions"><button className="ui-btn ui-btn--secondary" onClick={fetchSchedules} disabled={loading}><Icon name="refresh" /> Làm mới</button><button className="ui-btn ui-btn--primary" onClick={() => setCreating(true)}><Icon name="add_circle" /> Lập lịch hẹn</button></div></div>
    <section className="ui-card sale-schedule-toolbar" aria-label="Bộ lọc lịch xem phòng">
      <label className="sale-search" htmlFor="schedule-search"><Icon name="search" /><span className="sale-sr-only">Tìm kiếm lịch</span><input id="schedule-search" className="ui-input" value={filters.keyword} onChange={e => setFilters(current => ({ ...current, keyword: e.target.value }))} placeholder="Tên khách, số điện thoại, mã lịch..." /></label>
      <label className="ui-form-field" htmlFor="schedule-status">Trạng thái<select id="schedule-status" className="ui-select" value={filters.status} onChange={e => setFilters(current => ({ ...current, status: e.target.value }))}><option value="">Tất cả trạng thái</option>{['Chờ xem', 'Yêu cầu đổi lịch', 'Yêu cầu hủy', 'Đã xem', 'Khách không đến', 'Đã hủy'].map(s => <option key={s}>{s}</option>)}</select></label>
      <label className="ui-form-field" htmlFor="schedule-from-date">Từ ngày<input id="schedule-from-date" type="date" className="ui-input" value={filters.fromDate} onChange={e => setFilters(current => ({ ...current, fromDate: e.target.value }))} /></label>
      <label className="ui-form-field" htmlFor="schedule-to-date">Đến ngày<input id="schedule-to-date" type="date" className="ui-input" value={filters.toDate} onChange={e => setFilters(current => ({ ...current, toDate: e.target.value }))} /></label>
      <button className="ui-btn ui-btn--ghost" disabled={!hasActiveFilters && !selectedDay} onClick={clearFilters}>Xóa lọc</button>
    </section>
    {error && <p className="sale-alert sale-alert--danger" role="alert">{error}</p>}
    {success && <p className="sale-alert" role="status">{success}</p>}
    {loading && <p role="status">Đang tải danh sách lịch hẹn...</p>}
    <div className="sale-calendar-layout">
      <SaleCalendar month={month} onMonth={setMonth} schedules={filteredSchedules} selectedDay={selectedDay} onDay={setSelectedDay} />
      <section className="ui-card sale-panel" aria-label="Danh sách và chi tiết lịch hẹn"><div className="sale-section-heading"><div><p className="sale-eyebrow">{selectedDay ? dateLabel(selectedDay) : 'DANH SÁCH LỊCH HẸN'}</p><h2>{selectedDay ? 'Lịch trong ngày' : 'Lịch hẹn của bạn'}</h2></div><span className="ui-badge ui-badge--neutral">{visible.length} lịch</span></div>
        {selectedDay && <button className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => setSelectedDay('')}>Tất cả ngày</button>}
        {!loading && !visible.length && <><EmptyState message="Không có lịch hẹn phù hợp. Chọn ngày khác hoặc xóa bộ lọc." /><button className="ui-btn ui-btn--secondary" onClick={() => onNavigate?.('ho-so')}>Mở hồ sơ đăng ký</button></>}
        <div className="sale-schedule-list">{visible.map(s => <button type="button" className={`sale-schedule-item ${detail?.id === s.id ? 'is-selected' : ''}`} key={s.id} aria-label={`${s.id} · ${s.hoTenKhach}`} onClick={() => setDetailId(s.id)}><span className="sale-agenda-time">{timeLabel(s.thoiGianHen)}</span><span><strong>{s.hoTenKhach}</strong><small>{s.id} · {dateLabel(s.thoiGianHen)}</small><small>{s.danhSachPhong || s.maPhong || 'Chưa có phòng'}</small></span></button>)}</div>
        {detail && <div className="sale-schedule-detail"><div className="sale-section-heading"><h3>{detail.id}</h3><StatusBadge status={detail.trangThai} /></div><dl className="sale-definition"><div><dt>Khách hàng</dt><dd>{detail.hoTenKhach}</dd></div><div><dt>Điện thoại</dt><dd>{detail.sdtKhach || 'Chưa cập nhật'}</dd></div><div><dt>Hồ sơ đăng ký</dt><dd>{detail.maDangKy}</dd></div><div><dt>Thời gian hẹn</dt><dd>{timeLabel(detail.thoiGianHen)} · {dateLabel(detail.thoiGianHen)}</dd></div><div><dt>Phòng xem</dt><dd>{detail.danhSachPhong || detail.maPhong || 'Chưa có phòng'}</dd></div></dl>{detail.ghiChu && <p>{detail.ghiChu}</p>}<div className="sale-actions"><button className="ui-btn ui-btn--secondary" disabled={!detail.coTheGhiNhanKetQua || saving} onClick={() => openOutcome(detail, 'da-xem')}><Icon name="check_circle" /> Đã xem</button><button className="ui-btn ui-btn--secondary" disabled={!detail.coTheGhiNhanKetQua || saving} onClick={() => openOutcome(detail, 'khach-khong-den')}><Icon name="cancel" /> Khách không đến</button><button className="ui-btn ui-btn--secondary" disabled={['Đã hủy', 'Đã xem', 'Khách không đến'].includes(detail.trangThai)} onClick={() => openReschedule(detail)}><Icon name="event_repeat" /> Đổi lịch</button><button className="ui-btn ui-btn--ghost" disabled={!detail.coTheHuy || ['Đã xem', 'Khách không đến'].includes(detail.trangThai)} onClick={() => openCancel(detail)}><Icon name="cancel" /> Hủy lịch</button></div><p className="ui-cell-sub">Sale phụ trách ghi kết quả sau buổi xem. Hai nút ghi kết quả chỉ mở khi lịch đã đến giờ và hồ sơ chưa chuyển sang bước cọc.</p></div>}
      </section>
    </div>
    {modalType && selectedSchedule && <div className="ktp-modal-overlay sale-modal" onClick={() => { if (!saving) setModalType(null); }}><div className="ktp-modal" role="dialog" aria-modal="true" aria-labelledby="sale-edit-schedule-title" onClick={e => e.stopPropagation()}><div className="ktp-modal-header"><h3 id="sale-edit-schedule-title">{recordingOutcome ? `Ghi nhận ${outcomeLabel}?` : modalType === 'reschedule' ? 'Đổi lịch xem phòng' : 'Hủy lịch xem phòng?'}</h3><button className="ktp-modal-close" aria-label="Đóng hộp thoại" disabled={saving} onClick={() => setModalType(null)}><Icon name="close" /></button></div>
      <div className="ktp-modal-body"><p><strong>{selectedSchedule.hoTenKhach}</strong><br />{selectedSchedule.id} · {selectedSchedule.danhSachPhong}</p>{modalType === 'reschedule' && <div className="sale-form-grid"><label className="ui-form-field">Ngày xem mới<input className="ui-input" type="date" value={newDate} onChange={e => setNewDate(e.target.value)} /></label><label className="ui-form-field">Giờ xem mới<input className="ui-input" type="time" value={newTime} onChange={e => setNewTime(e.target.value)} /></label></div>}
      <label className="ui-form-field">{recordingOutcome ? 'Ghi chú buổi xem' : modalType === 'reschedule' ? 'Ghi chú xử lý' : 'Ghi chú lý do hủy'}<textarea className="ui-textarea" rows="3" maxLength={recordingOutcome ? 500 : undefined} value={note} onChange={e => setNote(e.target.value)} disabled={saving} /></label>{recordingOutcome && outcomeError && <p className="sale-alert sale-alert--danger" role="alert">{outcomeError}</p>}</div>
      <div className="ktp-modal-footer"><button className="ui-btn ui-btn--secondary" disabled={saving} onClick={() => setModalType(null)}>Quay lại</button>{recordingOutcome ? <button className="ui-btn ui-btn--primary" disabled={saving} onClick={handleOutcome}>{saving ? 'Đang lưu...' : `Xác nhận ${outcomeLabel}`}</button> : modalType === 'reschedule' ? <button className="ui-btn ui-btn--primary" disabled={!newDate || !newTime || saving} onClick={handleReschedule}>{saving ? 'Đang lưu...' : 'Xác nhận đổi lịch'}</button> : <button className="ui-btn ui-btn--danger" disabled={saving || !selectedSchedule.coTheHuy} onClick={handleCancel}>{saving ? 'Đang hủy...' : 'Xác nhận hủy'}</button>}</div>
    </div></div>}
  </div>;
}
