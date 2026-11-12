import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext.jsx';
import WorkspaceShell from '../../components/common/WorkspaceShell.jsx';
import { Icon } from '../../components/common/Icon.jsx';
import '../khachHang/khachHangPortal.css';
import '../../styles/saleWorkspace.css';
import SaleOverview from './SaleOverview.jsx';
import SaleCustomerWorkspace from './SaleCustomerWorkspace.jsx';
import SaleProfile from './SaleProfile.jsx';
import LichXemPhongTab from './LichXemPhongTab.jsx';
import LapHopDongTab from './LapHopDongTab.jsx';
import HoSoDangKyTab from './HoSoDangKyTab.jsx';
import DatCocTab from './DatCocTab.jsx';
import NhanPhongTab from './NhanPhongTab.jsx';

const navigation = [
  { id: 'tong-quan', label: 'Tổng quan', icon: 'home' },
  { id: 'lich-xem', label: 'Lịch hẹn xem phòng', icon: 'event_note' },
  { id: 'hop-dong-thue', label: 'Lập hợp đồng thuê', icon: 'description' },
  { id: 'khach-hang', label: 'Tra cứu khách hàng', icon: 'search' },
  { id: 'ho-so-ca-nhan', label: 'Hồ sơ cá nhân', icon: 'person' },
];
export default function NhanVienSalePage() {
  const { user, dangXuat } = useAuth();
  const [activeTab, setActiveTab] = useState('tong-quan'), [task, setTask] = useState(null);
  function navigate(tab) {
    const taskParents = { 'ho-so': 'lich-xem', 'dat-coc': 'tong-quan', 'nhan-phong': 'hop-dong-thue' };
    if (taskParents[tab]) { setTask(tab); setActiveTab(taskParents[tab]); }
    else if (navigation.some(item => item.id === tab)) { setTask(null); setActiveTab(tab); }
  }
  return <WorkspaceShell className="sale-workspace" roleLabel="Nhân viên Sale" eyebrow="Không gian Sale"
    title={navigation.find(item => item.id === activeTab)?.label} items={navigation} activeTab={activeTab}
    onSelect={navigate} user={user}
    onAccount={() => navigate('ho-so-ca-nhan')} onLogout={dangXuat}>
    {task && <div className="sale-view"><div className="sale-section-heading"><p className="sale-eyebrow">{task === 'ho-so' ? 'TIẾP NHẬN HỒ SƠ' : task === 'dat-coc' ? 'XỬ LÝ ĐẶT CỌC' : 'HỖ TRỢ KHAI NGƯỜI Ở'}</p><button className="ui-btn ui-btn--secondary" onClick={() => setTask(null)}><Icon name="arrow_back" /> Quay lại</button></div>{task === 'ho-so' && <HoSoDangKyTab />}{task === 'dat-coc' && <DatCocTab />}{task === 'nhan-phong' && <NhanPhongTab />}</div>}
    {!task && activeTab === 'tong-quan' && <SaleOverview user={user} onNavigate={navigate} />}
    {!task && activeTab === 'lich-xem' && <LichXemPhongTab onNavigate={navigate} />}
    {!task && activeTab === 'hop-dong-thue' && <LapHopDongTab onResidence={() => navigate('nhan-phong')} />}
    {activeTab === 'khach-hang' && <SaleCustomerWorkspace />}
    {activeTab === 'ho-so-ca-nhan' && <SaleProfile user={user} />}
  </WorkspaceShell>;
}
