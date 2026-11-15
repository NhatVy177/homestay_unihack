import React, { useEffect, useState } from 'react';
import ListSearch from '../common/ListSearch.jsx';
import ListPagination from '../common/ListPagination.jsx';
import TableState from '../common/TableState.jsx';
import StatusBadge from '../common/StatusBadge.jsx';
import { actOnClosure, closureError, downloadClosure, listClosures, uploadContactEvidence } from './checkoutClosure.api.js';
import './checkoutClosure.css';

export default function CheckoutLifecyclePanel({ focusContractId = null } = {}) {
  const [rows, setRows] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [query, setQuery] = useState(''), [page, setPage] = useState(1), [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null), [reason, setReason] = useState(''), [file, setFile] = useState(null);
  async function load() {
    setLoading(true);
    try { setRows((await listClosures()).filter(row => row.hasReturn)); setError(''); }
    catch (e) { setError(closureError(e)); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  async function run(action) {
    setBusy(true); setError('');
    try { await action(); await load(); } catch (e) { setError(closureError(e)); } finally { setBusy(false); }
  }
  const filtered = rows.filter(row => !focusContractId || row.contractId === focusContractId).filter(row => `${row.contractId} ${row.settlementId || ''}`.toLowerCase().includes(query.toLowerCase()));
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / 10)));
  return <section className="checkout-lifecycle">
    <div className="checkout-heading"><div><h2>Kết thúc hợp đồng</h2><p>Hệ thống tự thanh lý khi khách đã đồng ý trên chuỗi và đủ thu/hoàn, chứng từ. Thu chìa khóa được ghi nhận riêng.</p></div><button className="ui-btn ui-btn--secondary" disabled={busy || loading} onClick={load}>Tải lại</button></div>
    {error && <p className="checkout-error" role="alert">{error}</p>}
    <div className="ui-list-toolbar"><ListSearch value={query} onChange={value => { setQuery(value); setPage(1); }} placeholder="Tìm mã hợp đồng, mã đối soát..." /></div>
    <div className="checkout-table-wrap"><table className="ui-table"><thead><tr><th>Hợp đồng</th><th>Thu / hoàn</th><th>Trạng thái</th><th>Chìa khóa</th><th>Thao tác</th></tr></thead><tbody>
      {loading ? <TableState kind="loading" colSpan={5} /> : !filtered.length ? <TableState kind={error ? 'error' : 'empty'} colSpan={5} /> : filtered.slice((current - 1) * 10, current * 10).map(row => <tr key={row.contractId}>
        <td><strong>{row.contractId}</strong><p>{row.settlementId || 'Chưa có đối soát'}</p></td>
        <td>{row.money.ready ? <StatusBadge status="Đủ điều kiện" tone="success" /> : <ul className="checkout-missing">{row.money.missing.map(text => <li key={text}>{text}</li>)}</ul>}</td>
        <td><StatusBadge status={row.closed ? 'Đã thanh lý' : row.response.overdue ? 'Quá hạn phản hồi' : 'Chờ hoàn tất'} tone={row.closed ? 'success' : 'warning'} />{row.mode === 'without-consent' && <p>Đóng không có xác nhận của khách</p>}{row.closed && <p>Email: {row.mailStatus === 'sent' ? 'Đã gửi' : 'Đang chờ gửi / gửi lại'}</p>}</td>
        <td>{row.keysReturnedAt ? 'Đã thu chìa khóa' : 'Chưa thu chìa khóa'}</td>
        <td><div className="checkout-actions">
          {row.canReturnKeys && <button className="ui-btn ui-btn--secondary ui-btn--sm" disabled={busy} onClick={() => { if (window.confirm(`Xác nhận đã nhận chìa khóa của ${row.contractId}? Phòng/giường sẽ được giải phóng.`)) run(() => actOnClosure(row.contractId, 'keys-returned')); }}>Đã thu chìa khóa</button>}
          {!row.closed && <button className="ui-btn ui-btn--secondary ui-btn--sm" disabled={busy} onClick={() => run(() => actOnClosure(row.contractId, 'reconcile'))}>Kiểm tra điều kiện</button>}
          {!row.closed && row.exception.allowed && <>
            <button className="ui-btn ui-btn--secondary ui-btn--sm" disabled={busy} onClick={() => { setSelected(row); setReason(''); setFile(null); }}>Lý do và bằng chứng liên hệ</button>
            <button className="ui-btn ui-btn--danger ui-btn--sm" disabled={busy || !row.canCloseWithoutConsent} title={row.money.missing.join(' ') || (!row.exceptionPrepared ? 'Cần lưu lý do và bằng chứng liên hệ.' : '')} onClick={() => { if (window.confirm(`Đóng ${row.contractId} không có xác nhận của khách?`)) run(() => actOnClosure(row.contractId, 'close-without-consent')); }}>Thanh lý không có xác nhận của khách</button>
            {!row.exceptionPrepared && <small>Cần lưu lý do và bằng chứng liên hệ trước khi xử lý tiền.</small>}
          </>}
          {row.closed && <button className="ui-btn ui-btn--primary ui-btn--sm" disabled={busy} onClick={() => run(() => downloadClosure(row.contractId))}>Tải gói bằng chứng</button>}
        </div></td>
      </tr>)}
    </tbody></table></div>
    <ListPagination page={current} pageSize={10} total={filtered.length} noun="hợp đồng" onChange={setPage} />
    {selected && <div className="checkout-overlay"><form className="ui-card checkout-dialog" role="dialog" aria-modal="true" aria-labelledby="closure-reason-title" onSubmit={event => { event.preventDefault(); run(async () => { const proof = await uploadContactEvidence(selected.contractId, file); await actOnClosure(selected.contractId, 'prepare-exception', { reason, proofId: proof.id }); setSelected(null); }); }}>
      <h3 id="closure-reason-title">Hồ sơ xử lý không có xác nhận · {selected.contractId}</h3>
      <p>{selected.exception.reason} Thao tác này lưu căn cứ và chuyển xử lý thu/hoàn; hợp đồng chỉ được đóng sau khi đủ tiền và chứng từ.</p>
      <label>Lý do và nội dung đã liên hệ<textarea className="ui-textarea" required maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} /></label>
      <label>Bằng chứng liên hệ (ảnh hoặc PDF, tối đa 5 MB)<input className="ui-input" type="file" required accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} /></label>
      {error && <p className="checkout-error" role="alert">{error}</p>}
      <div className="checkout-actions"><button type="button" className="ui-btn ui-btn--secondary" disabled={busy} onClick={() => setSelected(null)}>Đóng</button><button className="ui-btn ui-btn--primary" disabled={busy || !file || !reason.trim()}>Lưu hồ sơ và chuyển xử lý tiền</button></div>
    </form></div>}
  </section>;
}
