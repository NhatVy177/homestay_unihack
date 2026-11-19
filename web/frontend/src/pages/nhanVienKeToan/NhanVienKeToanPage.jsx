import React, { lazy, Suspense, useState } from 'react';
import { useAuth } from '../../auth/AuthContext.jsx';
import WorkspaceShell from '../../components/common/WorkspaceShell.jsx';
import '../khachHang/khachHangPortal.css'; // Reuse main layout styles
import './nhanVienKeToanPortal.css'; // Use specific styles for content
import XacNhanThanhToanTab from '../nhanVienQuanLy/XacNhanThanhToanTab.jsx';
import TienMatChoNopQuyTab from './TienMatChoNopQuyTab.jsx';
import ThuNhanPhongTab from './ThuNhanPhongTab.jsx';
import HoaDonDinhKyTab from './HoaDonDinhKyTab.jsx';
import QuyetToanTraPhongTab from './QuyetToanTraPhongTab.jsx';
import SaleCustomerWorkspace from '../nhanVienSale/SaleCustomerWorkspace.jsx';
import SaleProfile from '../nhanVienSale/SaleProfile.jsx';
import '../../styles/saleWorkspace.css';
const KeToanXacNhanTab = lazy(() => import('../../components/xacNhan/KeToanXacNhanTab.jsx'));

const navItems = [
  // Names and order follow Hang's accountant menu; tab ids stay the same.
  { id: 'xac-nhan-tien-ve', label: 'Hóa đơn đặt cọc', icon: 'payments' },
  { id: 'thu-nhan-phong', label: 'Hóa đơn nhận phòng', icon: 'login' },
  { id: 'hoa-don-dinh-ky', label: 'Hóa đơn định kỳ', icon: 'payments' },
  { id: 'nop-quy', label: 'Thu tiền mặt', icon: 'account_balance' },
  { id: 'quyet-toan', label: 'Đối soát trả phòng', icon: 'account_balance_wallet' },
  { id: 'chi-tien-thanh-ly', label: 'Chi tiền thanh lý', icon: 'price_check' },
  { id: 'xac-nhan-doi-soat', label: 'Khách xác nhận đối soát', icon: 'receipt_long' },
  { id: 'khach-hang', label: 'Tra cứu khách hàng', icon: 'search' },
  { id: 'ho-so-ca-nhan', label: 'Hồ sơ cá nhân', icon: 'person' }
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
      {activeTab === 'hoa-don-dinh-ky' && <HoaDonDinhKyTab />}
      {activeTab === 'quyet-toan' && <QuyetToanTraPhongTab key="doi-soat" group="doi-soat" />}
      {activeTab === 'chi-tien-thanh-ly' && <QuyetToanTraPhongTab key="chi-tien" group="chi-tien" />}
      {activeTab === 'xac-nhan-doi-soat' && <Suspense fallback={null}><KeToanXacNhanTab /></Suspense>}
      {activeTab === 'khach-hang' && <SaleCustomerWorkspace />}
      {activeTab === 'ho-so-ca-nhan' && <SaleProfile user={user} roleLabel="Nhân viên Kế toán" />}
    </WorkspaceShell>
  );
}
