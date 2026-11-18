import React, { useState } from 'react';
import './momoSim.css';

// Ví điện tử mô phỏng kiểu ví di động: nhập số điện thoại, nhập mã xác nhận 6 số rồi mới trừ (mô phỏng). Không gọi cổng thật.
export default function MomoSimPanel({ content, amount, busy, onConfirm }) {
  const [step, setStep] = useState('phone'), [phone, setPhone] = useState(''), [pin, setPin] = useState(''), [error, setError] = useState('');
  const next = () => {
    if (!/^0\d{9}$/.test(phone)) { setError('Số điện thoại gồm 10 số, bắt đầu bằng 0.'); return; }
    setError(''); setStep('pin');
  };
  const confirm = () => {
    if (!/^\d{6}$/.test(pin)) { setError('Mã xác nhận gồm 6 số (nhập số bất kỳ để thử).'); return; }
    setError(''); onConfirm();
  };
  return <div className="momo-sim">
    <header className="momo-sim-head">
      <span className="momo-sim-mark" aria-hidden="true">M</span>
      <div><strong>Ví MoMo</strong><small>Mô phỏng · không trừ tiền thật</small></div>
    </header>
    <dl className="momo-sim-order">
      <div><dt>Nội dung</dt><dd>{content}</dd></div>
      <div><dt>Số tiền</dt><dd className="momo-sim-amount">{Number(amount).toLocaleString('vi-VN')} VNĐ</dd></div>
    </dl>
    {step === 'phone'
      ? <label className="momo-sim-field">Số điện thoại ví
        <input className="ui-input" inputMode="tel" maxLength={10} placeholder="0901234567" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />
      </label>
      : <label className="momo-sim-field">Mã xác nhận (6 số) gửi tới {phone}
        <input className="ui-input" inputMode="numeric" maxLength={6} placeholder="••••••" type="password" autoFocus value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
      </label>}
    {error && <p className="momo-sim-error" role="alert">{error}</p>}
    {step === 'phone'
      ? <button type="button" className="momo-sim-btn" onClick={next}>Tiếp tục</button>
      : <>
        <button type="button" className="momo-sim-btn" disabled={busy} onClick={confirm}>{busy ? 'Đang xử lý…' : `Thanh toán ${Number(amount).toLocaleString('vi-VN')} VNĐ`}</button>
        <button type="button" className="momo-sim-link" disabled={busy} onClick={() => { setStep('phone'); setPin(''); setError(''); }}>Đổi số điện thoại</button>
      </>}
    <p className="momo-sim-note">Ví mô phỏng chỉ để thử luồng thanh toán. Muốn quét mã thật hãy dùng tab QR chuyển khoản.</p>
  </div>;
}
