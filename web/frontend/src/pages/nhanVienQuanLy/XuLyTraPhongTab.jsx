import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '../../components/common/Icon.jsx';
import RepairHistoryPanel from '../../components/suaChua/RepairHistoryPanel.jsx';
import OverviewCards from '../../components/common/OverviewCards.jsx';
import StatusFilterTabs from '../../components/common/StatusFilterTabs.jsx';
import ListSearch from '../../components/common/ListSearch.jsx';
import TableState from '../../components/common/TableState.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import ListPagination from '../../components/common/ListPagination.jsx';
import { httpClient } from '../../api/httpClient.js';
import KiemTraTraPhong from './KiemTraTraPhong.jsx';
import XacNhanPhanHoi from './XacNhanPhanHoi.jsx';
import CheckoutLifecyclePanel from '../../components/checkout/CheckoutLifecyclePanel.jsx';
import './quanLyHopDong.css';

// "Quản lý hợp đồng" theo màn của nhóm Hằng: một danh sách hợp đồng của chi nhánh, lọc theo trạng thái
// (thay cho ba tab con trước đây). Việc ở bước trả phòng mở đúng màn xử lý có sẵn, lọc sẵn theo hợp đồng.
const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'cho-thanh-toan', label: 'Chờ thanh toán' },
  { key: 'hieu-luc', label: 'Đang hiệu lực' },
  { key: 'tra-phong', label: 'Đang trả phòng' },
  { key: 'het-han', label: 'Đã hết hạn' },
  { key: 'thanh-ly', label: 'Đã thanh lý' },
];
const STATUS = {
  'cho-thanh-toan': ['Chờ thanh toán kỳ đầu', 'warning'], 'hieu-luc': ['Đang hiệu lực', 'success'], 'tra-phong': ['Đang trả phòng', 'warning'],
  'het-han': ['Đã hết hạn', 'neutral'], 'thanh-ly': ['Đã thanh lý', 'danger'],
};
const ACTIONS = { 'kiem-tra': 'Kiểm tra trả phòng', 'phan-hoi': 'Xử lý phản hồi', 'ket-thuc': 'Kết thúc hợp đồng' };
const money = (v) => `${Math.round(Number(v) || 0).toLocaleString('vi-VN')}đ`;
const day = (v) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '—');
const PAGE = 10;

