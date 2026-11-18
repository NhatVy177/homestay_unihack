import React, { useEffect, useMemo, useState } from 'react';
import { httpClient } from '../../api/httpClient.js';
import { Icon } from '../common/Icon.jsx';
import './saleRoomLink.css';

const todayIso = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
const price = (room) => Number(room.giaThueTheoGiuong || room.giaThue || 0);
const dateVi = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

// Sale chọn phòng (và giờ hẹn xem nếu đã thống nhất với khách), tạo link rồi dán vào Messenger/Zalo. Khách mở link thấy đúng
// phòng, đăng nhập rồi gửi đăng ký với thông tin điền sẵn; từ đó đi tiếp đúng luồng cọc, bàn giao, xác nhận hiện có.
export default function SaleRoomLinkTab() {
  const [rooms, setRooms] = useState(null), [maPhong, setMaPhong] = useState(''), [ngayXem, setNgayXem] = useState(''), [gioXem, setGioXem] = useState(''), [ghiChu, setGhiChu] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [result, setResult] = useState(null), [copied, setCopied] = useState(false);
  useEffect(() => {
    httpClient.get('/trang-chu/kham-pha-phong').then(({ data }) => {
      const list = (data.data || []).map((r) => ({ ...r, maPhong: r.maPhong || r.MaPhong, tenPhong: r.tenPhong || r.TenPhong, chiNhanh: r.chiNhanh || r.TenChiNhanh }));
      setRooms([...new Map(list.filter((r) => r.maPhong).map((r) => [r.maPhong, r])).values()]);
    }).catch(() => setRooms([]));
  }, []);
  const selected = useMemo(() => rooms?.find((r) => r.maPhong === maPhong), [rooms, maPhong]);
  const reset = () => { setResult(null); setCopied(false); };
  const url = result ? `${window.location.origin}/chot/${result.token}` : '';
  const when = [gioXem, dateVi(ngayXem)].filter(Boolean).join(' ngày ');
  const message = result ? `Chào bạn, mình gửi bạn ${result.tenPhong}${when ? `, hẹn xem lúc ${when}` : ''}. Bạn mở link này để xem phòng và đăng ký nhé: ${url}` : '';

  async function create(event) {
    event.preventDefault(); setError(''); reset();
    if (!maPhong) { setError('Vui lòng chọn phòng.'); return; }
    setBusy(true);
    try { const { data } = await httpClient.post('/link-chot', { maPhong, ngayXem, gioXem, ghiChu }); setResult(data); }
    catch (e) { setError(e.response?.data?.message || 'Chưa tạo được link. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(message); setCopied(true); } catch { setError('Trình duyệt chặn sao chép, hãy chọn và sao chép tin nhắn bên dưới.'); }
  }

  return <section className="srl" aria-label="Gửi phòng cho khách">
    <form className="ui-card srl-form" onSubmit={create}>
      <h2>Tạo link gửi phòng cho khách</h2>
      <p className="srl-hint">Dán link vào Messenger hoặc Zalo. Khách mở link thấy đúng phòng này, đăng nhập rồi gửi đăng ký với thông tin đã điền sẵn. Link dùng được 7 ngày.</p>
      <label className="ui-form-field"><span>Phòng <span className="ui-required">*</span></span>
        <select className="ui-input" value={maPhong} onChange={(e) => { setMaPhong(e.target.value); reset(); }} required disabled={!rooms}>
          <option value="">{rooms ? 'Chọn phòng' : 'Đang tải phòng...'}</option>
          {(rooms || []).map((r) => <option key={r.maPhong} value={r.maPhong}>{r.tenPhong} · {r.chiNhanh}{price(r) ? ` · ${price(r).toLocaleString('vi-VN')}đ` : ''}</option>)}
        </select></label>
      <div className="srl-row">
        <label className="ui-form-field"><span>Ngày hẹn xem</span><input className="ui-input" type="date" min={todayIso()} value={ngayXem} onChange={(e) => { setNgayXem(e.target.value); reset(); }} /></label>
        <label className="ui-form-field"><span>Giờ hẹn</span><input className="ui-input" type="time" value={gioXem} onChange={(e) => { setGioXem(e.target.value); reset(); }} /></label>
      </div>
      <label className="ui-form-field"><span>Lời nhắn cho khách</span><input className="ui-input" maxLength={200} value={ghiChu} onChange={(e) => { setGhiChu(e.target.value); reset(); }} placeholder="Ví dụ: nhớ mang CCCD khi đến xem" /></label>
      {selected && <p className="srl-hint">Khách sẽ thấy: {selected.tenPhong}, {selected.chiNhanh}.</p>}
      {error && <p className="srl-error" role="alert">{error}</p>}
      <div className="srl-actions"><button type="submit" className="ui-btn ui-btn--primary" disabled={busy}>{busy ? 'Đang tạo...' : 'Tạo link'}</button></div>
    </form>
    {result && <div className="ui-card srl-result" aria-live="polite">
      <h3><Icon name="check_circle" /> Link đã sẵn sàng</h3>
      <p className="srl-hint">Dùng được đến {new Date(result.hetHan).toLocaleDateString('vi-VN')}.</p>
      <textarea className="ui-textarea srl-message" readOnly value={message} rows={3} aria-label="Tin nhắn gửi khách" onFocus={(e) => e.target.select()} />
      <div className="srl-actions">
        <a className="ui-btn ui-btn--secondary" href={url} target="_blank" rel="noreferrer">Xem như khách</a>
        {typeof navigator.share === 'function' && <button type="button" className="ui-btn ui-btn--secondary" onClick={() => navigator.share({ text: message }).catch(() => {})}>Chia sẻ...</button>}
        <button type="button" className="ui-btn ui-btn--primary" onClick={copy}>{copied ? 'Đã sao chép' : 'Sao chép tin nhắn'}</button>
      </div>
    </div>}
  </section>;
}
