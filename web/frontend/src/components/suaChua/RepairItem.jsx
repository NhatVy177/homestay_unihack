import React from 'react';
import StatusBadge from '../common/StatusBadge.jsx';
import { resolveAvatarUrl } from '../common/avatarUrl.js';
import { dateVi, moneyVi } from './suaChua.api.js';
import './suaChua.css';

// Một yêu cầu báo hỏng: dùng chung cho khách, quản lý và khung lịch sử lúc trả phòng.
export default function RepairItem({ item, showCustomer = false, children }) {
  const steps = [
    ['Báo hỏng', item.ngayYeuCau], ['Tiếp nhận', item.ngayTiepNhan], [item.trangThai === 'Từ chối' ? 'Từ chối' : 'Hoàn tất', item.ngayHoanTat],
  ].filter(([, date]) => date);
  return <article className="ui-card scb-item">
    <header className="scb-item-head">
      <div>
        <small>{item.maYeuCau} · {item.tenPhong || item.maPhong || 'Phòng'} · Hợp đồng {item.maHopDong}</small>
        <h3>{item.moTa}</h3>
        {showCustomer && item.hoTenKhach && <p className="scb-muted">{item.hoTenKhach}{item.sdtKhach ? ` · ${item.sdtKhach}` : ''}</p>}
      </div>
      <StatusBadge status={item.trangThai} />
    </header>
    {item.anh?.length > 0 && <div className="scb-photos">
      {item.anh.map((src) => <a key={src} href={resolveAvatarUrl(src)} target="_blank" rel="noreferrer"><img src={resolveAvatarUrl(src)} alt="Ảnh hư hỏng" loading="lazy" /></a>)}
    </div>}
    <p className="scb-muted">{steps.map(([label, date]) => `${label} ${dateVi(date)}`).join(' → ')}</p>
    {item.trangThai === 'Hoàn tất' && <p className="scb-result">
      <span className={`ui-badge ${item.loiDoKhach ? 'ui-badge--danger' : 'ui-badge--success'}`}>{item.loiDoKhach ? 'Do khách gây ra' : 'Không do khách gây ra'}</span>
      {item.chiPhi > 0 && <span>Chi phí sửa: {moneyVi(item.chiPhi)}</span>}
    </p>}
    {item.ghiChu && <p className="scb-note">{item.trangThai === 'Từ chối' ? 'Lý do từ chối: ' : 'Ghi chú: '}{item.ghiChu}</p>}
    {children}
  </article>;
}
