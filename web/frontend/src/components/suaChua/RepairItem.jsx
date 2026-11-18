import React from 'react';
import StatusBadge from '../common/StatusBadge.jsx';
import { resolveAvatarUrl } from '../common/avatarUrl.js';
import { dateVi, moneyVi } from './suaChua.api.js';
import './suaChua.css';

// Ai trả tiền sửa (D-065): bảo trì thông thường thì chủ nhà chịu; do khách gây ra thì cộng vào hóa đơn tháng kế tiếp.
function billingText(item) {
  if (!item.loiDoKhach) return item.chiPhi > 0 ? `Chủ nhà chịu chi phí sửa ${moneyVi(item.chiPhi)}.` : 'Chủ nhà chịu chi phí sửa.';
  if (item.trangThaiPhi === 'Đã tính') return `${moneyVi(item.chiPhi)} đã cộng vào hóa đơn kỳ ${item.kyHoaDonPhi || ''}${item.maHoaDonPhi ? ` (${item.maHoaDonPhi})` : ''}.`;
  if (item.trangThaiPhi) return `${moneyVi(item.chiPhi)} sẽ được cộng vào hóa đơn tháng kế tiếp.`;
  return item.chiPhi > 0 ? `Chi phí sửa ${moneyVi(item.chiPhi)}.` : '';
}

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
        {item.loai && <span className="ui-badge ui-badge--neutral scb-type">{item.loai}</span>}
        {showCustomer && item.hoTenKhach && <p className="scb-muted">{item.hoTenKhach}{item.sdtKhach ? ` · ${item.sdtKhach}` : ''}</p>}
      </div>
      <StatusBadge status={item.trangThai} />
    </header>
    {item.anh?.length > 0 && <div className="scb-photos">
      {item.anh.map((src) => <a key={src} href={resolveAvatarUrl(src)} target="_blank" rel="noreferrer"><img src={resolveAvatarUrl(src)} alt="Ảnh hư hỏng" loading="lazy" /></a>)}
    </div>}
    <p className="scb-muted">{steps.map(([label, date]) => `${label} ${dateVi(date)}`).join(' → ')}</p>
    {item.trangThai === 'Hoàn tất' && <p className="scb-result">
      <span className={`ui-badge ${item.loiDoKhach ? 'ui-badge--danger' : 'ui-badge--success'}`}>{item.loiDoKhach ? 'Do khách gây ra' : 'Bảo trì thông thường'}</span>
      <span>{billingText(item)}</span>
    </p>}
    {item.ghiChu && <p className="scb-note">{item.trangThai === 'Từ chối' ? 'Lý do từ chối: ' : 'Ghi chú: '}{item.ghiChu}</p>}
    {children}
  </article>;
}
