import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { authApi } from '../../pages/auth/auth.api.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import './googleAuth.css';

// Đăng nhập / đăng ký bằng tài khoản Google. Chỉ hiện khi máy chủ có GOOGLE_CLIENT_ID.
// Email Google là danh tính: đã có tài khoản thì vào luôn, chưa có thì bổ sung ngày sinh, giới tính, số điện thoại.
const SCRIPT = 'https://accounts.google.com/gsi/client';
let scriptPromise;
const loadScript = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  scriptPromise ||= new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = SCRIPT; el.async = true; el.defer = true; el.onload = resolve;
    el.onerror = () => { scriptPromise = null; reject(new Error('Không tải được Google.')); };
    document.head.appendChild(el);
  });
  return scriptPromise;
};

export default function GoogleAuthSection({ onDone, onError, label = 'Hoặc đăng nhập với tài khoản Google', buttonText = 'signin_with' }) {
  const { dangNhapGoogle, hoanTatGoogle } = useAuth();
  const [config, setConfig] = useState(null), [profile, setProfile] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const holder = useRef(null);
  const handlers = useRef({});
  handlers.current = { dangNhapGoogle, onDone, onError };

  useEffect(() => { authApi.cauHinhGoogle().then(({ data }) => setConfig(data)).catch(() => setConfig({ enabled: false })); }, []);
  useEffect(() => {
    if (!config?.enabled || !holder.current) return undefined;
    let alive = true;
    loadScript().then(() => {
      if (!alive || !holder.current) return;
      window.google.accounts.id.initialize({
        client_id: config.clientId,
        callback: async ({ credential }) => {
          setBusy(true); setError('');
          try {
            const result = await handlers.current.dangNhapGoogle(credential);
            if (result.needsProfile) setProfile(result); else handlers.current.onDone?.(result.user);
          } catch (e) {
            const message = e?.response?.data?.message || 'Không đăng nhập được bằng Google.';
            setError(message); handlers.current.onError?.(message);
          } finally { setBusy(false); }
        },
      });
      window.google.accounts.id.renderButton(holder.current, { theme: 'outline', size: 'large', shape: 'pill', text: buttonText, locale: 'vi', width: 320 });
    }).catch((e) => setError(e.message));
    return () => { alive = false; };
  }, [config]);

  if (!config?.enabled) return null;
  return <div className="gas">
    <div className="gas-divider"><span>{label}</span></div>
    <div className="gas-button" ref={holder} aria-busy={busy} />
    {error && <p className="gas-error" role="alert">{error}</p>}
    {profile && <GoogleProfileForm profile={profile} hoanTatGoogle={hoanTatGoogle} onCancel={() => setProfile(null)} onDone={(user) => { setProfile(null); onDone?.(user); }} />}
  </div>;
}

function GoogleProfileForm({ profile, hoanTatGoogle, onCancel, onDone }) {
  const [form, setForm] = useState({ hoTen: profile.hoTen || '', ngaySinh: '', gioiTinh: '', soDienThoai: '' });
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const set = (name) => (event) => setForm((f) => ({ ...f, [name]: name === 'soDienThoai' ? event.target.value.replace(/\D/g, '').slice(0, 10) : event.target.value }));
  async function submit(event) {
    event.preventDefault();
    event.stopPropagation(); // sự kiện submit của portal vẫn nổi bọt lên form đăng nhập cha trong cây React
    setBusy(true); setError('');
    try { const { user } = await hoanTatGoogle({ profileToken: profile.profileToken, ...form }); onDone(user); }
    catch (e) { setError(e?.response?.data?.message || 'Chưa hoàn tất được đăng ký.'); } finally { setBusy(false); }
  }
  // Portal ra body: form này nằm trong form đăng nhập/đăng ký nên không được lồng form trong form.
  return createPortal(<div className="gas-overlay" role="presentation">
    <form className="gas-card" role="dialog" aria-modal="true" aria-labelledby="gas-title" onSubmit={submit}>
      <h3 id="gas-title">Hoàn tất đăng ký</h3>
      <p>Bạn đang đăng ký bằng email <strong>{profile.email}</strong>. Bổ sung vài thông tin để tạo tài khoản.</p>
      <label>Họ và tên<input value={form.hoTen} onChange={set('hoTen')} required maxLength={100} /></label>
      <label>Ngày sinh<input type="date" value={form.ngaySinh} onChange={set('ngaySinh')} required /></label>
      <label>Giới tính<select value={form.gioiTinh} onChange={set('gioiTinh')} required><option value="">Chọn</option><option value="Nam">Nam</option><option value="Nữ">Nữ</option></select></label>
      <label>Số điện thoại<input inputMode="numeric" value={form.soDienThoai} onChange={set('soDienThoai')} required placeholder="0901234567" /></label>
      {error && <p className="gas-error" role="alert">{error}</p>}
      <div className="gas-actions"><button type="button" className="gas-btn gas-btn--ghost" disabled={busy} onClick={onCancel}>Hủy</button>
        <button type="submit" className="gas-btn" disabled={busy || form.soDienThoai.length !== 10}>{busy ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}</button></div>
    </form>
  </div>, document.body);
}
