import React, { lazy, Suspense, useState } from 'react';
import { useAuth } from '../../auth/AuthContext.jsx';
import WorkspaceShell from '../../components/common/WorkspaceShell.jsx';
import '../khachHang/khachHangPortal.css'; // Reuse main layout styles
import './nhanVienQuanLy.css';
import XacNhanNhanPhongTab from './XacNhanNhanPhongTab.jsx';
import DuyetCuTruTab from './DuyetCuTruTab.jsx';
import BanGiaoPhongTab from './BanGiaoPhongTab.jsx';
import XuLyTraPhongTab from './XuLyTraPhongTab.jsx';
import ManagerRepairTab from '../../components/suaChua/ManagerRepairTab.jsx';
import SaleKpiReport from '../../components/kpiSale/SaleKpiReport.jsx';
import SaleCustomerWorkspace from '../nhanVienSale/SaleCustomerWorkspace.jsx';
import SaleProfile from '../nhanVienSale/SaleProfile.jsx';
import AssetTransferWorkspace from '../../components/assetTransfer/AssetTransferWorkspace.jsx';
import '../../styles/saleWorkspace.css';
const QuanLyXacNhanTab = lazy(() => import('../../components/xacNhan/QuanLyXacNhanTab.jsx'));

const navItems = [
  // Names and order follow Hang's manager menu; tab ids stay the same so old links keep working.
  { id: 'xac-nhan-nhan-phong', label: 'Kiểm duyệt đặt cọc', icon: 'assignment_turned_in' },
  { id: 'duyet-cu-tru', label: 'Kiểm tra lưu trú', icon: 'fact_check' },
  { id: 'lap-bien-ban-kiem-tra-phong', label: 'Quản lý hợp đồng', icon: 'receipt_long' },
  { id: 'lap-bien-ban-ban-giao', label: 'Bàn giao tài sản', icon: 'description' },
  { id: 'bao-hong', label: 'Báo hỏng & sửa chữa', icon: 'build' },
  { id: 'xac-nhan-dien-tu', label: 'Khách xác nhận biên bản', icon: 'verified_user' },
  { id: 'khach-hang', label: 'Tra cứu khách hàng', icon: 'search' },
  { id: 'kpi-sale', label: 'KPI Sale', icon: 'percent' },
  { id: 'dieu-phoi-tai-san', label: 'Điều phối tài sản', icon: 'swap_horiz' },
  { id: 'ho-so-ca-nhan', label: 'Hồ sơ cá nhân', icon: 'person' }
];

export default function NhanVienQuanLyPage() {
  const { user, dangXuat } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    return navItems.some(item => item.id === tab) ? tab : 'xac-nhan-nhan-phong';
  });
  // Món hư lúc bàn giao: mang phòng và tài sản sang Điều phối để thay trước khi giao (D-083).
  const [thayMon, setThayMon] = useState(null);
  const moDieuPhoi = (item) => { setThayMon(item); setActiveTab('dieu-phoi-tai-san'); };

  return (
    <WorkspaceShell roleLabel="Nhân viên Quản lý" eyebrow="Không gian Quản lý"
      title={navItems.find(item => item.id === activeTab)?.label} items={navItems}
      activeTab={activeTab} onSelect={setActiveTab} user={user} onLogout={dangXuat}>
      {activeTab === 'xac-nhan-nhan-phong' && <XacNhanNhanPhongTab />}
      {activeTab === 'duyet-cu-tru' && <DuyetCuTruTab />}
      {activeTab === 'lap-bien-ban-ban-giao' && <BanGiaoPhongTab onDieuPhoi={moDieuPhoi} />}
      {activeTab === 'lap-bien-ban-kiem-tra-phong' && <XuLyTraPhongTab />}
      {activeTab === 'bao-hong' && <ManagerRepairTab />}
      {activeTab === 'xac-nhan-dien-tu' && <Suspense fallback={null}><QuanLyXacNhanTab /></Suspense>}
      {activeTab === 'khach-hang' && <SaleCustomerWorkspace />}
      {activeTab === 'kpi-sale' && <SaleKpiReport title="KPI Sale chi nhánh" />}
      {activeTab === 'dieu-phoi-tai-san' && <AssetTransferWorkspace thayMon={thayMon} onDoneThayMon={() => setThayMon(null)} onBackToHandover={() => { setThayMon(null); setActiveTab('lap-bien-ban-ban-giao'); }} />}
      {activeTab === 'ho-so-ca-nhan' && <SaleProfile user={user} roleLabel="Nhân viên Quản lý" />}
    </WorkspaceShell>
  );
}
