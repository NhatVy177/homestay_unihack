import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { datCocApi } from '../datCoc/datCoc.api.js';
import { thuTienMatApi } from './thuTienMat.api.js';
import { Icon } from '../../components/common/Icon.jsx';
import ListSearch, { ListCount } from '../../components/common/ListSearch.jsx';
import TableState from '../../components/common/TableState.jsx';
import './thuTienMat.css';

const formatTien = (v) => `${Number(v || 0).toLocaleString('vi-VN')} đ`;
const LOAI_NHAN = { 'dat-coc': 'Đặt cọc', 'nhan-phong': 'Nhận phòng' };
const formatHan = (value) => (value ? new Date(value).toLocaleString('vi-VN') : '—');

// D-080: kế toán thu tiền mặt cho hóa đơn đặt cọc và nhận phòng. Chọn hóa đơn, xem rõ thông tin,
// nhập số tiền đã nhận (phải đúng số cần thu). Phần "Sale đã thu, chờ nộp quỹ" chỉ hiện khi còn phiếu cũ.
export default function TienMatChoNopQuyTab() {
  const [rows, setRows] = useState([]);
  const [legacy, setLegacy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [fundBusy, setFundBusy] = useState('');

  const load = useCallback(async () => {
    try {
      const [invoices, funds] = await Promise.all([thuTienMatApi.danhSach(), datCocApi.tienMatChoNopQuy().catch(() => ({ data: [] }))]);
      setRows(invoices.data || []);
      setLegacy(funds.data || []);
      setError('');
    } catch (e) { setError(e.response?.data?.message || 'Không tải được danh sách hóa đơn.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => [row.ma, row.hoTen, row.phong, row.soDienThoai, LOAI_NHAN[row.loai]].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [rows, search]);

  function open(row) { setSelected(row); setAmount(''); setFormError(''); }
  function close() { if (!busy) setSelected(null); }
  const typed = Number(String(amount).replace(/\D/g, '') || 0);

  async function submit(event) {
    event.preventDefault();
    if (!typed) { setFormError('Vui lòng nhập số tiền đã nhận.'); return; }
    if (typed !== Math.round(selected.soTien)) { setFormError(`Số tiền đã nhận phải đúng số cần thu ${formatTien(selected.soTien)}.`); return; }
    setBusy(true); setFormError('');
    try {
      await thuTienMatApi.ghiNhan({ loai: selected.loai, ma: selected.ma, soTienDaNhan: typed });
      setNotice(`Đã ghi nhận thu ${formatTien(typed)} tiền mặt cho hóa đơn ${LOAI_NHAN[selected.loai].toLowerCase()} ${selected.ma}.`);
      setSelected(null);
      await load();
    } catch (e) { setFormError(e.response?.data?.message || 'Chưa ghi nhận được khoản thu. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }

  async function fund(id) {
    setFundBusy(id);
    try { await datCocApi.ghiNhanNopQuy(id); await load(); }
    catch (e) { setError(e.response?.data?.message || 'Không ghi nhận được nộp quỹ'); }
    finally { setFundBusy(''); }
  }

  return <div className="ktp-container">
    <p className="tm-cash-intro">Chọn hóa đơn đặt cọc hoặc nhận phòng mà khách trả bằng tiền mặt, kiểm tra thông tin rồi nhập số tiền đã nhận.</p>
    {notice && <p role="status" className="tm-cash-notice">{notice}</p>}
    {error && rows.length > 0 && <p role="alert" className="ui-list-alert">{error}</p>}
    <div className="ui-list-toolbar">
      <ListSearch value={search} onChange={setSearch} placeholder="Mã hóa đơn, tên khách, số điện thoại hoặc phòng..." />
      <ListCount shown={shown.length} total={rows.length} noun="hóa đơn" />
    </div>
    <section className="ktp-table-section ui-list-table-card">
      <table className="ktp-table"><thead><tr><th>Loại hóa đơn</th><th>Mã</th><th>Khách</th><th>Phòng</th><th className="ui-num">Số cần thu</th><th>Hạn thanh toán</th><th className="ui-num">Thao tác</th></tr></thead>
        <tbody>{loading ? <TableState kind="loading" colSpan={7} />
          : error && !rows.length ? <TableState kind="error" colSpan={7} message={error} />
          : shown.length ? shown.map((row) => <tr key={`${row.loai}-${row.ma}`}>
            <td><span className="ui-badge">{LOAI_NHAN[row.loai]}</span></td>
            <td className="ui-cell-code">{row.ma}</td>
            <td><p className="ui-cell-main">{row.hoTen}</p><p className="ui-cell-sub">{row.soDienThoai}</p></td>
            <td>{row.phong || '—'}</td>
            <td className="ui-num">{formatTien(row.soTien)}</td>
            <td>{formatHan(row.hanThanhToan)}</td>
            <td className="ui-num"><button type="button" className="ui-btn ui-btn--primary ui-btn--sm" onClick={() => open(row)}>Thu tiền</button></td>
          </tr>) : <TableState kind="empty" colSpan={7} message={rows.length ? 'Không có hóa đơn khớp từ khóa.' : 'Không có hóa đơn đặt cọc hoặc nhận phòng nào đang chờ thu tiền mặt.'} />}</tbody>
      </table>
    </section>

    {legacy.length > 0 && <section className="ktp-table-section ui-list-table-card tm-cash-legacy">
      <h3>Tiền mặt Sale đã thu, chờ nộp quỹ</h3>
      <table className="ktp-table"><thead><tr><th>Phiếu</th><th>Khách</th><th>Phòng</th><th className="ui-num">Số tiền</th><th>Đã thu lúc</th><th className="ui-num">Thao tác</th></tr></thead>
        <tbody>{legacy.map((row) => <tr key={row.maPhieuDatCoc}>
          <td className="ui-cell-code">{row.maPhieuDatCoc}</td><td><p className="ui-cell-main">{row.hoTen}</p></td><td>{row.maPhong}</td>
          <td className="ui-num">{formatTien(row.soTienCoc)}</td><td>{formatHan(row.thuLuc)}</td>
          <td className="ui-num"><button type="button" className="ui-btn ui-btn--primary ui-btn--sm" disabled={fundBusy === row.maPhieuDatCoc} onClick={() => fund(row.maPhieuDatCoc)}>Đã nộp quỹ</button></td>
        </tr>)}</tbody>
      </table>
    </section>}

    {selected && <div className="ktp-modal-overlay" onClick={close}>
      <form className="ktp-modal tm-cash-modal" role="dialog" aria-modal="true" aria-label="Thu tiền mặt" onClick={(event) => event.stopPropagation()} onSubmit={submit}>
        <div className="ktp-modal-header">
          <div><h3>Thu tiền mặt</h3><p className="ktp-modal-header-sub">Hóa đơn {LOAI_NHAN[selected.loai].toLowerCase()} {selected.ma}</p></div>
          <button className="ktp-modal-close" type="button" onClick={close} aria-label="Đóng hộp thoại"><Icon name="close" /></button>
        </div>
        <div className="ktp-modal-body">
          <dl className="tm-cash-info">
            <div><dt>Loại hóa đơn</dt><dd>{LOAI_NHAN[selected.loai]}</dd></div>
            <div><dt>Mã hóa đơn</dt><dd>{selected.ma}</dd></div>
            <div><dt>Khách hàng</dt><dd>{selected.hoTen}</dd></div>
            <div><dt>Số điện thoại</dt><dd>{selected.soDienThoai || '—'}</dd></div>
            <div><dt>Phòng / giường</dt><dd>{selected.phong || '—'}</dd></div>
            {selected.hanThanhToan && <div><dt>Hạn thanh toán</dt><dd>{formatHan(selected.hanThanhToan)}</dd></div>}
            <div className="tm-cash-due"><dt>Số tiền cần thu</dt><dd>{formatTien(selected.soTien)}</dd></div>
          </dl>
          <label className="tm-cash-field">Số tiền đã nhận (đ)
            <input className="ui-input" inputMode="numeric" autoFocus value={amount} placeholder="Nhập số tiền thực nhận"
              onChange={(event) => { setAmount(event.target.value.replace(/\D/g, '')); setFormError(''); }} />
          </label>
          {typed > 0 && <p className="tm-cash-preview">= {formatTien(typed)}</p>}
          <p className="tm-cash-hint">Chỉ ghi nhận khi số tiền đã nhận đúng bằng số cần thu. Sau khi xác nhận, hóa đơn chuyển sang đã thanh toán.</p>
          {formError && <p role="alert" className="ui-evidence-error">{formError}</p>}
        </div>
        <div className="ktp-modal-footer">
          <button type="button" className="ui-btn ui-btn--secondary" onClick={close} disabled={busy}>Hủy</button>
          <button type="submit" className="ui-btn ui-btn--primary" disabled={busy || !typed}>{busy ? 'Đang ghi nhận…' : 'Xác nhận đã nhận tiền'}</button>
        </div>
      </form>
    </div>}
  </div>;
}
