import React, { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import { getAuthenticatedHomePath } from './auth/auth.routes.js';

import TrangChu from './pages/TrangChu.jsx';
import ChiTietPhongPage from './pages/chiTietPhong/ChiTietPhongPage.jsx';
import ChotPhongPage from './pages/chiTietPhong/ChotPhongPage.jsx';
import DanhSachPhongPage from './pages/danhSachPhong/DanhSachPhongPage.jsx';
import DichVuPage from './pages/dichVu/DichVuPage.jsx';
import KhachHangPortalPage from './pages/khachHang/KhachHangPortalPage.jsx';
import NhanVienSalePage from './pages/nhanVienSale/NhanVienSalePage.jsx';
import NhanVienQuanLyPage from './pages/nhanVienQuanLy/NhanVienQuanLyPage.jsx';
import NhanVienKeToanPage from './pages/nhanVienKeToan/NhanVienKeToanPage.jsx';
import AdminPage from './pages/admin/AdminPage.jsx';
const AvalanchePortal = lazy(() => import('./pages/avalanche/AvalanchePortal.jsx'));
const AvalancheVerifyPage = lazy(() => import('./pages/avalanche/AvalancheVerifyPage.jsx'));
const ThanhToanMoPhongPage = lazy(() => import('./pages/thanhToanMoPhong/ThanhToanMoPhongPage.jsx'));

function LoadingScreen() {
  return <div className="auth-loading">Đang kiểm tra phiên đăng nhập...</div>;
}

// Trang khám phá phòng cũ đã bỏ: liên kết cũ đi về trang phòng (có mã phòng thì vào thẳng chi tiết phòng đó).
function LegacyExploreRedirect() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const room = params.get('phong');
  if (room) return <Navigate to={`/phong/${encodeURIComponent(room)}`} replace />;
  params.delete('phong');
  return <Navigate to={`/phong${params.toString() ? `?${params.toString()}` : ''}`} replace />;
}

function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to={`/?next=${encodeURIComponent(location.pathname + location.search + location.hash)}`} state={{ from: location }} replace />;
  return children;
}

function PublicOnlyRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (user) return <Navigate to={getAuthenticatedHomePath(user)} replace />;
  return children;
}

function CustomerOnlyRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/" replace />;
  if (user.vaiTro !== 'KhachHang') return <Navigate to={getAuthenticatedHomePath(user)} replace />;
  return children;
}

function EmployeePositionRoute({ position, children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/" replace />;
  if (user.vaiTro !== 'NhanVien') return <Navigate to="/khach-hang" replace />;
  if (user.chucVu !== position) return <Navigate to={getAuthenticatedHomePath(user)} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<TrangChu />} />
      <Route path="/kham-pha-phong" element={<LegacyExploreRedirect />} />
      <Route path="/phong/:maPhong" element={<ChiTietPhongPage />} />
      <Route path="/chot/:token" element={<ChotPhongPage />} />
      <Route path="/phong" element={<DanhSachPhongPage />} />
      <Route path="/dich-vu" element={<DichVuPage />} />
      <Route path="/ho-so-xac-nhan" element={<ProtectedRoute><Suspense fallback={<LoadingScreen />}><AvalanchePortal /></Suspense></ProtectedRoute>} />
      <Route path="/kiem-chung-avalanche" element={<Suspense fallback={<LoadingScreen />}><AvalancheVerifyPage /></Suspense>} />
      <Route path="/thanh-toan-mo-phong/:id" element={<ProtectedRoute><CustomerOnlyRoute><Suspense fallback={<LoadingScreen />}><ThanhToanMoPhongPage /></Suspense></CustomerOnlyRoute></ProtectedRoute>} />

      <Route
        path="/khach-hang"
        element={(
          <ProtectedRoute>
            <CustomerOnlyRoute>
              <KhachHangPortalPage />
            </CustomerOnlyRoute>
          </ProtectedRoute>
        )}
      />
      <Route path="/khach-moi" element={<Navigate to="/khach-hang" replace />} />
      <Route
        path="/nhan-vien-sale"
        element={(
          <ProtectedRoute>
            <EmployeePositionRoute position="Sale">
              <NhanVienSalePage />
            </EmployeePositionRoute>
          </ProtectedRoute>
        )}
      />
      <Route
        path="/nhan-vien-quan-ly"
        element={(
          <ProtectedRoute>
            <EmployeePositionRoute position="Quản lý">
              <NhanVienQuanLyPage />
            </EmployeePositionRoute>
          </ProtectedRoute>
        )}
      />
      <Route
        path="/nhan-vien-ke-toan"
        element={(
          <ProtectedRoute>
            <EmployeePositionRoute position="Kế toán">
              <NhanVienKeToanPage />
            </EmployeePositionRoute>
          </ProtectedRoute>
        )}
      />
      <Route
        path="/nhan-vien-admin"
        element={(
          <ProtectedRoute>
            <EmployeePositionRoute position="Admin">
              <AdminPage />
            </EmployeePositionRoute>
          </ProtectedRoute>
        )}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
