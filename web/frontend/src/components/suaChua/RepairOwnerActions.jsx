import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../common/Icon.jsx';
import { resolveAvatarUrl } from '../common/avatarUrl.js';
import { errorText, shrinkImage, suaChuaApi } from './suaChua.api.js';

const MAX_PHOTOS = 3;

// Khách sửa hoặc xóa báo hỏng của mình khi quản lý chưa tiếp nhận (D-067). Đã tiếp nhận thì không hiện nút.
export default function RepairOwnerActions({ item, loaiOptions, onChanged }) {
  const [mode, setMode] = useState(''), [loai, setLoai] = useState(item.loai || ''), [moTa, setMoTa] = useState(item.moTa || '');
  const [keep, setKeep] = useState(item.anh || []), [added, setAdded] = useState([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [picking, setPicking] = useState(false);
  const fileRef = useRef(null);
  const editSession = useRef(0);
  useEffect(() => () => { editSession.current += 1; }, []);
  if (item.trangThai !== 'Chờ tiếp nhận') return null;

  const open = () => { editSession.current += 1; setPicking(false); setLoai(item.loai || ''); setMoTa(item.moTa || ''); setKeep(item.anh || []); setAdded([]); setError(''); setMode('edit'); };
  async function pick(event) {
    const session = editSession.current;
    const files = [...(event.target.files || [])].slice(0, MAX_PHOTOS - keep.length - added.length);
    event.target.value = '';
    setPicking(true);
    try { const shrunk = await Promise.all(files.filter((f) => f.type.startsWith('image/')).map((f) => shrinkImage(f))); if (session === editSession.current) setAdded((cur) => [...cur, ...shrunk].slice(0, MAX_PHOTOS - keep.length)); }
    catch (e) { if (session === editSession.current) setError(e.message); }
    finally { if (session === editSession.current) setPicking(false); }
  }
  async function run(fn) {
    setBusy(true); setError('');
    try { await fn(); setMode(''); await onChanged(); }
    catch (e) {
      const message = errorText(e, 'Chưa lưu được. Vui lòng thử lại.');
      if (e.response?.status === 409) { setMode(''); await onChanged({ error: message }); }
      else setError(message);
    } finally { setBusy(false); }
  }
  async function save() {
    if (!loai) { setError('Vui lòng chọn loại hư hỏng.'); return; }
    if (moTa.trim().length < 5) { setError('Vui lòng mô tả hư hỏng (ít nhất 5 ký tự).'); return; }
    await run(() => suaChuaApi.capNhat(item.maYeuCau, { loai, moTa: moTa.trim(), giuAnh: keep, anhMoi: added }));
  }

  return <div className="scb-actions">
    {mode === 'edit' && <fieldset className="scb-edit" disabled={busy || picking} aria-label={`Sửa báo hỏng ${item.maYeuCau}`}>
      <label className="ui-form-field"><span>Loại hư hỏng <span className="ui-required">*</span></span>
        <select className="ui-input" value={loai} onChange={(e) => setLoai(e.target.value)}>
          <option value="">Chọn loại</option>
          {loaiOptions.map((name) => <option key={name} value={name}>{name}</option>)}
        </select></label>
      <label className="ui-form-field"><span>Mô tả hư hỏng <span className="ui-required">*</span></span>
        <textarea className="ui-textarea" value={moTa} maxLength={1000} onChange={(e) => setMoTa(e.target.value)} /></label>
      <div className="ui-form-field"><span>Ảnh hư hỏng (tối đa {MAX_PHOTOS})</span>
        <div className="scb-pick">
          {keep.map((src) => <span className="scb-thumb" key={src}><img src={resolveAvatarUrl(src)} alt="Ảnh đã gửi" />
            <button type="button" aria-label="Bỏ ảnh này" onClick={() => setKeep((cur) => cur.filter((p) => p !== src))}><Icon name="close" /></button></span>)}
          {added.map((src, index) => <span className="scb-thumb" key={src.slice(-32) + index}><img src={src} alt={`Ảnh mới ${index + 1}`} />
            <button type="button" aria-label={`Bỏ ảnh mới ${index + 1}`} onClick={() => setAdded((cur) => cur.filter((_, i) => i !== index))}><Icon name="close" /></button></span>)}
          {keep.length + added.length < MAX_PHOTOS && <button type="button" className="scb-add" aria-label="Thêm ảnh hư hỏng" onClick={() => fileRef.current?.click()}><span className="scb-add-icon"><Icon name="image" /></span><span className="scb-add-copy"><strong>Thêm ảnh</strong><span>Chọn ảnh từ thiết bị</span></span></button>}
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={pick} />
        </div></div>
      {picking && <p className="scb-muted" role="status">Đang chuẩn bị ảnh...</p>}
    </fieldset>}
    {mode === 'delete' && <p className="scb-message" role="alert">Xóa báo hỏng {item.maYeuCau}? Ảnh đã gửi cũng bị xóa.</p>}
    {error && <p className="scb-message scb-message--error" role="alert">{error}</p>}
    <div className="scb-actions-row">
      {mode === '' && <>
        <button type="button" className="ui-btn ui-btn--secondary" onClick={() => { setError(''); setMode('delete'); }}><Icon name="delete" /> Xóa</button>
        <button type="button" className="ui-btn ui-btn--secondary" onClick={open}><Icon name="edit" /> Sửa</button>
      </>}
      {mode !== '' && <button type="button" className="ui-btn ui-btn--secondary" disabled={busy} onClick={() => { editSession.current += 1; setPicking(false); setMode(''); setError(''); }}>Hủy</button>}
      {mode === 'edit' && <button type="button" className="ui-btn ui-btn--primary" disabled={busy || picking} onClick={save}>{busy ? 'Đang lưu...' : 'Lưu thay đổi'}</button>}
      {mode === 'delete' && <button type="button" className="ui-btn ui-btn--danger" disabled={busy} onClick={() => run(() => suaChuaApi.xoa(item.maYeuCau))}>{busy ? 'Đang xóa...' : 'Xóa báo hỏng'}</button>}
    </div>
  </div>;
}
