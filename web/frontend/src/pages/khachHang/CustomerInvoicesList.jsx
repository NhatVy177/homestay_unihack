import React, { useMemo, useState } from 'react';
import { Icon } from '../../components/common/Icon.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import StatusFilterTabs from '../../components/common/StatusFilterTabs.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import './customerInvoices.css';

const money = (value) => `${Math.round(Number(value) || 0).toLocaleString('vi-VN')}đ`;
const dayOf = (value) => (value ? String(value).slice(0, 10) : '');
const dateLabel = (value) => (dayOf(value) ? dayOf(value).split('-').reverse().join('/') : '—');
const periodLabel = (ky) => (ky ? `Tháng ${ky.slice(5, 7)}/${ky.slice(0, 4)}` : '—');

// Gộp phiếu cọc và hóa đơn theo kỳ thành một danh sách. group: unpaid | paid | overdue | other.
export function buildInvoiceRows({ deposits = [], invoices = [], today = new Date().toISOString().slice(0, 10) }) {
  const depositRows = deposits.map((item) => {
    const state = item.trangThai;
    const group = state === 'Chờ thanh toán' || state === 'Bị từ chối' ? 'unpaid' : state === 'Hoàn tất' ? 'paid'
      : state === 'Hết hạn' ? 'overdue' : 'other';
    const issued = dayOf(item.ngayLapPhieu || item.ngayLap || item.ngayDatCoc || item.thoiHanThanhToan);
    return { key: `coc-${item.maPhieuCoc}`, kind: 'deposit', id: item.maPhieuCoc, period: issued.slice(0, 7), loai: 'Đặt cọc',
      amount: item.soTienCoc, due: dayOf(item.thoiHanThanhToan), status: state, group, source: item, canPay: group === 'unpaid' };
  });
  const invoiceRows = invoices.map((item) => {
    const paid = item.trangThai === 'Đã TT';
    const late = !paid && (item.trangThai === 'Nợ' || (dayOf(item.ngayHanTT) && dayOf(item.ngayHanTT) < today));
    return { key: `hd-${item.maHoaDon}`, kind: 'invoice', id: item.maHoaDon, period: item.kyThanhToan, loai: item.loai,
      amount: item.tongTien, due: dayOf(item.ngayHanTT), status: paid ? 'Đã thanh toán' : late ? 'Quá hạn' : 'Chờ thanh toán',
      group: paid ? 'paid' : late ? 'overdue' : 'unpaid', source: item, canPay: !paid };
  });
  return [...depositRows, ...invoiceRows].sort((a, b) => String(b.period).localeCompare(String(a.period)) || String(b.id).localeCompare(String(a.id)));
}

