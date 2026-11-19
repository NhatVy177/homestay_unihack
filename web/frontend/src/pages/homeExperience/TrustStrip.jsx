import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { httpClient } from '../../api/httpClient.js';
import { Icon } from '../../components/common/Icon.jsx';
import './trustStrip.css';

// Dải "Thuê minh bạch" trên trang chủ. Số liệu lấy từ biên lai giao dịch trên chuỗi (máy chủ đọc lại từ Avalanche), nhưng lời lẽ
// dành cho người đi thuê. Phần mở rộng là "Hoạt động gần đây" như trang thuê nhà thường có; liên kết bản gốc chỉ là biểu tượng nhỏ
// và không nhắc tên mạng lưu trữ ở trang chủ (D-060).
const money = (value) => `${Number(value).toLocaleString('vi-VN')}đ`;
// Trạng thái mới nhất của từng phòng, nói bằng lời thường.
const STATUS = {
  SettlementAccepted: 'Đã bàn giao và đối soát tiền cọc xong',
  SettlementDisputed: 'Khách đang phản hồi bản đối soát',
  SettlementProposed: 'Đã gửi đối soát tiền cọc cho khách',
  HandoverAccepted: 'Khách đã xác nhận biên bản bàn giao',
  HandoverProposed: 'Đã lập biên bản bàn giao, chờ khách xác nhận',
};
const MAX_ROOMS = 3;
// Mỗi phòng một dòng (sự kiện mới nhất), tối đa MAX_ROOMS phòng mới nhất, để khối luôn gọn dù có nhiều hồ sơ.
export function latestPerRoom(items = [], limit = MAX_ROOMS) {
  const seen = new Set(), rows = [];
  for (const item of [...items].sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0) || Number(b.blockNumber) - Number(a.blockNumber))) {
    const key = item.room || item.hash;
    if (seen.has(key)) continue;
    seen.add(key); rows.push(item);
    if (rows.length === limit) break;
  }
  return rows;
}
export function timeAgo(iso, now = Date.now()) {
  if (!iso) return '';
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

export default function TrustStrip() {
  const [data, setData] = useState(null), [open, setOpen] = useState(false);
  useEffect(() => {
    let alive = true;
    httpClient.get('/trang-chu/minh-bach').then(({ data: body }) => { if (alive) setData(body); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  // Chưa có số liệu hoặc chưa có hồ sơ nào được khách xác nhận thì không hiện khối này (không để trang chủ trống rỗng hay hỏng).
  if (!data?.ready || (data.handoversConfirmed + data.settlementsAccepted) < 1) return null;
  const stats = [
    { value: data.handoversConfirmed, label: 'biên bản bàn giao đã được khách xác nhận' },
    { value: data.settlementsAccepted, label: 'bản đối soát tiền cọc được khách đồng ý' },
    data.acceptedWithoutDispute > 0 && { value: data.acceptedWithoutDispute, label: 'đồng ý ngay, không cần chỉnh sửa' },
    Number(data.refundVnd) > 0 && { value: money(data.refundVnd), label: 'tiền cọc hoàn lại theo đối soát đã đồng ý' },
  ].filter(Boolean).slice(0, 3);
  const recent = latestPerRoom(data.recent);
  return <section className="ts" id="minh-bach" aria-labelledby="ts-title">
    <div className="ts-inner">
      <div className="ts-head">
        <h2 id="ts-title">Thuê minh bạch, cọc rõ ràng</h2>
        <p>Mỗi biên bản bàn giao và bản đối soát tiền cọc đều được lưu lại sau khi khách xác nhận, không ai sửa được về sau.</p>
      </div>
      <dl className="ts-stats">
        {stats.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
      </dl>
      {recent.length > 0 && <button type="button" className="ts-toggle" aria-expanded={open} aria-controls="ts-activity" onClick={() => setOpen((value) => !value)}>
        {open ? 'Thu gọn' : 'Xem hoạt động gần đây'}
      </button>}
      {open && <div className="ts-activity" id="ts-activity">
        <h3>Hoạt động gần đây</h3>
        <ul className="ts-list">
          {recent.map((item) => <li key={item.hash}>
            <span className="ts-check" aria-hidden="true"><Icon name="check" /></span>
            <span className="ts-what"><strong>{item.room || 'Một phòng'}</strong><small>{[STATUS[item.type] || item.label, timeAgo(item.at)].filter(Boolean).join(' · ')}</small></span>
            {data.explorer && <a className="ts-source" href={`${data.explorer}/tx/${item.hash}`} target="_blank" rel="noreferrer"
              aria-label={`Mở bản gốc: ${item.room || 'hồ sơ'}`} title="Mở bản gốc đã lưu"><Icon name="arrow_forward" /></a>}
          </li>)}
        </ul>
        <p className="ts-own">Bạn luôn giữ một bản biên bản của mình (file tải về sau khi xác nhận) và có thể tự đối chiếu bất cứ lúc nào, kể cả khi không đăng nhập. <Link to="/kiem-chung-avalanche">Tự kiểm tra biên bản của bạn →</Link></p>
      </div>}
    </div>
  </section>;
}
