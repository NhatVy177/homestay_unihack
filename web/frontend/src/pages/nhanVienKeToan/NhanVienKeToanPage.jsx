import React, { lazy, Suspense, useState } from 'react';
import { useAuth } from '../../auth/AuthContext.jsx';
import WorkspaceShell from '../../components/common/WorkspaceShell.jsx';
import '../khachHang/khachHangPortal.css'; // Reuse main layout styles
import './nhanVienKeToanPortal.css'; // Use specific styles for content
import XacNhanThanhToanTab from '../nhanVienQuanLy/XacNhanThanhToanTab.jsx';
import TienMatChoNopQuyTab from './TienMatChoNopQuyTab.jsx';
import ThuNhanPhongTab from './ThuNhanPhongTab.jsx';
import QuyetToanTraPhongTab from './QuyetToanTraPhongTab.jsx';
const KeToanXacNhanTab = lazy(() => import('../../components/xacNhan/KeToanXacNhanTab.jsx'));

const navItems = [
  { id: 'xac-nhan-tien-ve', label: 'Xác nhận tiền về', icon: 'payments' },
  { id: 'nop-quy', label: 'Tiền mặt chờ nộp quỹ', icon: 'account_balance' },
  { id: 'thu-nhan-phong', label: 'Thu nhận phòng', icon: 'login' },
  { id: 'quyet-toan', label: 'Quyết toán trả phòng', icon: 'account_balance_wallet' },
  { id: 'xac-nhan-doi-soat', label: 'Khách xác nhận đối soát', icon: 'receipt_long' }
];

export default function NhanVienKeToanPage() {
  const { user, dangXuat } = useAuth();
  const [activeTab, setActiveTab] = useState('xac-nhan-tien-ve');

  return (
    <WorkspaceShell roleLabel="Nhân viên Kế toán" eyebrow="Không gian Kế toán"
      title={navItems.find(item => item.id === activeTab)?.label} items={navItems}
      activeTab={activeTab} onSelect={setActiveTab} user={user} onLogout={dangXuat}>
      {activeTab === 'xac-nhan-tien-ve' && <XacNhanThanhToanTab />}
      {activeTab === 'nop-quy' && <TienMatChoNopQuyTab />}
      {activeTab === 'thu-nhan-phong' && <ThuNhanPhongTab />}
      {activeTab === 'quyet-toan' && <QuyetToanTraPhongTab />}
      {activeTab === 'xac-nhan-doi-soat' && <Suspense fallback={null}><KeToanXacNhanTab /></Suspense>}
    </WorkspaceShell>
  );
}
