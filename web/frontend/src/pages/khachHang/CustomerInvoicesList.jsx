import React, { useMemo, useState } from 'react';
import { Icon } from '../../components/common/Icon.jsx';
import StatusFilterTabs from '../../components/common/StatusFilterTabs.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import './customerInvoices.css';

// Bố cục, nhãn và cách tính theo màn "Hóa đơn của tôi" (dự án nhóm, InvoicesDashboardPage.tsx).
const MONTH_OPTIONS = [['Tất cả', 'Tất cả các tháng'], ...Array.from({ length: 12 }, (_, i) => {
  const m = String(i + 1).padStart(2, '0');
  return [m, `Tháng ${m}`];
})];
const TYPE_OPTIONS = ['Tất cả loại', 'Đặt cọc', 'Nhận phòng', 'Định kỳ', 'Dịch vụ', 'Phát sinh', 'Hoàn cọc'];
const STATUS_LABEL = { paid: 'Đã thanh toán', unpaid: 'Chờ thanh toán', pending: 'Chờ xác nhận', overdue: 'Quá hạn' };

const money = (value) => `${Math.round(Number(value) || 0).toLocaleString('vi-VN')} VNĐ`;
const dayOf = (value) => (value ? String(value).slice(0, 10) : '');
const dateLabel = (value) => (dayOf(value) ? dayOf(value).split('-').reverse().join('/') : '—');
const periodLabel = (ky) => (ky ? `Tháng ${ky.slice(5, 7)}/${ky.slice(0, 4)}` : '—');

// Gộp phiếu cọc và hóa đơn theo kỳ thành một danh sách. group: paid | unpaid | pending | overdue | other.
export function buildInvoiceRows({ deposits = [], invoices = [], firstCharges = [], today = new Date().toISOString().slice(0, 10) }) {
  const depositRows = deposits.map((item) => {
    const state = item.trangThai;
    const group = state === 'Chờ thanh toán' || state === 'Bị từ chối' ? 'unpaid' : state === 'Chờ xác nhận' ? 'pending'
      : state === 'Hoàn tất' ? 'paid' : state === 'Hết hạn' ? 'overdue' : 'other';
    const issued = dayOf(item.ngayLapPhieu || item.ngayLap || item.ngayDatCoc || item.thoiHanThanhToan);
    return { key: `coc-${item.maPhieuCoc}`, kind: 'deposit', id: item.maPhieuCoc, period: issued.slice(0, 7), loai: 'Đặt cọc',
      amount: item.soTienCoc, due: dayOf(item.thoiHanThanhToan), group, source: item, canPay: group === 'unpaid' };
  });
  const invoiceRows = invoices.map((item) => {
    const paid = item.trangThai === 'Đã TT';
    const late = !paid && (item.trangThai === 'Nợ' || (dayOf(item.ngayHanTT) && dayOf(item.ngayHanTT) < today));
    return { key: `hd-${item.maHoaDon}`, kind: 'invoice', id: item.maHoaDon, period: item.kyThanhToan,
      loai: item.loai === 'Kỳ đầu' ? 'Nhận phòng' : 'Định kỳ',
      // Đã gửi minh chứng thì chờ kế toán xác nhận (vẫn cho mở để gửi lại chứng từ khác).
      amount: item.tongTien, due: dayOf(item.ngayHanTT), group: paid ? 'paid' : item.daGuiMinhChung ? 'pending' : late ? 'overdue' : 'unpaid', source: item, canPay: !paid };
  });
  // Khoản thu kỳ đầu khi nhận phòng (tính lúc nhận phòng, trả bằng ví mô phỏng). Đã có hóa đơn kỳ đầu thì không thêm dòng trùng.
  const hasFirstInvoice = (contractId) => invoices.some((item) => item.maHopDong === contractId && item.loai === 'Kỳ đầu');
  const firstChargeRows = firstCharges.filter((item) => !hasFirstInvoice(item.refId)).map((item) => ({
    key: `kd-${item.refId}`, kind: 'firstCharge', id: `KD-${item.refId}`, period: dayOf(item.startDate).slice(0, 7), loai: 'Nhận phòng',
    amount: item.amountVnd, due: dayOf(item.startDate), group: item.status === 'Paid' ? 'paid' : 'unpaid', source: item, canPay: item.status === 'Pending' }));
  return [...depositRows, ...invoiceRows, ...firstChargeRows].sort((a, b) => String(b.period).localeCompare(String(a.period)) || String(b.id).localeCompare(String(a.id)));
}

function StatusPill({ group, status }) {
  const label = STATUS_LABEL[group] || status;
  return <span className={`cinv-status cinv-status--${group}`}>{label}</span>;
}

