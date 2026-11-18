import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../common/Icon.jsx';
import EmptyState from '../common/EmptyState.jsx';
import RepairItem from './RepairItem.jsx';
import { errorText, shrinkImage, suaChuaApi } from './suaChua.api.js';
import './suaChua.css';

const MAX_PHOTOS = 3;

// Tab "Báo hỏng" của khách đang thuê: gửi mô tả + tối đa 3 ảnh, theo dõi tiến độ. Ảnh và ngày báo được giữ lại để lúc trả phòng
// quản lý thấy hư hỏng nào đã báo từ trước.
export default function CustomerRepairTab() {
  const [contracts, setContracts] = useState(null), [items, setItems] = useState(null), [loadError, setLoadError] = useState('');
  const [maHopDong, setMaHopDong] = useState(''), [moTa, setMoTa] = useState(''), [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(null);
  const fileRef = useRef(null);

  async function load() {
    setLoadError('');
    try {
      const [{ data: hd }, { data: list }] = await Promise.all([suaChuaApi.hopDongCuaToi(), suaChuaApi.danhSach()]);
      setContracts(hd || []); setItems(list || []);
      setMaHopDong((current) => current || hd?.[0]?.maHopDong || '');
    } catch (error) {
      setContracts([]); setItems([]); setLoadError(errorText(error, 'Chưa tải được danh sách báo hỏng. Vui lòng thử lại.'));
    }
  }
  useEffect(() => { load(); }, []);

  async function pick(event) {
    const files = [...(event.target.files || [])].slice(0, MAX_PHOTOS - photos.length);
    event.target.value = '';
    try {
      const shrunk = await Promise.all(files.filter((file) => file.type.startsWith('image/')).map((file) => shrinkImage(file)));
      setPhotos((current) => [...current, ...shrunk].slice(0, MAX_PHOTOS));
    } catch (error) { setMessage({ error: true, text: error.message }); }
  }

  async function submit(event) {
    event.preventDefault(); setMessage(null);
    if (moTa.trim().length < 5) { setMessage({ error: true, text: 'Vui lòng mô tả hư hỏng (ít nhất 5 ký tự).' }); return; }
    setBusy(true);
    try {
      await suaChuaApi.tao({ maHopDong, moTa: moTa.trim(), anh: photos });
      setMoTa(''); setPhotos([]); setMessage({ text: 'Đã gửi báo hỏng. Quản lý chi nhánh sẽ tiếp nhận và liên hệ bạn.' });
      await load();
    } catch (error) { setMessage({ error: true, text: errorText(error, 'Chưa gửi được báo hỏng. Vui lòng thử lại.') }); }
    finally { setBusy(false); }
  }

  if (contracts === null) return <p role="status">Đang tải...</p>;
  return <section className="scb-page" aria-label="Báo hỏng">
    {loadError && <p className="scb-message scb-message--error" role="alert">{loadError}</p>}
    {contracts.length === 0 ? <div className="ui-card"><EmptyState message="Bạn chưa có hợp đồng đang hiệu lực. Báo hỏng dùng được sau khi nhận phòng." /></div>
      : <form className="ui-card scb-form" onSubmit={submit}>
        <h2>Báo hư hỏng trong phòng</h2>
        <p className="scb-hint">Chụp ảnh chỗ hư hỏng và mô tả ngắn. Ảnh và ngày báo được lưu lại, lúc trả phòng sẽ dùng để đối chiếu nên bạn không bị tính phí cho hư hỏng đã báo.</p>
        {contracts.length > 1 && <label className="ui-form-field"><span>Hợp đồng / phòng <span className="ui-required">*</span></span>
          <select className="ui-input" value={maHopDong} onChange={(e) => setMaHopDong(e.target.value)} required>
            {contracts.map((item) => <option key={item.maHopDong} value={item.maHopDong}>{item.tenPhong || item.maPhong} · {item.maHopDong}</option>)}
          </select></label>}
        {contracts.length === 1 && <p className="scb-muted">Phòng: <strong>{contracts[0].tenPhong || contracts[0].maPhong}</strong> · Hợp đồng {contracts[0].maHopDong}</p>}
        <label className="ui-form-field"><span>Mô tả hư hỏng <span className="ui-required">*</span></span>
          <textarea className="ui-textarea" value={moTa} maxLength={1000} onChange={(e) => setMoTa(e.target.value)} placeholder="Ví dụ: vòi nước bồn rửa bị rỉ, nước chảy liên tục." required /></label>
        <div className="ui-form-field"><span>Ảnh hư hỏng (tối đa {MAX_PHOTOS})</span>
          <div className="scb-pick">
            {photos.map((src, index) => <span className="scb-thumb" key={src.slice(-32) + index}><img src={src} alt={`Ảnh ${index + 1}`} />
              <button type="button" aria-label={`Bỏ ảnh ${index + 1}`} onClick={() => setPhotos((current) => current.filter((_, i) => i !== index))}><Icon name="close" /></button></span>)}
            {photos.length < MAX_PHOTOS && <button type="button" className="scb-add" aria-label="Thêm ảnh hư hỏng" onClick={() => fileRef.current?.click()}><span className="scb-add-icon"><Icon name="image" /></span><span className="scb-add-copy"><strong>Thêm ảnh</strong><span>Chọn ảnh từ thiết bị</span></span></button>}
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={pick} />
          </div></div>
        {message && <p className={`scb-message ${message.error ? 'scb-message--error' : 'scb-message--ok'}`} role={message.error ? 'alert' : 'status'}>{message.text}</p>}
        <div className="scb-form-actions"><button type="submit" className="ui-btn ui-btn--primary" disabled={busy}>{busy ? 'Đang gửi...' : 'Gửi báo hỏng'}</button></div>
      </form>}
    <h2 className="scb-section-title">Báo hỏng đã gửi</h2>
    {items?.length ? <div className="scb-list">{items.map((item) => <RepairItem key={item.maYeuCau} item={item} />)}</div>
      : <div className="ui-card"><EmptyState message="Chưa có báo hỏng nào." /></div>}
  </section>;
}