export default function XuLyTraPhongTab() {
  const [rows, setRows] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [filter, setFilter] = useState('all'), [query, setQuery] = useState(''), [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows((await httpClient.get('/hop-dong/quan-ly-chi-nhanh')).data || []); setError(''); }
    catch (e) { setError(e?.response?.data?.message || 'Chưa tải được danh sách hợp đồng.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => FILTERS.reduce((acc, f) => ({ ...acc, [f.key]: f.key === 'all' ? rows.length : rows.filter((r) => r.nhom === f.key).length }), {}), [rows]);
  const q = query.trim().toLocaleLowerCase('vi-VN');
  const visible = rows.filter((r) => (filter === 'all' || r.nhom === filter)
    && (!q || [r.maHopDong, r.hoTen, r.sdt, r.tenPhong].join(' ').toLocaleLowerCase('vi-VN').includes(q)));
  const hasAction = visible.some((r) => r.viecCanLam); // không có việc nào cần làm thì ẩn cả cột Hành động
  const current = Math.min(page, Math.max(1, Math.ceil(visible.length / PAGE)));
  const close = () => { setOpen(null); load(); };
  const pick = (key) => { setFilter(key); setPage(1); };

  return <div className="ktp-container qlhd-page">
    <header className="qlhd-head"><h2>Quản lý hợp đồng</h2>
      <p>Theo dõi hợp đồng của chi nhánh và xử lý các bước trả phòng: kiểm tra phòng, phản hồi đối soát, thu chìa khóa.</p></header>
    <OverviewCards counts={counts} activeKey={filter} onSelect={pick} items={[
      { key: 'all', label: 'Tổng số hợp đồng', icon: 'description' },
      { key: 'hieu-luc', label: 'Đang hiệu lực', icon: 'verified_user' },
      { key: 'tra-phong', label: 'Đang trả phòng', icon: 'pending_actions' },
      { key: 'thanh-ly', label: 'Đã thanh lý', icon: 'cancel' },
    ]} />
    <section className="ui-card qlhd-toolbar">
      <div className="ui-list-toolbar"><ListSearch value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="Tìm theo mã HĐ, tên KH, SĐT, phòng..." /></div>
      <StatusFilterTabs ariaLabel="Lọc hợp đồng theo trạng thái" items={FILTERS} counts={counts} activeKey={filter} onChange={pick} />
    </section>
    {error && <p className="checkout-error" role="alert">{error}</p>}
    <section className="ui-card qlhd-table-card">
      <div className="qlhd-table-wrap"><table className="ui-table qlhd-table">
        <thead><tr><th>Mã hợp đồng</th><th>Khách hàng</th><th>Phòng / Giường</th><th>Loại thuê</th><th className="num">Tiền thuê / tháng</th><th>Thời hạn</th><th>Trạng thái</th>{hasAction && <th>Hành động</th>}</tr></thead>
        <tbody>
          {loading ? <TableState kind="loading" colSpan={hasAction ? 8 : 7} />
            : !visible.length ? <TableState kind={error ? 'error' : 'empty'} colSpan={hasAction ? 8 : 7} message="Không tìm thấy hợp đồng nào." />
              : visible.slice((current - 1) * PAGE, current * PAGE).map((r) => {
                const [label, tone] = STATUS[r.nhom] || [r.trangThai, 'neutral'];
                const done = r.viecCanLam === 'ket-thuc' && r.nhom === 'thanh-ly' && r.daThuChiaKhoa;
                return <tr key={r.maHopDong}>
                  <td><strong className="qlhd-code">{r.maHopDong}</strong></td>
                  <td><strong>{r.hoTen}</strong><small>{r.sdt}</small></td>
                  <td><strong>{r.tenPhong}</strong>{r.giuong && <small>Giường {r.giuong}</small>}</td>
                  <td>{r.hinhThucThue}</td>
                  <td className="num">{money(r.giaThue)}</td>
                  <td>{day(r.ngayBatDau)}<small>đến {day(r.ngayKetThuc)}</small></td>
                  <td><StatusBadge status={label} tone={tone} />{r.nhom === 'thanh-ly' && !r.daThuChiaKhoa && <small className="qlhd-warn">Chưa thu chìa khóa</small>}</td>
                  {hasAction && <td>{r.viecCanLam
                    ? <button type="button" className={`ui-btn ui-btn--sm ${done ? 'ui-btn--secondary' : 'ui-btn--primary'}`} onClick={() => setOpen(r)}>{done ? 'Xem hồ sơ' : ACTIONS[r.viecCanLam]}</button>
                    : <span className="qlhd-none">—</span>}</td>}
                </tr>;
              })}
        </tbody>
      </table></div>
      <ListPagination page={current} pageSize={PAGE} total={visible.length} noun="hợp đồng" onChange={setPage} />
    </section>

    {open && <div className="ktp-modal-overlay qlhd-overlay" onClick={close}>
      <div className={`ktp-modal qlhd-modal${open.viecCanLam === 'ket-thuc' ? ' is-compact' : ''}`} role="dialog" aria-modal="true" aria-labelledby="qlhd-modal-title" onClick={(e) => e.stopPropagation()}>
        <div className="ktp-modal-header"><div><h3 id="qlhd-modal-title">{ACTIONS[open.viecCanLam]} · {open.maHopDong}</h3><p>{open.hoTen} · {open.tenPhong}</p></div>
          <button type="button" className="ktp-modal-close" aria-label="Đóng" onClick={close}><Icon name="close" /></button></div>
        <div className="qlhd-modal-body">
          {open.viecCanLam === 'kiem-tra' && <RepairHistoryPanel maHopDong={open.maHopDong} />}
          {open.viecCanLam === 'kiem-tra' && <KiemTraTraPhong focusPhieuTra={open.maPhieuTra} />}
          {open.viecCanLam === 'phan-hoi' && <XacNhanPhanHoi focusPhieuTra={open.maPhieuTra} />}
          {open.viecCanLam === 'ket-thuc' && <CheckoutLifecyclePanel focusContractId={open.maHopDong} />}
        </div>
      </div>
    </div>}
  </div>;
}
