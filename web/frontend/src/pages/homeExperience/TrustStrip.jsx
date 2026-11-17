import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { httpClient } from '../../api/httpClient.js';
import './trustStrip.css';

// Dải "Thuê minh bạch" trên trang chủ. Số liệu lấy từ biên lai giao dịch trên chuỗi (máy chủ đọc lại từ Avalanche), nhưng lời lẽ
// dành cho người đi thuê: không nói thuật ngữ ở phần đầu. Chi tiết kiểm chứng nằm trong khối thu gọn bên dưới.
const money = (value) => `${Number(value).toLocaleString('vi-VN')}đ`;
const when = (iso) => (iso ? new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

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
  return <section className="ts" id="minh-bach" aria-labelledby="ts-title">
    <div className="ts-inner">
      <div className="ts-head">
        <h2 id="ts-title">Thuê minh bạch, cọc rõ ràng</h2>
        <p>Mỗi biên bản bàn giao và bản đối soát tiền cọc đều được lưu lại sau khi khách xác nhận, không ai sửa được về sau.</p>
      </div>
      <dl className="ts-stats">
        {stats.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
      </dl>
      <button type="button" className="ts-toggle" aria-expanded={open} aria-controls="ts-proof" onClick={() => setOpen((value) => !value)}>
        {open ? 'Thu gọn' : 'Xem cách kiểm chứng'}
      </button>
      {open && <div className="ts-proof" id="ts-proof">
        <p>Bạn luôn giữ một bản biên bản của mình. Ai cũng có thể đối chiếu bản đó với hồ sơ đã lưu để biết nó có bị chỉnh sửa hay không, kể cả khi không đăng nhập.
          {' '}<Link to="/kiem-chung-avalanche">Kiểm tra một biên bản</Link></p>
        {data.recent?.length > 0 && <ul className="ts-list" aria-label="Hồ sơ gần đây">
          {data.recent.map((item) => <li key={item.hash}>
            <span>{item.label}</span><small>{when(item.at)}</small>
            {data.explorer && <a href={`${data.explorer}/tx/${item.hash}`} target="_blank" rel="noreferrer">Xem bằng chứng</a>}
          </li>)}
        </ul>}
        <p className="ts-note">Hồ sơ được ghi trên {data.network || 'Avalanche'}. Đây là mạng thử nghiệm dùng cho bản demo; các số liệu được máy chủ đọc lại từ biên lai giao dịch trên chuỗi.</p>
      </div>}
    </div>
  </section>;
}
