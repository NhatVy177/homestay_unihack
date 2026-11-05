import React, { useCallback, useEffect, useState } from 'react';
import { HandoverView, Pill } from './DocumentView.jsx';
import { avalancheApi, dateTime, errorMessage, staffStateLabels } from '../../lib/avalanche/api.js';
import './xacNhan.css';
const order = { 'change-requested': 0, review: 1, 'handover-pending': 1, 'settlement-pending': 2, disputed: 2, active: 3, accepted: 4 };
const readFile = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve({ name: file.name, mediaType: file.type, dataBase64: String(reader.result).split(',')[1] });
  reader.onerror = reject; reader.readAsDataURL(file);
});
/** D-010/D-012: manager follows tenant confirmations and handles change requests in Web2. */
export default function QuanLyXacNhanTab() {
  const [config, setConfig] = useState(null), [cases, setCases] = useState([]), [unpublished, setUnpublished] = useState([]);
  const [selected, setSelected] = useState(null), [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const cfg = await avalancheApi.get('/config'); setConfig(cfg);
    if (!cfg.enabled) return;
    const [list, pending] = await Promise.all([avalancheApi.get('/cases'), avalancheApi.get('/handovers/unpublished')]);
    setCases(list.sort((a, b) => (order[a.state] ?? 9) - (order[b.state] ?? 9))); setUnpublished(pending);
  }, []);
  useEffect(() => { load().catch(e => setError(errorMessage(e))); }, [load]);
  const run = async (fn, done) => {
    setBusy(true); setError(''); setNotice('');
    try { await fn(); setNotice(done); await load(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  if (config && !config.enabled) return <div className="xn-card"><p className="xn-muted">Chức năng xác nhận điện tử chưa được bật trên máy chủ. Biên bản Web2 vẫn lập bình thường.</p></div>;
  const current = cases.find(c => c.id === selected);
  return <div className="ktp-container">
    {error && <div className="xn-alert error" role="alert">{error}</div>}
    {notice && <div className="xn-alert ok" role="status">{notice}</div>}
    <p className="xn-muted">Sau khi lập biên bản bàn giao, hệ thống tự gửi bản xem cho khách qua tài khoản và email. Khách tự xác nhận hoặc yêu cầu chỉnh sửa; nhân viên không xác nhận thay khách.</p>
    <h3 className="xn-section-title">Hồ sơ bàn giao/đối soát của chi nhánh</h3>
    <div className="xn-list">
      {!cases.length && <p className="xn-muted">Chưa có hồ sơ nào.</p>}
      {cases.map(c => {
        const draft = c.drafts?.[c.drafts.length - 1];
        return <div key={c.id} className={'xn-list-item' + (c.id === selected ? ' is-active' : '')}>
          <div><strong>Hợp đồng {c.contractId}</strong> · biên bản {c.sourceId} · bản số {c.handover?.revision ?? draft?.revision}
            <div className="xn-muted">Phát hành {dateTime(draft?.publishedAt)}{c.notifications?.length ? ` · email gần nhất: ${dateTime(c.notifications.at(-1).at)} (${c.notifications.at(-1).status})` : ''}</div></div>
          <div className="xn-actions"><Pill label={staffStateLabels[c.state]} />
            <button type="button" className="xn-btn secondary" onClick={() => setSelected(c.id === selected ? null : c.id)}>{c.id === selected ? 'Đóng' : 'Xem'}</button></div>
        </div>;
      })}
    </div>
    {current && <CaseDetail key={current.id + current.revision} c={current} busy={busy} run={run} />}
    {unpublished.length > 0 && <>
      <h3 className="xn-section-title">Biên bản chưa gửi khách xác nhận</h3>
      <p className="xn-muted">Các biên bản lập trước khi bật xác nhận điện tử, hoặc lần gửi tự động chưa thành công.</p>
      <div className="xn-list">{unpublished.map(u => <div key={u.sourceId} className="xn-list-item">
        <div><strong>{u.sourceId}</strong> · hợp đồng {u.contractId} · {u.customerName}<div className="xn-muted">Bàn giao {dateTime(u.handoverDate)}</div></div>
        <button type="button" className="xn-btn" disabled={busy} onClick={() => run(() => avalancheApi.post('/cases', { sourceId: u.sourceId }), `Đã gửi biên bản ${u.sourceId} cho khách xem.`)}>Gửi khách xác nhận</button>
      </div>)}</div>
    </>}
  </div>;
}
function CaseDetail({ c, busy, run }) {
  const draft = c.drafts[c.drafts.length - 1];
  const editable = ['review', 'change-requested'].includes(c.state) && !c.handover && !c.pending;
  const [inventory, setInventory] = useState(draft.handover.payload.inventory);
  const [notes, setNotes] = useState(draft.handover.payload.notes || '');
  const [resolution, setResolution] = useState(''), [attachments, setAttachments] = useState(undefined), [editing, setEditing] = useState(c.state === 'change-requested');
  const update = (i, field, value) => setInventory(items => items.map((item, n) => n === i ? { ...item, [field]: value } : item));
  return <article className="xn-card">
    <div className="xn-head"><div><h3>Hợp đồng {c.contractId} — bản số {draft.revision}</h3><p>Khách: {c.customerId}</p></div><Pill label={staffStateLabels[c.state]} /></div>
    {c.state === 'change-requested' && <div className="xn-alert error">Khách yêu cầu chỉnh sửa ({dateTime(draft.changeRequest?.at)}): “{draft.changeRequest?.reason}”</div>}
    {!editing && <HandoverView policy={(c.handover?.documents || draft).policy} handover={(c.handover?.documents || draft).handover} />}
    {editable && editing && <div className="xn-form">
      <table className="xn-table"><thead><tr><th>Tài sản</th><th>SL</th><th>Tình trạng lúc nhận phòng</th></tr></thead>
        <tbody>{inventory.map((item, i) => <tr key={i}><td>{item.item}</td>
          <td style={{ width: 80 }}><input type="number" min="0" step="1" value={item.quantity} onChange={e => update(i, 'quantity', Number(e.target.value))} /></td>
          <td><input type="text" maxLength={500} value={item.condition} onChange={e => update(i, 'condition', e.target.value)} /></td></tr>)}</tbody></table>
      <label>Ghi chú chung<textarea rows={2} maxLength={2000} value={notes} onChange={e => setNotes(e.target.value)} /></label>
      <label>Ảnh hiện trạng (thay bộ ảnh hiện có, tổng tối đa 4 MB)<input type="file" accept="image/png,image/jpeg,image/webp" multiple
        onChange={async e => setAttachments(await Promise.all(Array.from(e.target.files || []).slice(0, 10).map(readFile)))} /></label>
      <label>Nội dung đã điều chỉnh (khách sẽ thấy)<input type="text" maxLength={1000} value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Ví dụ: bổ sung vết rách góc nệm theo phản hồi của khách." /></label>
      <div className="xn-actions">
        <button type="button" className="xn-btn" disabled={busy || !resolution.trim()} onClick={() => run(() => avalancheApi.post(`/cases/${c.id}/revise`, { inventory, notes, resolution, ...(attachments ? { attachments } : {}) }), 'Đã phát hành bản mới cho khách xem.')}>Phát hành bản mới cho khách</button>
        <button type="button" className="xn-btn secondary" disabled={busy} onClick={() => setEditing(false)}>Hủy</button>
      </div>
    </div>}
    <div className="xn-actions">
      {editable && !editing && <button type="button" className="xn-btn secondary" onClick={() => setEditing(true)}>Chỉnh sửa và phát hành bản mới</button>}
      {['review', 'handover-pending', 'settlement-pending'].includes(c.state) && <button type="button" className="xn-btn secondary" disabled={busy} onClick={() => run(() => avalancheApi.post(`/cases/${c.id}/remind`), 'Đã gửi email nhắc khách.')}>Gửi email nhắc khách</button>}
      {c.pending && <button type="button" className="xn-btn secondary" disabled={busy} onClick={() => run(() => avalancheApi.post(`/cases/${c.id}/sync`), 'Đã cập nhật trạng thái.')}>Cập nhật trạng thái ghi nhận</button>}
    </div>
    {c.drafts.length > 1 && <details className="xn-history"><summary>Lịch sử phiên bản ({c.drafts.length})</summary>
      <ol>{c.drafts.map(d => <li key={d.revision}>Bản {d.revision} ({dateTime(d.publishedAt)}){d.resolution ? ` — điều chỉnh: ${d.resolution}` : ''}{d.changeRequest ? ` — khách yêu cầu: “${d.changeRequest.reason}”` : ''}</li>)}</ol>
    </details>}
  </article>;
}
