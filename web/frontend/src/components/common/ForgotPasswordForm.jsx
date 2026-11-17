import React, { useEffect, useState } from 'react';
import { authApi } from '../../pages/auth/auth.api.js';
import { Icon } from './Icon.jsx';

// Quên mật khẩu: nhập email -> nhận mã OTP qua email -> nhập mã và mật khẩu mới -> quay lại đăng nhập.
export default function ForgotPasswordForm({ initialEmail = '', onBack, onReset }) {
  const [step, setStep] = useState('email'), [email, setEmail] = useState(initialEmail), [otp, setOtp] = useState('');
  const [matKhau, setMatKhau] = useState(''), [xacNhan, setXacNhan] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [wait, setWait] = useState(0);
  useEffect(() => {
    if (wait <= 0) return undefined;
    const timer = setTimeout(() => setWait((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);
  const message = (e, fallback) => e?.response?.data?.message || fallback;

  async function sendCode(event) {
    event?.preventDefault(); setError(''); setBusy(true);
    try { await authApi.quenMatKhau(email.trim()); setStep('otp'); setWait(45); }
    catch (e) { setError(message(e, 'Không gửi được mã lúc này.')); }
    finally { setBusy(false); }
  }
  async function reset(event) {
    event.preventDefault(); setError('');
    if (matKhau.length < 6) { setError('Mật khẩu mới phải có ít nhất 6 ký tự.'); return; }
    if (matKhau !== xacNhan) { setError('Mật khẩu xác nhận không khớp.'); return; }
    setBusy(true);
    try { await authApi.datLaiMatKhau({ email: email.trim(), otp: otp.trim(), matKhauMoi: matKhau }); onReset(email.trim()); }
    catch (e) { setError(message(e, 'Không đặt lại được mật khẩu.')); }
    finally { setBusy(false); }
  }

  return <form className="tc-modal-form" onSubmit={step === 'email' ? sendCode : reset}>
    <div className="tc-modal-header">
      <span className="tc-modal-emoji ui-auth-symbol"><Icon name="lock" /></span>
      <h2>Quên mật khẩu</h2>
      <p>{step === 'email' ? 'Nhập email đã đăng ký, chúng tôi sẽ gửi mã OTP để bạn đặt mật khẩu mới.' : `Mã OTP đã được gửi tới ${email}. Mã có hiệu lực 10 phút.`}</p>
    </div>
    {error && <div className="tc-modal-error" role="alert">{error}</div>}
    <label className="tc-form-field">
      <span>Email</span>
      <span className="ui-field-control"><Icon name="mail" />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@example.com" required autoComplete="email" readOnly={step === 'otp'} />
      </span>
    </label>
    {step === 'otp' && <>
      <label className="tc-form-field"><span>Mã OTP</span>
        <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="6 chữ số" required autoComplete="one-time-code" />
      </label>
      <div className="tc-form-row">
        <label className="tc-form-field"><span>Mật khẩu mới</span>
          <input type="password" value={matKhau} onChange={(e) => setMatKhau(e.target.value)} placeholder="••••••••" required autoComplete="new-password" /></label>
        <label className="tc-form-field"><span>Xác nhận mật khẩu</span>
          <input type="password" value={xacNhan} onChange={(e) => setXacNhan(e.target.value)} placeholder="••••••••" required autoComplete="new-password" /></label>
      </div>
    </>}
    <button className="tc-modal-submit" type="submit" disabled={busy}>
      {busy ? 'Đang xử lý...' : step === 'email' ? 'Gửi mã OTP' : 'Đặt lại mật khẩu'}
    </button>
    <p className="tc-modal-switch">
      {step === 'otp' && <><button type="button" disabled={wait > 0 || busy} onClick={sendCode}>{wait > 0 ? `Gửi lại mã (${wait}s)` : 'Gửi lại mã'}</button>{' · '}</>}
      <button type="button" onClick={onBack}>Quay lại đăng nhập</button>
    </p>
  </form>;
}
