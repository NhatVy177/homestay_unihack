import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { httpClient } from '../../api/httpClient.js';
import { Icon } from '../../components/common/Icon.jsx';
import PublicLayout from '../../components/publicSite/PublicLayout.jsx';
import { RoomCard } from '../homeExperience/HomeExperience.jsx';
import { normalizeRoom } from '../homeExperience/homeData.js';
import './danhSachPhong.css';

// Trang "Danh sách phòng": toàn bộ phòng, lọc nhanh theo chi nhánh. Bấm một phòng để xem chi tiết (trang khám phá phòng).
export default function DanhSachPhongPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState(null), [error, setError] = useState(false), [branch, setBranch] = useState('');
  useEffect(() => {
    let alive = true;
    httpClient.get('/trang-chu/kham-pha-phong').then(({ data }) => {
      if (!alive) return;
      const list = (Array.isArray(data.data) ? data.data : []).map(normalizeRoom).filter((room) => room.MaPhong);
      setRooms([...new Map(list.map((room) => [room.MaPhong, room])).values()]);
    }).catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, []);
  const branches = useMemo(() => [...new Set((rooms || []).map((room) => room.TenChiNhanh).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi')), [rooms]);
  const visible = useMemo(() => (rooms || []).filter((room) => !branch || room.TenChiNhanh === branch), [rooms, branch]);
  const view = (room) => navigate(`/kham-pha-phong?phong=${encodeURIComponent(room.MaPhong)}`);

  return <PublicLayout>
    <div className="pl-wrap dsp">
      <div className="dsp-head">
        <h1><Icon name="bed" />Danh sách phòng</h1>
        {rooms && <p>{visible.length} phòng</p>}
      </div>
      {branches.length > 1 && <div className="dsp-chips" role="group" aria-label="Lọc theo chi nhánh">
        {['', ...branches].map((name) => <button key={name || 'all'} type="button" className={`dsp-chip${branch === name ? ' is-active' : ''}`} aria-pressed={branch === name} onClick={() => setBranch(name)}>{name || 'Tất cả chi nhánh'}</button>)}
      </div>}
      {error && <p className="dsp-empty" role="alert">Chưa tải được danh sách phòng. Vui lòng thử lại sau.</p>}
      {!error && rooms === null && <p className="dsp-empty">Đang tải danh sách phòng...</p>}
      {rooms && !visible.length && <p className="dsp-empty">Chưa có phòng nào để hiển thị.</p>}
      <div className="tc-rooms-grid">
        {visible.map((room, index) => <RoomCard key={room.MaPhong} room={room} index={index} onViewDetail={view} />)}
      </div>
    </div>
  </PublicLayout>;
}
