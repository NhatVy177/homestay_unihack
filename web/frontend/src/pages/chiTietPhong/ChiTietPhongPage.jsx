import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { httpClient } from '../../api/httpClient.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { getAuthenticatedHomePath } from '../../auth/auth.routes.js';
import PublicLayout from '../../components/publicSite/PublicLayout.jsx';
import RoomDetailView from '../../components/rooms/RoomDetailView.jsx';
import { normalizeRoomDetail } from '../../components/rooms/roomDetail.js';
import '../khamPhaPhong/khamPhaPhong.css';
import './chiTietPhong.css';

// Chi tiết một phòng (công khai, không cần tài khoản): /phong/<mã phòng>. Đăng ký thuê (một mình hoặc theo nhóm) cần đăng nhập
// và giữ lại phòng đã chọn. Trang danh sách phòng nằm ở /phong; liên kết cũ /kham-pha-phong?phong=<mã> được chuyển về đây.
export default function ChiTietPhongPage() {
  const { maPhong } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const backToRooms = () => navigate('/phong', { state: location.state });
  const { user } = useAuth();
  const [room, setRoom] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(true), [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setRoom(null); setError(''); setLoading(true);
    window.scrollTo({ top: 0 });
    httpClient.get(`/trang-chu/phong/${encodeURIComponent(maPhong)}`, { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setRoom(normalizeRoomDetail(data)); })
      .catch((requestError) => { if (!controller.signal.aborted) setError(requestError.response?.data?.message || 'Không thể tải chi tiết phòng lúc này.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [maPhong, attempt]);

  function goRegister(mode = '1') {
    const target = room?.maPhong ? `/khach-hang?tab=kham-pha&phong=${encodeURIComponent(room.maPhong)}&dangKy=${mode === 'nhom' ? 'nhom' : '1'}` : '/khach-hang';
    if (user) navigate(user.vaiTro === 'KhachHang' ? target : getAuthenticatedHomePath(user));
    else navigate(`/?next=${encodeURIComponent(target)}`);
  }

  return <PublicLayout>
    <div className="pl-wrap ctp">
      {loading && <div className="kp-loading" role="status"><span /><p>Đang tải chi tiết phòng...</p></div>}
      {error && <div className="kp-detail-error" role="alert"><h1>Chưa thể mở phòng</h1><p>{error}</p>
        <button className="kp-btn kp-btn-soft" type="button" onClick={backToRooms}>Quay lại khám phá phòng</button>
        <button className="kp-btn kp-btn-primary" type="button" onClick={() => setAttempt((value) => value + 1)}>Thử lại</button></div>}
      {room && <RoomDetailView key={room.maPhong} phong={room} onBack={backToRooms} onRent={() => goRegister()} onRentGroup={() => goRegister('nhom')} />}
    </div>
  </PublicLayout>;
}
