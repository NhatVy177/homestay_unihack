import React, { useState } from 'react';
import WorkspaceShell from '../../components/common/WorkspaceShell.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';
import AdminDashboardTab from './tabs/AdminDashboardTab.jsx';
import AdminUsersTab from './tabs/AdminUsersTab.jsx';
import AdminEmployeesTab from './tabs/AdminEmployeesTab.jsx';
import AdminBranchesTab from './tabs/AdminBranchesTab.jsx';
import AdminRoomsTab from './tabs/AdminRoomsTab.jsx';
import AdminServicesTab from './tabs/AdminServicesTab.jsx';
import AdminConditionsTab from './tabs/AdminConditionsTab.jsx';
import AdminAssetsTab from './tabs/AdminAssetsTab.jsx';
import './admin-nam4.css';
import './admin.css';

const NAV_ITEMS = [
  { id: 'dashboard',   label: 'Tổng quan hệ thống', icon: 'dashboard' },
  { id: 'users',       label: 'Quản trị khách hàng', icon: 'groups' },
  { id: 'employees',   label: 'Quản trị nhân viên',  icon: 'person' },
  { id: 'branches',    label: 'Quản trị chi nhánh',  icon: 'apartment' },
  { id: 'rooms',       label: 'Phòng & giường',     icon: 'bed' },
  { id: 'services',    label: 'Danh mục dịch vụ',   icon: 'bolt' },
  { id: 'conditions',  label: 'Điều kiện lưu trú',  icon: 'gavel' },
  { id: 'assets',      label: 'Tài sản dùng chung', icon: 'inventory_2' }
];

export default function AdminPage() {
  const { user, dangXuat } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  const currentItem = NAV_ITEMS.find((item) => item.id === activeTab) || NAV_ITEMS[0];

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboardTab />;
      case 'users':
        return <AdminUsersTab />;
      case 'employees':
        return <AdminEmployeesTab />;
      case 'branches':
        return <AdminBranchesTab />;
      case 'rooms':
        return <AdminRoomsTab />;
      case 'services':
        return <AdminServicesTab />;
      case 'conditions':
        return <AdminConditionsTab />;
      case 'assets':
        return <AdminAssetsTab />;
      default:
        return <AdminDashboardTab />;
    }
  };

  return (
    <WorkspaceShell
      className="admin-page"
      roleLabel="Admin"
      eyebrow="Không gian làm việc Admin"
      title={currentItem.label}
      items={NAV_ITEMS}
      activeTab={activeTab}
      onSelect={setActiveTab}
      user={user}
      onLogout={dangXuat}
      mainClassName="admin-main"
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        {renderActiveView()}
      </div>
    </WorkspaceShell>
  );
}
