import React, { useEffect, useRef, useState } from 'react';
import { httpClient } from '../../api/httpClient.js';
import { Icon } from './Icon.jsx';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = 'image/png,image/jpeg,image/webp,application/pdf';
const sizeLabel = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

export default function SignedContractUpload({ contractId }) {
  const [metadata, setMetadata] = useState(null), [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const input = useRef(null);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setMetadata(null); setFile(null);
    httpClient.get(`/hop-dong/${encodeURIComponent(contractId)}/ban-ky`)
      .then(r => { if (active) setMetadata(r.data); })
      .catch(e => { if (active) setError(e.response?.data?.message || 'Không tải được thông tin bản hợp đồng đã ký.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [contractId]);
  function choose(next) {
    setError('');
    if (next && next.size > MAX_BYTES) { setFile(null); setError('Tệp lớn hơn 5 MB. Hãy chọn ảnh hoặc PDF nhỏ hơn.'); return; }
    setFile(next || null);
  }
  function clear() { setFile(null); if (input.current) input.current.value = ''; }
  function drop(e) {
    e.preventDefault(); setDragging(false);
    if (busy || loading) return;
    choose(e.dataTransfer.files?.[0]);
  }
  async function submit(e) {
    e.preventDefault(); setError('');
    if (!file || file.size > MAX_BYTES) { setError('Chọn ảnh hoặc PDF hợp đồng đã ký, tối đa 5 MB.'); return; }
    setBusy(true);
    try {
      const body = new FormData(); body.append('file', file);
      const r = await httpClient.post(`/hop-dong/${encodeURIComponent(contractId)}/ban-ky`, body, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMetadata(r.data); clear();
    } catch (err) { setError(err.response?.data?.message || 'Chưa lưu được bản hợp đồng. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  const stateLabel = loading ? 'Đang tải…' : metadata ? 'Đã lưu' : 'Chưa có';
  return <section className="ui-card ui-signed-upload ui-no-print" aria-label="Bản hợp đồng đã ký">
    <header className="ui-signed-head">
      <span className="ui-heading-symbol"><Icon name="description" /></span>
      <div>
        <h3>Bản hợp đồng đã ký</h3>
        <p>Tải bản chụp hoặc scan sau khi hai bên đã ký giấy. Bản gốc được lưu riêng, không nhúng vào gói bàn giao.</p>
      </div>
      <span className={`ui-signed-state${metadata ? ' is-saved' : ''}`}>{stateLabel}</span>
    </header>
    {error && <p role="alert" className="ui-evidence-error">{error}</p>}
    {metadata && <p className="ui-signed-saved" role="status"><Icon name="check_circle" /><span title={metadata.name}>Đã lưu: {metadata.name}</span></p>}
    <form onSubmit={submit} className="ui-signed-form">
      <label
        className={`ui-file-drop${dragging ? ' is-dragging' : ''}${file ? ' has-file' : ''}${busy || loading ? ' is-disabled' : ''}`}
        onDragOver={(e) => { e.preventDefault(); if (!busy && !loading) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
      >
        <input ref={input} className="ui-file-drop-input" type="file" accept={ACCEPT} disabled={busy || loading} onChange={(e) => choose(e.target.files?.[0])} />
        <Icon name="cloud_upload" />
        {file
          ? <span className="ui-file-drop-copy"><strong title={file.name}>{file.name}</strong><small>{sizeLabel(file.size)} · bấm để chọn tệp khác</small></span>
          : <span className="ui-file-drop-copy"><strong>{metadata ? 'Chọn bản mới để thay thế' : 'Chọn ảnh hoặc PDF hợp đồng'}</strong><small>hoặc kéo thả vào đây · PNG, JPG, WebP, PDF, tối đa 5 MB</small></span>}
      </label>
      <div className="ui-signed-actions">
        {file && <button className="ui-btn ui-btn--secondary" type="button" onClick={clear} disabled={busy}>Bỏ chọn</button>}
        <button className="ui-btn ui-btn--primary" type="submit" disabled={!file || busy || loading}>{busy ? 'Đang lưu...' : metadata ? 'Thay bản đã lưu' : 'Lưu bản hợp đồng đã ký'}</button>
      </div>
    </form>
  </section>;
}
