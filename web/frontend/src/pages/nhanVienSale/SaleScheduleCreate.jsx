import React, { useEffect, useState } from 'react';
import { Icon } from '../../components/common/Icon.jsx';
import { dangKyThueApi } from '../dangKyThue/dangKyThue.api.js';
import LapLichChoHoSo from './LapLichChoHoSo.jsx';

export default function SaleScheduleCreate({ schedules, onBack, onCreated, onReceive }) {
  const [profiles, setProfiles] = useState([]), [selected, setSelected] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    let active = true;
    dangKyThueApi.getAll().then(r => { if (active) setProfiles(r.data || []); })
      .catch(e => { if (active) setError(e.response?.data?.message || 'Không tải được hồ sơ. Vui lòng quay lại và thử lần nữa.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  if (selected) return <LapLichChoHoSo profile={selected} onBack={() => { setSelected(null); onBack(); }} onCreated={onCreated} />;
  const existing = new Set(schedules.map(s => s.maDangKy));
  const available = profiles.filter(p => ['Đã tiếp nhận', 'Chấp nhận'].includes(p.trangThai) && !existing.has(p.maDangKy));
  const filtered = available.filter(p => [p.maDangKy, p.hoTenKhach, p.sdtKhach].join(' ').toLocaleLowerCase('vi-VN').includes(search.toLocaleLowerCase('vi-VN').trim()));
  return <section className="sale-view sale-scheduling-picker" aria-label="Phiếu nhu cầu đang chờ xếp lịch">
    <div className="sale-scheduling-count"><span className="sale-scheduling-icon"><Icon name="assignment_turned_in" /></span><div><strong>Phiếu nhu cầu đang chờ xếp lịch</strong><p>{loading ? 'Đang tải hồ sơ...' : error ? 'Chưa tải được số phiếu' : `${available.length} phiếu chưa có lịch xem phòng`}</p></div></div>
    {available.length > 0 && <label className="sale-search"><Icon name="search" /><span className="sale-sr-only">Tìm hồ sơ để lập lịch</span><input className="ui-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Mã hồ sơ, tên hoặc số điện thoại..." /></label>}
    {error && <p className="sale-alert sale-alert--danger" role="alert">{error}</p>}
    {loading ? <p role="status">Đang tải hồ sơ...</p> : error ? null : !filtered.length ? <div className="sale-scheduling-empty" role="status"><strong>{search ? 'Không có hồ sơ khớp từ khóa.' : 'Không còn phiếu nào cần xếp lịch.'}</strong><p>{search ? 'Thử xóa hoặc đổi từ khóa tìm kiếm.' : 'Các phiếu đã lên lịch sẽ không xuất hiện trong danh sách này.'}</p></div>
      : <div className="sale-profile-picker">{filtered.map(p => <button className="ui-card sale-customer-item" key={p.maDangKy} onClick={() => setSelected(p)}><span className="sale-person-icon"><Icon name="person" /></span><span><strong>{p.hoTenKhach}</strong><small>{p.maDangKy} · {p.sdtKhach}</small><small>{p.khuVucMongMuon} · {p.loaiPhongYeuCau}</small></span><Icon name="arrow_forward" /></button>)}</div>}
    {!loading && !error && !available.length && profiles.some(p => p.trangThai === 'Chờ tiếp nhận') && onReceive && <div className="sale-scheduling-reception"><p>Hồ sơ mới cần được tiếp nhận trước khi lập lịch.</p><button type="button" className="sale-context-link" onClick={onReceive}>Tiếp nhận hồ sơ đăng ký <Icon name="arrow_forward" /></button></div>}
  </section>;
}
