import React, { useEffect, useState } from 'react';
import RepairItem from './RepairItem.jsx';
import { errorText, suaChuaApi } from './suaChua.api.js';
import './suaChua.css';

// Lịch sử báo hỏng của một hợp đồng, đặt cạnh phần kiểm tra trả phòng / đối soát cọc: hư hỏng đã báo và "không do khách"
// thì không tính vào chi phí trả phòng. Không có báo hỏng thì không hiện gì.
export default function RepairHistoryPanel({ maHopDong }) {
  const [items, setItems] = useState(null), [error, setError] = useState('');
  useEffect(() => {
    if (!maHopDong) return undefined;
    let alive = true;
    suaChuaApi.theoHopDong(maHopDong).then(({ data }) => { if (alive) setItems(data || []); })
      .catch((e) => { if (alive) { setItems([]); setError(errorText(e, 'Chưa tải được lịch sử báo hỏng.')); } });
    return () => { alive = false; };
  }, [maHopDong]);
  if (error) return <p className="scb-message scb-message--error" role="alert">{error}</p>;
  if (!items?.length) return null;
  return <section className="scb-history" aria-label="Báo hỏng trong thời gian thuê">
    <h3>Báo hỏng trong thời gian thuê ({items.length})</h3>
    <p className="scb-muted">Hư hỏng khách đã báo trước, kèm ảnh và ngày báo. Mục "Không do khách gây ra" không tính vào chi phí trả phòng.</p>
    <div className="scb-list">{items.map((item) => <RepairItem key={item.maYeuCau} item={item} />)}</div>
  </section>;
}
