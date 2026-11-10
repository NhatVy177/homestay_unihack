import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import NavigationToggle from '../../components/common/NavigationToggle.jsx';
import BranchChip from '../../components/common/BranchChip.jsx';
import { Icon } from '../../components/common/Icon.jsx';
import '../khachHang/khachHangPortal.css';
import '../nhanVienKeToan/nhanVienKeToanPortal.css';
import '../../styles/saleWorkspace.css';
import SaleOverview from './SaleOverview.jsx';
import SaleCustomerWorkspace from './SaleCustomerWorkspace.jsx';
import SaleProfile from './SaleProfile.jsx';
import LichXemPhongTab from './LichXemPhongTab.jsx';
import LapHopDongTab from './LapHopDongTab.jsx';

const navigation = [
  ['tong-quan', 'Tổng quan', 'home'], ['lich-xem', 'Lịch hẹn xem phòng', 'event_note'],
  ['hop-dong-thue', 'Lập hợp đồng thuê', 'description'], ['khach-hang', 'Tra cứu khách hàng', 'search'],
  ['ho-so-ca-nhan', 'Hồ sơ cá nhân', 'person'],
];
export default function NhanVienSalePage() {
  const { user, dangXuat } = useAuth();
  const [activeTab, setActiveTab] = useState('tong-quan'), [customerTab, setCustomerTab] = useState('khach-hang');
  const [scheduling, setScheduling] = useState(false);
  function navigate(tab) {
    if (scheduling && tab !== activeTab) return;
    if (['ho-so', 'dat-coc', 'nhan-phong', 'tra-phong', 'khach-hang'].includes(tab)) {
      setCustomerTab(tab); setActiveTab('khach-hang');
    } else setActiveTab(tab);
  }
  return <div className="kp-page kh-page ui-employee-shell sale-workspace">
    <aside className="kp-sidebar"><div className="kp-sidebar-brand"><Link className="kp-brand sale-brand" to="/"><Icon name="home" /><span>Homestay<span>Dorm</span></span></Link><span className="ui-role-label">Nhân viên Sale</span></div>
      <nav className="ktp-sidebar-nav" aria-label="Menu sale">{navigation.map(([id, label, icon]) => <button className={`ktp-side-item ${activeTab === id ? 'is-active' : ''}`} type="button" key={id} disabled={scheduling && activeTab !== id} aria-current={activeTab === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon name={icon} /><span>{label}</span></button>)}</nav>
      <div className="sale-sidebar-footer"><span className="sale-sidebar-mark"><Icon name="verified_user" /></span><p>Không gian làm việc<br /><strong>Nhân viên Sale</strong></p></div>
    </aside>
    <div className="kp-app"><header className="kp-topbar sale-topbar"><NavigationToggle /><div><p className="sale-eyebrow">KHÔNG GIAN SALE</p><h1>{navigation.find(([id]) => id === activeTab)?.[1]}</h1></div>
      <div className="kp-top-actions"><BranchChip user={user} /><button className="sale-account" onClick={() => navigate('ho-so-ca-nhan')} disabled={scheduling}><span className="kp-avatar">{(user?.hoTen || 'S').trim().charAt(0).toUpperCase()}</span><span><strong>{user?.hoTen || 'Nhân viên'}</strong><small>Nhân viên Sale</small></span></button><button className="ui-btn ui-btn--ghost" type="button" onClick={dangXuat} aria-label="Đăng xuất"><Icon name="logout" /></button></div>
    </header>
      <main className="kp-main" id="sale-main">
        {activeTab === 'tong-quan' && <SaleOverview user={user} onNavigate={navigate} />}
        {activeTab === 'lich-xem' && <LichXemPhongTab onNavigate={navigate} onSchedulingChange={setScheduling} />}
        {activeTab === 'hop-dong-thue' && <LapHopDongTab />}
        {activeTab === 'khach-hang' && <SaleCustomerWorkspace initialTab={customerTab} onSchedulingChange={setScheduling} scheduling={scheduling} />}
        {activeTab === 'ho-so-ca-nhan' && <SaleProfile user={user} />}
      </main>
    </div>
  </div>;
}
