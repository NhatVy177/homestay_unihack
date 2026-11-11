import React, { useEffect, useState } from 'react';
import { httpClient } from '../../api/httpClient.js';

export default function DepositPolicyPanel({ depositId }) {
  const [policy, setPolicy] = useState(null), [error, setError] = useState('');
  const [busy, setBusy] = useState(false), [accepted, setAccepted] = useState(false);
  useEffect(() => {
    let active = true;
    setPolicy(null); setError(''); setAccepted(false); setBusy(false);
    httpClient.get(`/hop-dong/phieu-coc/${encodeURIComponent(depositId)}/chinh-sach`)
      .then(r => { if (active) setPolicy(r.data); })
      .catch(e => { if (active) setError(e.response?.data?.message || 'Không tải được chính sách. Vui lòng mở lại phiếu cọc.'); });
    return () => { active = false; };
  }, [depositId]);
  async function confirm() {
    setBusy(true); setError('');
    try {
      const r = await httpClient.post(`/hop-dong/phieu-coc/${encodeURIComponent(depositId)}/chinh-sach/xac-nhan`, { version: policy.version });
      setPolicy(r.data);
    } catch (e) { setError(e.response?.data?.message || 'Chưa xác nhận được chính sách. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  return <section className="ui-card ui-evidence-panel" aria-label="Chính sách hoàn cọc">
    <h3>Chính sách hoàn cọc</h3>
    {error && <p role="alert" className="ui-evidence-error">{error}</p>}
    {!policy && !error && <p role="status">Đang tải chính sách...</p>}
    {policy && <>
      <p>Phiên bản chính sách: <strong>{policy.version}</strong></p>
      <p className="ui-preserve-lines">{policy.text}</p>
      {policy.requiresConfirmation && !policy.ready && <>
        <p>Đây là chính sách bổ sung cho hồ sơ cũ. Bạn cần đọc và xác nhận trước khi nhận bản bàn giao mới.</p>
        <label className="ui-evidence-consent"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} disabled={busy} /> Tôi đã đọc và đồng ý chính sách bổ sung này.</label>
        <button type="button" className="ui-btn ui-btn--primary" disabled={!accepted || busy} onClick={confirm}>{busy ? 'Đang xác nhận...' : 'Xác nhận chính sách'}</button>
      </>}
      {policy.requiresConfirmation && policy.ready && <p role="status">Bạn đã xác nhận chính sách bổ sung.</p>}
    </>}
  </section>;
}
