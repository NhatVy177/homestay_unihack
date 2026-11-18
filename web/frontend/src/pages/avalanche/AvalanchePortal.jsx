import React, { lazy, Suspense } from 'react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { getAuthenticatedHomePath } from '../../auth/auth.routes.js';
import { ConfirmationNotice } from '../../components/xacNhan/ConfirmationFeedback.jsx';
import '../../components/xacNhan/xacNhan.css';
import './portal.css';
// Trang gom hồ sơ xác nhận theo vai trò (giữ đường dẫn cũ /ho-so-xac-nhan). Luồng chính nằm trong
// màn Hợp đồng của khách và tab của quản lý/kế toán (D-012).
const HopDongXacNhanSection = lazy(() => import('../../components/xacNhan/HopDongXacNhanSection.jsx'));
const QuanLyXacNhanTab = lazy(() => import('../../components/xacNhan/QuanLyXacNhanTab.jsx'));
const KeToanXacNhanTab = lazy(() => import('../../components/xacNhan/KeToanXacNhanTab.jsx'));
export default function AvalanchePortal() {
  const { user } = useAuth();
  const body = user.vaiTro === 'KhachHang' ? <HopDongXacNhanSection emptyText="Chưa có biên bản hay bảng đối soát nào cần bạn xem." />
    : user.chucVu === 'Quản lý' ? <QuanLyXacNhanTab /> : user.chucVu === 'Kế toán' ? <KeToanXacNhanTab />
      : <p>Trang này dành cho khách thuê, quản lý và kế toán.</p>;
  return <main className="av-portal">
    <header><a href={getAuthenticatedHomePath(user)}>← Về trang của tôi</a><a href="/kiem-chung-avalanche">Kiểm chứng hồ sơ đã lưu</a></header>
    <h1>Biên bản bàn giao & đối soát</h1>
    <Suspense fallback={<ConfirmationNotice>Đang tải hồ sơ xác nhận…</ConfirmationNotice>}>{body}</Suspense>
  </main>;
}