export default function CustomerInvoicesList({ deposits, invoices, loading, error, onOpenDeposit, onOpenContract }) {
  const rows = useMemo(() => buildInvoiceRows({ deposits, invoices }), [deposits, invoices]);
  const [group, setGroup] = useState('all'), [month, setMonth] = useState(''), [year, setYear] = useState(''), [loai, setLoai] = useState('');
  const years = [...new Set(rows.map((row) => String(row.period).slice(0, 4)).filter(Boolean))].sort().reverse();
  const unpaid = rows.filter((row) => row.group === 'unpaid' || row.group === 'overdue');
  const nextDue = unpaid.map((row) => row.due).filter(Boolean).sort()[0];
  const visible = rows.filter((row) => (group === 'all' || row.group === group)
    && (!month || String(row.period).slice(5, 7) === month) && (!year || String(row.period).slice(0, 4) === year) && (!loai || row.loai === loai));
  const open = (row) => (row.kind === 'deposit' ? onOpenDeposit(row.source) : onOpenContract(row.source.maHopDong));

  return <section className="cinv-page" aria-label="Hóa đơn và thanh toán">
    <header className="cinv-head"><h2>Hóa đơn &amp; thanh toán</h2><p>Theo dõi tiền cọc và các kỳ thanh toán của bạn, trả trực tuyến nhanh chóng.</p></header>
    <div className="cinv-cards">
      <article className="ui-card"><span className="cinv-icon"><Icon name="receipt_long" /></span><small>Chưa thanh toán</small><strong>{String(unpaid.length).padStart(2, '0')} <em>khoản</em></strong></article>
      <article className="ui-card"><span className="cinv-icon"><Icon name="payments" /></span><small>Tổng cần thanh toán</small><strong>{money(unpaid.reduce((sum, row) => sum + (Number(row.amount) || 0), 0))}</strong></article>
      <article className="ui-card"><span className="cinv-icon"><Icon name="event_note" /></span><small>Hạn gần nhất</small><strong>{nextDue ? dateLabel(nextDue) : '—'}</strong></article>
      <article className="ui-card"><span className="cinv-icon"><Icon name="warning" /></span><small>Quá hạn</small><strong>{rows.filter((row) => row.group === 'overdue').length}</strong></article>
    </div>
    <div className="ui-card cinv-filters">
      <div className="cinv-selects">
        <select aria-label="Lọc theo tháng" value={month} onChange={(e) => setMonth(e.target.value)}><option value="">Tất cả các tháng</option>{Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => <option key={m} value={m}>Tháng {m}</option>)}</select>
        <select aria-label="Lọc theo năm" value={year} onChange={(e) => setYear(e.target.value)}><option value="">Tất cả năm</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
        <select aria-label="Lọc theo loại" value={loai} onChange={(e) => setLoai(e.target.value)}><option value="">Tất cả loại</option>{['Đặt cọc', 'Kỳ đầu', 'Hàng tháng'].map((l) => <option key={l} value={l}>{l}</option>)}</select>
      </div>
      <StatusFilterTabs ariaLabel="Lọc theo trạng thái thanh toán" activeKey={group} onChange={setGroup}
        items={[{ key: 'all', label: 'Tất cả' }, { key: 'unpaid', label: 'Chưa thanh toán' }, { key: 'paid', label: 'Đã thanh toán' }, { key: 'overdue', label: 'Quá hạn' }]} />
    </div>
    {error && <p className="customer-viewing-error" role="alert">{error}</p>}
    {loading && <p role="status">Đang tải hóa đơn...</p>}
    {!loading && !visible.length && <div className="ui-card"><EmptyState message={rows.length ? 'Không có khoản nào phù hợp bộ lọc.' : 'Chưa có phiếu cọc hoặc hóa đơn nào.'} /></div>}
    {visible.length > 0 && <div className="ui-card cinv-table-wrap"><table className="cinv-table">
      <thead><tr><th>Mã</th><th>Kỳ</th><th>Loại</th><th>Số tiền</th><th>Hạn thanh toán</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
      <tbody>{visible.map((row) => <tr key={row.key}>
        <td data-label="Mã"><strong>{row.id}</strong></td>
        <td data-label="Kỳ">{periodLabel(row.period)}</td>
        <td data-label="Loại"><span className={`cinv-type cinv-type--${row.kind === 'deposit' ? 'deposit' : 'period'}`}>{row.loai}</span></td>
        <td data-label="Số tiền"><strong>{money(row.amount)}</strong></td>
        <td data-label="Hạn thanh toán">{dateLabel(row.due)}</td>
        <td data-label="Trạng thái"><StatusBadge status={row.status} /></td>
        <td data-label="Hành động"><div className="cinv-actions">
          <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" aria-label={`Xem ${row.id}`} onClick={() => open(row)}><Icon name="visibility" /></button>
          {row.canPay && <button type="button" className="ui-btn ui-btn--primary ui-btn--sm" onClick={() => open(row)}><Icon name="payments" /> Thanh toán</button>}
        </div></td>
      </tr>)}</tbody>
    </table></div>}
  </section>;
}
