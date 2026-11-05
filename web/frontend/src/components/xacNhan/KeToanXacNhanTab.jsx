import React, { useCallback, useEffect, useState } from 'react';
import { SettlementView, Pill } from './DocumentView.jsx';
import { avalancheApi, dateTime, errorMessage, money, staffStateLabels } from '../../lib/avalanche/api.js';
import './xacNhan.css';
/** D-012: accountant sends an existing Web2 settlement to the tenant; no IDs typed by hand. */
export default function KeToanXacNhanTab() {
  const [config, setConfig] = useState(null), [cases, setCases] = useState([]), [selected, setSelected] = useState(null);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const cfg = await avalancheApi.get('/config'); setConfig(cfg);
    if (cfg.enabled) setCases((await avalancheApi.get('/cases')).filter(c => !['review', 'change-requested', 'handover-pending'].includes(c.state)));
  }, []);
  useEffect(() => { load().catch(e => setError(errorMessage(e))); }, [load]);
  const run = async (fn, done) => {
    setBusy(true); setError(''); setNotice('');
    try { await fn(); setNotice(done); await load(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  if (config && !config.enabled) return <div className="xn-card"><p className="xn-muted">Chức năng xác nhận điện tử chưa được bật trên máy chủ.</p></div>;
  const current = cases.find(c => c.id === selected);
  return <div className="ktp-container">
    {error && <div className="xn-alert error" role="alert">{error}</div>}
    {notice && <div className="xn-alert ok" role="status">{notice}</div>}
    <p className="xn-muted">Gửi bảng đối soát đã lập trong “Quyết toán trả phòng” để khách xem và đồng ý. Khi khách phản hồi, điều chỉnh đối soát trong Web2 rồi gửi phiên bản mới; phiên bản cũ vẫn được giữ.</p>
    <div className="xn-list">
      {!cases.length && <p className="xn-muted">Chưa có hợp đồng nào đã xác nhận bàn giao.</p>}
      {cases.map(c => <div key={c.id} className={'xn-list-item' + (c.id === selected ? ' is-active' : '')}>
        <div><strong>Hợp đồng {c.contractId}</strong> · {c.versions.length ? `đối soát phiên bản ${c.versions.length}` : 'chưa gửi đối soát'}</div>
        <div className="xn-actions"><Pill label={staffStateLabels[c.state]} />
          <button type="button" className="xn-btn secondary" onClick={() => setSelected(c.id === selected ? null : c.id)}>{c.id === selected ? 'Đóng' : 'Xem'}</button></div>
      </div>)}
    </div>
    {current && <SettlementCase key={current.id + current.revision} c={current} busy={busy} run={run} />}
  </div>;
}
function SettlementCase({ c, busy, run }) {
  const [statements, setStatements] = useState(null), [choice, setChoice] = useState(''), [error, setError] = useState('');
  const canPublish = ['active', 'disputed'].includes(c.state) && !c.pending;
  useEffect(() => {
    if (canPublish) avalancheApi.get(`/cases/${c.id}/statements`).then(setStatements).catch(e => setError(errorMessage(e)));
  }, [c.id, canPublish]);
  const latest = c.versions[c.versions.length - 1];
  return <article className="xn-card">
    <div className="xn-head"><div><h3>Hợp đồng {c.contractId}</h3><p>Tiền cọc ghi nhận: {money(c.depositHeldVnd)}</p></div><Pill label={staffStateLabels[c.state]} /></div>
    {latest && <><SettlementView bundle={latest.bundle} />
      {latest.dispute && <div className="xn-alert error">Khách phản hồi phiên bản {latest.bundle.version}: “{latest.dispute.payload.reason}”</div>}</>}
    {canPublish && <div className="xn-form">
      <strong>{c.state === 'disputed' ? 'Gửi phiên bản mới sau khi điều chỉnh' : 'Chọn bảng đối soát để gửi khách'}</strong>
      {error && <div className="xn-alert error">{error}</div>}
      {statements && !statements.length && <p className="xn-muted">Chưa có bảng đối soát nào cho hợp đồng này trong Web2.</p>}
      {statements?.map(s => <label key={s.sourceId} style={{ flexDirection: 'row', alignItems: 'center', fontWeight: 400 }}>
        <input type="radio" name={'ds-' + c.id} value={s.sourceId} checked={choice === s.sourceId} onChange={() => setChoice(s.sourceId)} />
        {s.sourceId} · lập {dateTime(s.createdAt)} · khấu trừ {money(s.deductionsVnd)} · hoàn {money(s.refundDueVnd)}{Number(s.topUpDueVnd) > 0 ? ` · thu thêm ${money(s.topUpDueVnd)}` : ''}{s.published ? ' (đã gửi trước đó)' : ''}
      </label>)}
      <div className="xn-actions"><button type="button" className="xn-btn" disabled={busy || !choice}
        onClick={() => run(() => avalancheApi.post(`/cases/${c.id}/settlements`, { sourceId: choice }), 'Đã gửi bảng đối soát cho khách xem.')}>Gửi khách xác nhận</button></div>
    </div>}
    {c.pending && <button type="button" className="xn-btn secondary" disabled={busy} onClick={() => run(() => avalancheApi.post(`/cases/${c.id}/sync`), 'Đã cập nhật trạng thái.')}>Cập nhật trạng thái ghi nhận</button>}
  </article>;
}
