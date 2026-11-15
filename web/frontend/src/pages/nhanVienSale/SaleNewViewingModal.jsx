import React, { useEffect, useState } from 'react';
import { dangKyThueApi } from '../dangKyThue/dangKyThue.api.js';
import LapLichChoHoSo from './LapLichChoHoSo.jsx';

// "Lập lịch xem phòng mới" (trang đầy đủ như màn lập lịch, không còn hộp thoại): giữ nguyên phiếu yêu cầu của khách, chọn phòng khác và giờ xem mới (dùng lại màn lập lịch D-044).
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
  if (error) return <div className="sale-view"><p className="sale-alert sale-alert--danger" role="alert">{error}</p><button className="ui-btn ui-btn--secondary" onClick={onClose}>Quay lại</button></div>;
  if (!profile) return <div className="sale-view"><p role="status">Đang tải phiếu yêu cầu...</p></div>;
  return <LapLichChoHoSo profile={profile} onBack={onClose} onCreated={onCreated} />;
}
