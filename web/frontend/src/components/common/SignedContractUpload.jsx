import React, { useEffect, useState } from 'react';
import { httpClient } from '../../api/httpClient.js';

export default function SignedContractUpload({ contractId }) {
  const [metadata, setMetadata] = useState(null), [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setMetadata(null); setFile(null);
    httpClient.get(`/hop-dong/${encodeURIComponent(contractId)}/ban-ky`)
      .then(r => { if (active) setMetadata(r.data); })
      .catch(e => { if (active) setError(e.response?.data?.message || 'Không tải được thông tin bản hợp đồng đã ký.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [contractId]);
  async function submit(e) {
    e.preventDefault(); setError('');
    if (!file || file.size > 5 * 1024 * 1024) { setError('Chọn ảnh hoặc PDF hợp đồng đã ký, tối đa 5 MB.'); return; }
    setBusy(true);
    try {
      const body = new FormData(); body.append('file', file);
      const r = await httpClient.post(`/hop-dong/${encodeURIComponent(contractId)}/ban-ky`, body, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMetadata(r.data); setFile(null); e.target.reset();
    } catch (err) { setError(err.response?.data?.message || 'Chưa lưu được bản hợp đồng. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  return <section className="ui-card ui-evidence-panel ui-no-print" aria-label="Bản hợp đồng đã ký">
    <h3>Bản hợp đồng đã ký</h3>
    <p>Tải bản chụp hoặc scan sau khi hai bên đã ký giấy. Bản gốc được lưu riêng, không nhúng vào gói bàn giao.</p>
    {loading && <p role="status">Đang tải...</p>}
    {error && <p role="alert" className="ui-evidence-error">{error}</p>}
    {!loading && !metadata && <p>Chưa có bản hợp đồng đã ký.</p>}
    {metadata && <p role="status">Đã lưu: {metadata.name}</p>}
    <form onSubmit={submit} className="ui-evidence-form">
      <label className="ui-form-field">Ảnh hoặc PDF hợp đồng (tối đa 5 MB)
        <input className="ui-input" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" disabled={busy || loading} onChange={e => setFile(e.target.files?.[0] || null)} />
      </label>
      <button className="ui-btn ui-btn--primary" type="submit" disabled={!file || busy || loading}>{busy ? 'Đang lưu...' : 'Lưu bản hợp đồng đã ký'}</button>
    </form>
  </section>;
}
