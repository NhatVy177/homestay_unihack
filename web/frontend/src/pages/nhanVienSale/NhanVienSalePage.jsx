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
import HoSoDangKyTab from './HoSoDangKyTab.jsx';
import DatCocTab from './DatCocTab.jsx';
import NhanPhongTab from './NhanPhongTab.jsx';

const navigation = [
  ['tong-quan', 'Tổng quan', 'home'], ['lich-xem', 'Lịch hẹn xem phòng', 'event_note'],
  ['hop-dong-thue', 'Lập hợp đồng thuê', 'description'], ['khach-hang', 'Tra cứu khách hàng', 'search'],
  ['ho-so-ca-nhan', 'Hồ sơ cá nhân', 'person'],
];
export default function NhanVienSalePage() {
  const { user, dangXuat } = useAuth();
  const [activeTab, setActiveTab] = useState('tong-quan'), [task, setTask] = useState(null);
  const [scheduling, setScheduling] = useState(false);
  function navigate(tab) {
    if (scheduling && tab !== activeTab) return;
    const taskParents = { 'ho-so': 'lich-xem', 'dat-coc': 'tong-quan', 'nhan-phong': 'hop-dong-thue' };
    if (taskParents[tab]) { setTask(tab); setActiveTab(taskParents[tab]); }
    else if (navigation.some(([id]) => id === tab)) { setTask(null); setActiveTab(tab); }
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
        {task && <div className="sale-view"><div className="sale-section-heading"><p className="sale-eyebrow">{task === 'ho-so' ? 'TIẾP NHẬN HỒ SƠ' : task === 'dat-coc' ? 'XỬ LÝ ĐẶT CỌC' : 'HỖ TRỢ KHAI NGƯỜI Ở'}</p><button className="ui-btn ui-btn--secondary" disabled={scheduling} onClick={() => setTask(null)}><Icon name="arrow_back" /> Quay lại</button></div>{task === 'ho-so' && <HoSoDangKyTab onSchedulingChange={setScheduling} />}{task === 'dat-coc' && <DatCocTab />}{task === 'nhan-phong' && <NhanPhongTab />}</div>}
        {!task && activeTab === 'tong-quan' && <SaleOverview user={user} onNavigate={navigate} />}
        {!task && activeTab === 'lich-xem' && <LichXemPhongTab onNavigate={navigate} onSchedulingChange={setScheduling} />}
        {!task && activeTab === 'hop-dong-thue' && <LapHopDongTab onResidence={() => navigate('nhan-phong')} />}
        {activeTab === 'khach-hang' && <SaleCustomerWorkspace />}
        {activeTab === 'ho-so-ca-nhan' && <SaleProfile user={user} />}
      </main>
    </div>
  </div>;
}
