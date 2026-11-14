import React, { useEffect, useState } from 'react';
import { Icon } from '../../components/common/Icon.jsx';
import { dangKyThueApi } from '../dangKyThue/dangKyThue.api.js';
import LapLichChoHoSo from './LapLichChoHoSo.jsx';

// "Lập lịch xem phòng mới": giữ nguyên phiếu yêu cầu của khách, chọn phòng khác và giờ xem mới (dùng lại màn lập lịch D-044).
export default function SaleNewViewingModal({ maDangKy, onClose, onCreated }) {
  const [profile, setProfile] = useState(null), [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    dangKyThueApi.getAll().then((res) => {
      if (!alive) return;
      const found = (res.data || []).find((item) => item.maDangKy === maDangKy);
      if (found) setProfile(found); else setError('Không tìm thấy phiếu yêu cầu của khách.');
    }).catch((e) => alive && setError(e.response?.data?.message || 'Không tải được phiếu yêu cầu. Vui lòng thử lại.'));
    return () => { alive = false; };
  }, [maDangKy]);
  return <div className="ktp-modal-overlay sale-modal sale-new-viewing-overlay" onClick={onClose}>
    <div className="ktp-modal sale-new-viewing" role="dialog" aria-modal="true" aria-labelledby="sale-new-viewing-title" onClick={(e) => e.stopPropagation()}>
      <div className="ktp-modal-header"><div><h3 id="sale-new-viewing-title">Lập lịch xem phòng mới</h3><p>Giữ nguyên phiếu yêu cầu của khách, chọn phòng khác và thời gian xem mới.</p></div>
        <button type="button" className="ktp-modal-close" aria-label="Đóng hộp thoại" onClick={onClose}><Icon name="close" /></button></div>
      <div className="sale-new-viewing-body">
        {error && <p className="sale-alert sale-alert--danger" role="alert">{error}</p>}
        {!error && !profile && <p role="status">Đang tải phiếu yêu cầu...</p>}
        {profile && <LapLichChoHoSo profile={profile} onBack={onClose} onCreated={onCreated} />}
      </div>
    </div>
  </div>;
}
