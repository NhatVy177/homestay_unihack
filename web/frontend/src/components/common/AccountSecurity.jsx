import React, { useRef, useState } from 'react';
import { authApi } from '../../pages/auth/auth.api.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { resolveAvatarUrl } from './avatarUrl.js';
import { Icon } from './Icon.jsx';
import './accountSecurity.css';

const TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024;
const initialOf = (user) => (String(user?.hoTen || user?.email || '?').trim().split(/\s+/).pop()[0] || '?').toUpperCase();
const readFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file);
});

// Ảnh đại diện và đổi mật khẩu, dùng chung cho trang hồ sơ của khách và nhân viên.
export default function AccountSecurity({ details, profileExtra }) {
  const { user, capNhatAvatar } = useAuth();
  const fileRef = useRef(null);
  const [avatarMsg, setAvatarMsg] = useState(null), [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ matKhauHienTai: '', matKhauMoi: '', xacNhan: '' }), [pwMsg, setPwMsg] = useState(null), [pwBusy, setPwBusy] = useState(false);
  const src = resolveAvatarUrl(user?.avatarUrl);

  async function pick(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (!TYPES.includes(file.type)) { setAvatarMsg({ error: true, text: 'Ảnh phải là PNG, JPG hoặc WebP.' }); return; }
    if (file.size > MAX_BYTES) { setAvatarMsg({ error: true, text: 'Ảnh tối đa 2MB.' }); return; }
    setBusy(true); setAvatarMsg(null);
    try { const { data } = await authApi.capNhatAvatar(await readFile(file)); capNhatAvatar(data.avatarUrl); setAvatarMsg({ text: 'Đã cập nhật ảnh đại diện.' }); }
    catch (e) { setAvatarMsg({ error: true, text: e?.response?.data?.message || 'Không cập nhật được ảnh.' }); }
    finally { setBusy(false); }
  }
  async function changePassword(event) {
    event.preventDefault(); setPwMsg(null);
    if (form.matKhauMoi.length < 6) { setPwMsg({ error: true, text: 'Mật khẩu mới phải có ít nhất 6 ký tự.' }); return; }
    if (form.matKhauMoi !== form.xacNhan) { setPwMsg({ error: true, text: 'Mật khẩu xác nhận không khớp.' }); return; }
    setPwBusy(true);
    try {
      await authApi.doiMatKhau({ matKhauHienTai: form.matKhauHienTai, matKhauMoi: form.matKhauMoi });
      setForm({ matKhauHienTai: '', matKhauMoi: '', xacNhan: '' }); setPwMsg({ text: 'Đã đổi mật khẩu.' });
    } catch (e) { setPwMsg({ error: true, text: e?.response?.data?.message || 'Không đổi được mật khẩu.' }); }
    finally { setPwBusy(false); }
  }
  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  return <div className="acs">
    <section className={profileExtra ? 'acs-card acs-card--extended' : 'acs-card'} aria-label="Ảnh đại diện">
      <div className="acs-avatar-wrap">
        <div className="acs-avatar">{src ? <img src={src} alt="Ảnh đại diện" /> : <span aria-hidden="true">{initialOf(user)}</span>}</div>
        <button type="button" className="acs-avatar-edit" aria-label="Chỉnh ảnh đại diện" aria-busy={busy}
          title={busy ? 'Đang cập nhật ảnh đại diện' : 'Chỉnh ảnh đại diện'} disabled={busy} onClick={() => fileRef.current?.click()}>
          <Icon name="mode_edit" />
        </button>
        <input ref={fileRef} type="file" accept={TYPES.join(',')} hidden onChange={pick} />
      </div>
      <div className="acs-body">
        <h3>{details ? (user?.hoTen || 'Thông tin cá nhân') : 'Ảnh đại diện'}</h3>
        {details && <dl className="acs-details">{details.filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
        {avatarMsg && <p className={avatarMsg.error ? 'acs-msg acs-msg--error' : 'acs-msg'} role={avatarMsg.error ? 'alert' : 'status'}>{avatarMsg.text}</p>}
      </div>
      {profileExtra && <div className="acs-profile-extra">{profileExtra}</div>}
    </section>
    <form className="acs-card acs-card--form" onSubmit={changePassword}>
      <h3>Đổi mật khẩu</h3>
      <label>Mật khẩu hiện tại<input type="password" value={form.matKhauHienTai} onChange={set('matKhauHienTai')} required autoComplete="current-password" /></label>
      <div className="acs-row">
        <label>Mật khẩu mới<input type="password" value={form.matKhauMoi} onChange={set('matKhauMoi')} required autoComplete="new-password" /></label>
        <label>Xác nhận mật khẩu mới<input type="password" value={form.xacNhan} onChange={set('xacNhan')} required autoComplete="new-password" /></label>
      </div>
      {pwMsg && <p className={pwMsg.error ? 'acs-msg acs-msg--error' : 'acs-msg'} role={pwMsg.error ? 'alert' : 'status'}>{pwMsg.text}</p>}
      <button type="submit" className="acs-btn" disabled={pwBusy}>{pwBusy ? 'Đang lưu...' : 'Cập nhật mật khẩu'}</button>
    </form>
  </div>;
}
