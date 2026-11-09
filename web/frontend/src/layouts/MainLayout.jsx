import React from 'react';
import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { getAuthenticatedHomePath } from '../auth/auth.routes.js';
import { Icon } from '../components/common/Icon.jsx';
import NavigationToggle from '../components/common/NavigationToggle.jsx';
import BranchChip from '../components/common/BranchChip.jsx';

export default function MainLayout() {
  const { user, dangXuat } = useAuth();
  const homePath = getAuthenticatedHomePath(user);

  if (homePath !== '/dashboard') {
    return <Navigate to={homePath} replace />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink className="brand" to="/">HappyRoom</NavLink>
        <span className="ui-role-label">{user?.chucVu || user?.vaiTro}</span>
        <nav>
          <NavLink to="/dashboard" end><Icon name="dashboard" />Dashboard</NavLink>
          <NavLink to="/dashboard/dang-ky-thue"><Icon name="description" />Đăng ký thuê</NavLink>
          <NavLink to="/dashboard/lich-xem-phong"><Icon name="pending_actions" />Lịch xem phòng</NavLink>
          <NavLink to="/dashboard/dat-coc"><Icon name="account_balance_wallet" />Đặt cọc</NavLink>
          <NavLink to="/dashboard/nhan-phong"><Icon name="meeting_room" />Nhận phòng</NavLink>
          <NavLink to="/dashboard/tra-phong"><Icon name="logout" />Trả phòng</NavLink>
        </nav>
        <div className="account-menu">
          <strong>{user.hoTen}</strong>
          <span>@{user.tenDangNhap}</span>
          <button className="secondary-button" type="button" onClick={dangXuat}>
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="ui-dashboard-topbar">
          <NavigationToggle />
          <BranchChip user={user} />
          <span className="ui-account-chip"><Icon name="account_circle" />{user?.hoTen}</span>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
