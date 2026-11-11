import React, { lazy, Suspense, useState } from 'react';
import { useAuth } from '../../auth/AuthContext.jsx';
import WorkspaceShell from '../../components/common/WorkspaceShell.jsx';
import '../khachHang/khachHangPortal.css'; // Reuse main layout styles
import './nhanVienQuanLy.css';
import XacNhanNhanPhongTab from './XacNhanNhanPhongTab.jsx';
import DuyetCuTruTab from './DuyetCuTruTab.jsx';
import BanGiaoPhongTab from './BanGiaoPhongTab.jsx';
import XuLyTraPhongTab from './XuLyTraPhongTab.jsx';
const QuanLyXacNhanTab = lazy(() => import('../../components/xacNhan/QuanLyXacNhanTab.jsx'));

const navItems = [
  { id: 'xac-nhan-nhan-phong', label: 'Duyệt nhận cọc', icon: 'assignment_turned_in' },
  { id: 'duyet-cu-tru', label: 'Duyệt cư trú', icon: 'fact_check' },
  { id: 'lap-bien-ban-ban-giao', label: 'Bàn giao phòng', icon: 'description' },
  { id: 'lap-bien-ban-kiem-tra-phong', label: 'Xử lý trả phòng', icon: 'receipt_long' },
  { id: 'xac-nhan-dien-tu', label: 'Khách xác nhận biên bản', icon: 'verified_user' }
];

export default function NhanVienQuanLyPage() {
  const { user, dangXuat } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    return navItems.some(item => item.id === tab) ? tab : 'xac-nhan-nhan-phong';
  });

  return (
    <WorkspaceShell roleLabel="Nhân viên Quản lý" eyebrow="Không gian Quản lý"
      title={navItems.find(item => item.id === activeTab)?.label} items={navItems}
      activeTab={activeTab} onSelect={setActiveTab} user={user} onLogout={dangXuat}>
      {activeTab === 'xac-nhan-nhan-phong' && <XacNhanNhanPhongTab />}
      {activeTab === 'duyet-cu-tru' && <DuyetCuTruTab />}
      {activeTab === 'lap-bien-ban-ban-giao' && <BanGiaoPhongTab />}
      {activeTab === 'lap-bien-ban-kiem-tra-phong' && <XuLyTraPhongTab />}
      {activeTab === 'xac-nhan-dien-tu' && <Suspense fallback={null}><QuanLyXacNhanTab /></Suspense>}
    </WorkspaceShell>
  );
}
