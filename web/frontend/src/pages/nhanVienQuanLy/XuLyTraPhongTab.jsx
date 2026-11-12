import React, { useState } from 'react';
import KiemTraTraPhong from './KiemTraTraPhong.jsx';
import XacNhanPhanHoi from './XacNhanPhanHoi.jsx';
import CheckoutLifecyclePanel from '../../components/checkout/CheckoutLifecyclePanel.jsx';

export default function XuLyTraPhongTab() {
  const [tab, setTab] = useState('cho-lap-bien-ban');
  return <div className="ktp-container checkout-lifecycle">
    <div className="checkout-tabs" role="tablist" aria-label="Xử lý trả phòng">
      {[['cho-lap-bien-ban', 'Kiểm tra trả phòng'], ['xu-ly-phan-hoi', 'Xử lý phản hồi'], ['ket-thuc-hop-dong', 'Kết thúc hợp đồng']].map(([id, label]) => <button className="ui-btn ui-btn--ghost" role="tab" aria-selected={tab === id} aria-controls={`checkout-panel-${id}`} id={`checkout-tab-${id}`} key={id} onClick={() => setTab(id)}>{label}</button>)}
    </div>
    <div role="tabpanel" id={`checkout-panel-${tab}`} aria-labelledby={`checkout-tab-${tab}`}>
      {tab === 'cho-lap-bien-ban' && <KiemTraTraPhong />}
      {tab === 'xu-ly-phan-hoi' && <XacNhanPhanHoi />}
      {tab === 'ket-thuc-hop-dong' && <CheckoutLifecyclePanel />}
    </div>
  </div>;
}

