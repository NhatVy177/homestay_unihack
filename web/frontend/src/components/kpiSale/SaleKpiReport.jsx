import React, { useEffect, useMemo, useState } from 'react';
import { httpClient } from '../../api/httpClient.js';
import EmptyState from '../common/EmptyState.jsx';
import './saleKpi.css';

// KPI Sale theo tháng đăng ký của hồ sơ (D-075). Backend tự giới hạn phạm vi theo vai trò:
// Sale thấy số của mình, Quản lý thấy Sale chi nhánh mình, Admin thấy tất cả và lọc theo chi nhánh.
function monthOptions(now = new Date()) {
  const list = [];
  for (let i = 0; i < 6; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    list.push({ value, label: i === 0 ? `Tháng này (${d.getMonth() + 1}/${d.getFullYear()})` : `Tháng ${d.getMonth() + 1}/${d.getFullYear()}` });
  }
  list.push({ value: '', label: 'Tất cả thời gian' });
  return list;
}

export default function SaleKpiReport({ title = 'KPI Sale' }) {
  const months = useMemo(() => monthOptions(), []);
  const [thang, setThang] = useState(months[0].value), [chiNhanh, setChiNhanh] = useState('');
  const [data, setData] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    httpClient.get('/bao-cao/kpi-sale', { params: { thang, chiNhanh } })
      .then(({ data: body }) => { if (alive) setData(body); })
      .catch((e) => { if (alive) setError(e.response?.data?.message || 'Chưa tải được KPI Sale. Vui lòng thử lại.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [thang, chiNhanh]);

  const own = data?.phamVi === 'sale';
  const mine = own ? data.rows[0] : null;
  const cards = mine ? [
    ['Hồ sơ phụ trách', mine.soHoSo], ['Đã xem phòng', mine.soDaXem], ['Đặt cọc', mine.soDatCoc],
    ['Hợp đồng', mine.soHopDong], ['Tỷ lệ đặt cọc', `${mine.tyLeDatCoc}%`], ['Tỷ lệ chốt', `${mine.tyLeChot}%`],
  ] : [];

  return <section className="ui-card kpi-report" aria-labelledby="kpi-title">
    <div className="kpi-head">
      <div><p className="kpi-eyebrow">HIỆU QUẢ BÁN HÀNG</p><h2 id="kpi-title">{own ? 'KPI của bạn' : title}</h2>
        <p className="kpi-hint">Tính theo hồ sơ nhận trong kỳ. Tỷ lệ đặt cọc = hồ sơ đã trả cọc / hồ sơ; tỷ lệ chốt = hồ sơ đã ký hợp đồng / hồ sơ.</p></div>
      <div className="kpi-filters">
        <label className="kpi-filter"><span>Kỳ</span>
          <select className="ui-input" value={thang} onChange={(e) => setThang(e.target.value)}>
            {months.map((m) => <option key={m.value || 'all'} value={m.value}>{m.label}</option>)}
          </select></label>
        {data?.phamVi === 'admin' && <label className="kpi-filter"><span>Chi nhánh</span>
          <select className="ui-input" value={chiNhanh} onChange={(e) => setChiNhanh(e.target.value)}>
            <option value="">Tất cả chi nhánh</option>
            {data.danhSachChiNhanh.map((c) => <option key={c.maChiNhanh} value={c.maChiNhanh}>{c.tenChiNhanh}</option>)}
          </select></label>}
      </div>
    </div>
    {error && <p className="kpi-error" role="alert">{error}</p>}
    {loading && !data && <p role="status">Đang tải KPI...</p>}
    {data && !error && own && (mine
      ? <div className="kpi-cards">{cards.map(([label, value]) => <article className="kpi-card" key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
      : <EmptyState message="Chưa có hồ sơ nào được giao cho bạn trong kỳ này." />)}
    {data && !error && !own && (data.rows.length === 0
      ? <EmptyState message="Chi nhánh chưa có nhân viên Sale." />
      : <div className="kpi-table-wrap"><table className="ui-table kpi-table">
        <thead><tr><th>Nhân viên Sale</th>{data.phamVi === 'admin' && <th>Chi nhánh</th>}<th className="ui-num">Hồ sơ</th><th className="ui-num">Đã xem</th><th className="ui-num">Không đến</th><th className="ui-num">Đặt cọc</th><th className="ui-num">Hợp đồng</th><th className="ui-num">Tỷ lệ cọc</th><th className="ui-num">Tỷ lệ chốt</th></tr></thead>
        <tbody>{data.rows.map((r) => <tr key={r.maNhanVien}>
          <td><span className="kpi-name">{r.hoTen}</span><span className="kpi-code">{r.maNhanVien}</span></td>
          {data.phamVi === 'admin' && <td>{r.tenChiNhanh || r.maChiNhanh}</td>}
          <td className="ui-num">{r.soHoSo}</td><td className="ui-num">{r.soDaXem}</td><td className="ui-num">{r.soKhongDen}</td>
          <td className="ui-num">{r.soDatCoc}</td><td className="ui-num">{r.soHopDong}</td>
          <td className="ui-num">{r.tyLeDatCoc}%</td>
          <td className="ui-num"><strong>{r.tyLeChot}%</strong><span className="kpi-bar" aria-hidden="true"><span style={{ width: `${r.tyLeChot}%` }} /></span></td>
        </tr>)}</tbody>
        <tfoot><tr><th scope="row">Tổng</th>{data.phamVi === 'admin' && <td />}
          <td className="ui-num">{data.tong.soHoSo}</td><td className="ui-num">{data.tong.soDaXem}</td><td className="ui-num">{data.tong.soKhongDen}</td>
          <td className="ui-num">{data.tong.soDatCoc}</td><td className="ui-num">{data.tong.soHopDong}</td>
          <td className="ui-num">{data.tong.tyLeDatCoc}%</td><td className="ui-num"><strong>{data.tong.tyLeChot}%</strong></td></tr></tfoot>
      </table></div>)}
  </section>;
}
