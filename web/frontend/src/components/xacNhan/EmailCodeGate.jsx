import React, { useState } from 'react';
import { ConfirmationNotice } from './ConfirmationFeedback.jsx';
import { errorMessage } from '../../lib/avalanche/api.js';
import './xacNhan.css';

/** D-015: one-time email code, shown only when the tenant first confirms. */
export default function EmailCodeGate({ signer, onCancel }) {
  const [email, setEmail] = useState(signer.accountEmail), [code, setCode] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const act = async fn => { setBusy(true); setError(''); try { await fn(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); } };
  return <div className="xn-form xn-gate">
    <strong>Xác nhận email trước khi ký</strong>
    <p className="xn-muted">Để bảo đảm đúng là bạn đang xác nhận, HomeStayDorm gửi một mã 6 số tới email của bạn. Bạn chỉ cần làm một lần trên trình duyệt này.</p>
    {!signer.codeSentTo ? <>
      {signer.accountEmail ? <p>Email: <strong>{signer.accountEmail}</strong></p>
        : <label>Email nhận mã (tài khoản chưa có email)<input type="text" value={email} onChange={e => setEmail(e.target.value)} /></label>}
      <div className="xn-actions">
        <button type="button" className="ui-btn ui-btn--primary" disabled={busy} onClick={() => act(() => signer.sendCode(email))}>{busy ? 'Đang gửi…' : 'Gửi mã'}</button>
        <button type="button" className="ui-btn ui-btn--secondary" disabled={busy} onClick={onCancel}>Hủy</button>
      </div>
    </> : <>
      <label>Mã đã gửi tới {signer.codeSentTo}<input type="text" inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="6 chữ số" /></label>
      <div className="xn-actions">
        <button type="button" className="ui-btn ui-btn--primary" disabled={busy || code.length !== 6} onClick={() => act(() => signer.verifyCode(code))}>{busy ? 'Đang kiểm tra…' : 'Xác nhận mã'}</button>
        <button type="button" className="xn-link" disabled={busy} onClick={() => act(() => signer.sendCode(signer.codeSentTo))}>Gửi lại mã</button>
        <button type="button" className="ui-btn ui-btn--secondary" disabled={busy} onClick={onCancel}>Hủy</button>
      </div>
    </>}
    {error && <ConfirmationNotice tone="danger">{error}</ConfirmationNotice>}
  </div>;
}
