import React, { useEffect, useState } from 'react';
import { httpClient } from '../../api/httpClient.js';
import EmptyState from '../common/EmptyState.jsx';
import './sourceReport.css';

// Bảng "Khách đến từ đâu": số hồ sơ, đã cọc, đã ký hợp đồng và tỷ lệ chốt theo nguồn khách (Sale, quản lý).
export default function SourceReport() {
  const [data, setData] = useState(null), [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    httpClient.get('/bao-cao/nguon-khach').then(({ data: body }) => { if (alive) setData(body); })
      .catch((e) => { if (alive) setError(e.response?.data?.message || 'Chưa tải được báo cáo nguồn khách.'); });
    return () => { alive = false; };
  }, []);
  if (data && !data.ready) return null;
  const max = Math.max(1, ...(data?.rows || []).map((r) => r.soHoSo));
  return <section className="ui-card src-report" aria-labelledby="src-title">
    <div><p className="sale-eyebrow">NGUỒN KHÁCH</p><h2 id="src-title">Khách đến từ đâu</h2>
      <p className="src-hint">Tỷ lệ chốt = số hồ sơ đã ký hợp đồng trên tổng hồ sơ của nguồn đó.</p></div>
    {error && <p className="src-error" role="alert">{error}</p>}
    {!data && !error && <p role="status">Đang tải...</p>}
    {data?.rows?.length === 0 && <EmptyState message="Chưa có hồ sơ đăng ký nào." />}
    {data?.rows?.length > 0 && <div className="src-table-wrap"><table className="ui-table src-table">
      <thead><tr><th>Nguồn</th><th className="ui-num">Hồ sơ</th><th className="ui-num">Đã cọc</th><th className="ui-num">Đã ký HĐ</th><th className="ui-num">Tỷ lệ chốt</th></tr></thead>
      <tbody>{data.rows.map((row) => <tr key={row.nguon}>
        <td><span className="src-name">{row.nguon}</span><span className="src-bar" aria-hidden="true"><span style={{ width: `${(row.soHoSo / max) * 100}%` }} /></span></td>
        <td className="ui-num">{row.soHoSo}</td><td className="ui-num">{row.soDatCoc}</td><td className="ui-num">{row.soHopDong}</td>
        <td className="ui-num"><strong>{row.tyLeChot}%</strong></td>
      </tr>)}</tbody>
    </table></div>}
  </section>;
}
