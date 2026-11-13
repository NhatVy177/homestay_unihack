import React, { useEffect, useState } from 'react';
import { Icon } from '../../components/common/Icon.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { dangKyThueApi } from '../dangKyThue/dangKyThue.api.js';
import LapLichChoHoSo from './LapLichChoHoSo.jsx';

const REJECT_REASONS = ['Không còn phòng/giường phù hợp', 'Thông tin không hợp lệ', 'Khách không liên lạc được', 'Khác'];

// Tiện ích khách chọn nằm trong dòng "Tiện ích mong muốn: ..." của ghi chú phiếu (J-C082).
function amenitiesOf(note = '') {
  const line = String(note || '').split(/\r?\n/).find((item) => item.startsWith('Tiện ích mong muốn:'));
  return line ? line.replace('Tiện ích mong muốn:', '').trim().replace(/\.$/, '') : '';
}

// D-044: không còn bước tiếp nhận riêng. Danh sách phiếu đang chờ xếp lịch; chọn phiếu là vào lập lịch.
export default function SaleScheduleCreate({ schedules, onBack, onCreated, onSchedulingChange }) {
  const [profiles, setProfiles] = useState([]), [selected, setSelected] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [rejecting, setRejecting] = useState(null), [rejectReason, setRejectReason] = useState(REJECT_REASONS[0]), [rejectNote, setRejectNote] = useState(''), [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await dangKyThueApi.getAll();
      setProfiles(response.data || []);
      setError('');
    } catch (e) {
      setError(e.response?.data?.message || 'Không tải được phiếu. Vui lòng quay lại và thử lần nữa.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    onSchedulingChange?.(true);
    load();
    return () => { onSchedulingChange?.(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSchedulingChange]);

  async function reject() {
    if (!rejecting) return;
    const note = rejectReason === 'Khác' ? rejectNote.trim() : [rejectReason, rejectNote.trim()].filter(Boolean).join(' - ');
    if (!note) { setError('Vui lòng nhập lý do từ chối.'); return; }
    setBusy(true);
    try {
      await dangKyThueApi.capNhatKetQuaXuLy(rejecting.maDangKy, { trangThai: 'Từ chối', ghiChuXuLy: note });
      setRejecting(null); setRejectNote(''); setRejectReason(REJECT_REASONS[0]); setError('');
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'Không từ chối được phiếu. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  }

  if (selected) return <LapLichChoHoSo profile={selected} onBack={onBack} onCreated={onCreated} />;
  const existing = new Set(schedules.map(s => s.maDangKy));
  const available = profiles.filter(p => ['Chờ tiếp nhận', 'Đã tiếp nhận', 'Chấp nhận'].includes(p.trangThai) && !existing.has(p.maDangKy));
  const keyword = search.toLocaleLowerCase('vi-VN').trim();
  const filtered = available.filter(p => [p.maDangKy, p.hoTenKhach, p.sdtKhach].join(' ').toLocaleLowerCase('vi-VN').includes(keyword));

  return <section className="sale-view">
    <div className="sale-section-heading">
      <div><p className="sale-eyebrow">LỊCH HẸN MỚI</p><h2>Phiếu nhu cầu đang chờ xếp lịch</h2><p>{available.length} phiếu chưa có lịch xem phòng. Chọn phiếu, đối chiếu phòng phù hợp rồi lập lịch cho khách.</p></div>
      <button className="ui-btn ui-btn--secondary" onClick={onBack}><Icon name="arrow_back" /> Quay lại</button>
    </div>
    <label className="sale-search"><Icon name="search" /><span className="sale-sr-only">Tìm phiếu để lập lịch</span><input className="ui-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Mã phiếu, tên hoặc số điện thoại..." /></label>
    {error && <p className="sale-alert sale-alert--danger" role="alert">{error}</p>}
    {loading ? <p role="status">Đang tải phiếu...</p> : !filtered.length
      ? <div className="ui-card sale-panel"><EmptyState message="Chưa có phiếu nào chờ xếp lịch. Phiếu mới sẽ hiện ở đây khi khách gửi nhu cầu thuê." /><button className="ui-btn ui-btn--secondary" onClick={onBack}>Quay lại lịch hẹn</button></div>
      : <div className="sale-pending-list">{filtered.map(p => {
        const rooms = (p.phongQuanTam || []).map(room => room.tenPhong).join(', ');
        const amenities = amenitiesOf(p.ghiChu);
        return <article className="ui-card sale-pending-card" key={p.maDangKy}>
          <button type="button" className="sale-pending-open" onClick={() => setSelected(p)}>
            <span className="sale-pending-tags"><span className="ui-badge ui-badge--neutral">{p.maDangKy}</span><span className="ui-badge ui-badge--success">Chờ xếp lịch</span></span>
            <strong className="sale-pending-name">{p.hoTenKhach}</strong>
            <span className="sale-pending-meta">{[p.sdtKhach, p.emailKhach || p.email].filter(Boolean).join('   ')}</span>
            <span className="sale-pending-meta">{[p.khuVucMongMuon, p.loaiPhongYeuCau].filter(Boolean).join(' · ')}</span>
            <span className="sale-pending-meta">Phòng quan tâm: {rooms || 'Chưa chọn phòng'}{amenities ? ` | ${amenities}` : ''}</span>
          </button>
          <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm sale-pending-reject" onClick={() => setRejecting(p)}>Từ chối</button>
        </article>;
      })}</div>}

    {rejecting && <div className="ktp-modal-overlay sale-modal"><div className="ktp-modal" role="dialog" aria-modal="true" aria-labelledby="sale-reject-title">
      <div className="ktp-modal-body">
        <h3 id="sale-reject-title">Từ chối phiếu {rejecting.maDangKy}</h3>
        <p>Khách {rejecting.hoTenKhach} sẽ thấy phiếu bị từ chối cùng lý do.</p>
        <label className="ui-form-field">Lý do<select className="ui-select" value={rejectReason} onChange={e => setRejectReason(e.target.value)}>{REJECT_REASONS.map(reason => <option key={reason}>{reason}</option>)}</select></label>
        <label className="ui-form-field">Ghi chú thêm<textarea className="ui-textarea" rows="3" value={rejectNote} onChange={e => setRejectNote(e.target.value)} /></label>
        <div className="sale-actions"><button className="ui-btn ui-btn--secondary" disabled={busy} onClick={() => setRejecting(null)}>Hủy</button><button className="ui-btn ui-btn--danger" disabled={busy} onClick={reject}>{busy ? 'Đang gửi...' : 'Từ chối phiếu'}</button></div>
      </div>
    </div></div>}
  </section>;
}