export default function CustomerInvoicesList({ deposits, invoices, firstCharges = [], loading, error, onOpenDeposit, onOpenContract, onPayFirstCharge, onPayInvoice }) {
  const rows = useMemo(() => buildInvoiceRows({ deposits, invoices, firstCharges }), [deposits, invoices, firstCharges]);
  const [group, setGroup] = useState('all'), [month, setMonth] = useState('Tất cả'), [year, setYear] = useState('Tất cả'), [loai, setLoai] = useState('Tất cả loại');
  const years = [...new Set(rows.map((row) => String(row.period).slice(0, 4)).filter(Boolean))].sort().reverse();
  const nowMonth = new Date().getMonth() + 1, nowYear = String(new Date().getFullYear()), nowKey = `${nowYear}-${String(nowMonth).padStart(2, '0')}`;

  // Thẻ tổng quan tính trên toàn bộ khoản, không theo bộ lọc (như màn mẫu).
  const open = rows.filter((row) => row.group === 'unpaid' || row.group === 'overdue');
  const dueDates = open.map((row) => row.due).filter(Boolean).sort();
  const monthTotal = rows.filter((row) => row.period === nowKey).reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const overdueCount = rows.filter((row) => row.group === 'overdue').length;

  const visible = rows.filter((row) => {
    if (group === 'unpaid' && row.group !== 'unpaid' && row.group !== 'pending') return false;
    if (group === 'paid' && row.group !== 'paid') return false;
    if (group === 'overdue' && row.group !== 'overdue') return false;
    if (month !== 'Tất cả' && String(row.period).slice(5, 7) !== month) return false;
    if (year !== 'Tất cả' && String(row.period).slice(0, 4) !== year) return false;
    if (loai !== 'Tất cả loại' && row.loai !== loai) return false;
    return true;
  });
  const openRow = (row) => (row.kind === 'deposit' ? onOpenDeposit(row.source) : row.kind === 'firstCharge' ? onOpenContract(row.source.refId) : onOpenContract(row.source.maHopDong));
  const payRow = (row) => (row.kind === 'firstCharge' && onPayFirstCharge ? onPayFirstCharge(row.source.refId)
    : row.kind === 'invoice' && onPayInvoice ? onPayInvoice(row.source) : openRow(row));

  return <section className="cinv-page" aria-label="Hóa đơn của tôi">
    <header className="cinv-head"><h2>Hóa đơn của tôi</h2><p>Tra cứu thông tin chi phí định kỳ và thực hiện thanh toán trực tuyến nhanh chóng.</p></header>
    <div className="cinv-cards">
      <article className="ui-card"><span className="cinv-icon"><Icon name="receipt_long" /></span><small>Hóa đơn chưa trả</small><strong>{String(open.length).padStart(2, '0')} <em>Hóa đơn</em></strong></article>
      <article className="ui-card"><span className="cinv-icon"><Icon name="payments" /></span><small>Tổng chi phí tháng {nowMonth}</small><strong>{Math.round(monthTotal).toLocaleString('vi-VN')} <em>VNĐ</em></strong></article>
      <article className="ui-card"><span className="cinv-icon"><Icon name="event_note" /></span><small>Hạn thanh toán gần nhất</small><strong>{dueDates.length ? dateLabel(dueDates[0]) : 'Không có'}</strong></article>
      <article className="ui-card"><span className="cinv-icon"><Icon name="check_circle" /></span><small>Hóa đơn quá hạn</small><strong className={overdueCount ? 'is-danger' : ''}>{overdueCount}</strong></article>
    </div>
    <div className="ui-card cinv-filters">
      <div className="cinv-selects">
        <select aria-label="Lọc theo tháng" value={month} onChange={(e) => setMonth(e.target.value)}>{MONTH_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select aria-label="Lọc theo năm" value={year} onChange={(e) => setYear(e.target.value)}><option value="Tất cả">Tất cả năm</option>{years.map((y) => <option key={y} value={y}>Năm {y}</option>)}</select>
        <select aria-label="Lọc theo loại" value={loai} onChange={(e) => setLoai(e.target.value)}>{TYPE_OPTIONS.map((label) => <option key={label} value={label}>{label}</option>)}</select>
      </div>
      <StatusFilterTabs ariaLabel="Lọc theo trạng thái thanh toán" activeKey={group} onChange={setGroup}
        items={[{ key: 'all', label: 'Tất cả' }, { key: 'unpaid', label: 'Chưa thanh toán' }, { key: 'paid', label: 'Đã thanh toán' }, { key: 'overdue', label: 'Quá hạn' }]} />
    </div>
    {error && <p className="customer-viewing-error" role="alert">{error}</p>}
    {loading && <p role="status">Đang tải hóa đơn...</p>}
    {!loading && !visible.length && <div className="ui-card"><EmptyState message={rows.length ? 'Không có khoản nào phù hợp bộ lọc.' : 'Chưa có phiếu cọc hoặc hóa đơn nào.'} /></div>}
    {visible.length > 0 && <div className="ui-card cinv-table-wrap"><table className="cinv-table">
      <thead><tr><th>Mã hóa đơn</th><th>Kỳ thanh toán</th><th>Loại</th><th>Số tiền</th><th>Hạn thanh toán</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
      <tbody>{visible.map((row) => <tr key={row.key}>
        <td data-label="Mã hóa đơn"><strong>{row.id}</strong></td>
        <td data-label="Kỳ thanh toán">{periodLabel(row.period)}</td>
        <td data-label="Loại"><span className={`cinv-type cinv-type--${row.kind === 'deposit' ? 'deposit' : 'period'}`}>{row.loai}</span></td>
        <td data-label="Số tiền"><strong>{money(row.amount)}</strong></td>
        <td data-label="Hạn thanh toán">{dateLabel(row.due)}</td>
        <td data-label="Trạng thái"><StatusPill group={row.group} status={row.kind} /></td>
        <td data-label="Hành động"><div className="cinv-actions">
          <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" aria-label={`Xem ${row.id}`} onClick={() => openRow(row)}><Icon name="visibility" /></button>
          {row.canPay && <button type="button" className="ui-btn ui-btn--primary ui-btn--sm" onClick={() => payRow(row)}><Icon name="payments" /> Thanh toán</button>}
        </div></td>
      </tr>)}</tbody>
    </table></div>}
  </section>;
}
