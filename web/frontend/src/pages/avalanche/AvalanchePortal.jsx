import React, { lazy, Suspense } from 'react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { getAuthenticatedHomePath } from '../../auth/auth.routes.js';
import './portal.css';
const appId = import.meta.env.VITE_PRIVY_APP_ID;
const PrivyPortal = appId ? lazy(() => import('./PrivyPortal.jsx')) : null;
export default function AvalanchePortal() {
  const { user } = useAuth();
  if (!PrivyPortal) return <main className="av-portal">
    <a href={getAuthenticatedHomePath(user)}>← HomeStayDorm</a><h1>Hồ sơ xác nhận</h1>
    <p>Chức năng xác nhận đang được chuẩn bị. Vui lòng thử lại sau.</p>
    <p>Các tính năng thuê phòng vẫn dùng bình thường.</p>
    <a href="/kiem-chung-avalanche">Kiểm chứng file đã lưu</a>
  </main>;
  return <Suspense fallback={<p>Đang chuẩn bị xác nhận trong tài khoản…</p>}><PrivyPortal /></Suspense>;
}
