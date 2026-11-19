import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { khachMoiApi } from '../khachMoi/khachMoi.api.js';

// Tim ở thẻ phòng trang chủ: khách đã đăng nhập có hồ sơ còn mở (cùng điều kiện với cổng khách, D-043) thì bấm tim
// là thêm/gỡ phòng khỏi hồ sơ ngay, không phải mở trang chi tiết. Một bản dữ liệu dùng chung cho mọi thẻ phòng.
const state = { profile: null, loaded: false, loading: null };
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn({ ...state }));

function timHoSoMo(hoSo = []) {
  return hoSo.find((item) => ['Chờ tiếp nhận', 'Đã tiếp nhận'].includes(item.trangThai)
    && !item.biHuyDoTatCaLich
    && !(item.sttLich != null && item.trangThaiLich !== 'Đã hủy')) || null;
}

function load() {
  state.loading = khachMoiApi.getTongQuan()
    .then(({ data }) => { state.profile = timHoSoMo(data?.hoSo); })
    .catch(() => { state.profile = null; })
    .finally(() => { state.loaded = true; state.loading = null; emit(); });
  return state.loading;
}

export function useInterestedRooms() {
  const { user } = useAuth();
  const isGuest = user?.vaiTro === 'KhachHang';
  const [snapshot, setSnapshot] = useState({ ...state });
  useEffect(() => {
    listeners.add(setSnapshot);
    return () => { listeners.delete(setSnapshot); };
  }, []);
  useEffect(() => {
    if (!isGuest) { state.profile = null; state.loaded = false; return; }
    if (!state.loaded && !state.loading) load();
  }, [isGuest]);

  const profile = isGuest ? snapshot.profile : null;
  const ids = new Set((profile?.danhSachPhongQuanTam || []).map((room) => room.maPhong));
  async function toggle(room) {
    const maPhong = room.MaPhong;
    try {
      if (ids.has(maPhong)) {
        await khachMoiApi.goPhongQuanTam(profile.maDangKy, maPhong);
        await load();
        return `Đã gỡ ${room.TenPhong} khỏi hồ sơ ${profile.maDangKy}.`;
      }
      await khachMoiApi.themPhongQuanTam(profile.maDangKy, maPhong);
      await load();
      return `Đã thêm ${room.TenPhong} vào hồ sơ ${profile.maDangKy}.`;
    } catch (error) {
      return error.response?.data?.message || 'Không cập nhật được phòng quan tâm lúc này.';
    }
  }
  return { isGuest, profile, has: (maPhong) => ids.has(maPhong), toggle };
}
