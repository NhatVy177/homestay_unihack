import React, { useEffect, useState } from 'react';
import { Icon } from '../../components/common/Icon.jsx';
import { datCocApi } from '../datCoc/datCoc.api.js';

// D-026: sau buổi "Đã xem", khách chọn phòng đã xem + hình thức thuê (+ giường) rồi gửi yêu cầu giữ chỗ.
// Phòng chỉ được giữ khi quản lý chi nhánh xác nhận.
export default function CustomerDepositRequestModal({ row, onClose, onSent }) {
  const [info, setInfo] = useState(null), [maPhong, setMaPhong] = useState(''), [hinhThuc, setHinhThuc] = useState('Nguyên phòng');
  const [giuongs, setGiuongs] = useState([]), [giuongChon, setGiuongChon] = useState([]);
  const [loading, setLoading] = useState(true), [sending, setSending] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    datCocApi.getPhongDaXemKhach(row.maDangKy).then(({ data }) => {
      if (!alive) return;
      setInfo(data);
      const viewed = (data.phong || []).filter((p) => p.daXem);
      if (viewed.length === 1) setMaPhong(viewed[0].maPhong);
    }).catch((e) => alive && setError(e.response?.data?.message || 'Không tải được các phòng bạn đã xem.')).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [row.maDangKy]);
  useEffect(() => {
    setGiuongChon([]);
    if (!maPhong || hinhThuc !== 'Ghép giường') { setGiuongs([]); return undefined; }
    let alive = true;
    datCocApi.getGiuongTrong(maPhong).then(({ data }) => alive && setGiuongs(data || [])).catch(() => alive && setGiuongs([]));
    return () => { alive = false; };
  }, [maPhong, hinhThuc]);
  const need = info?.soNguoi || 0;
  const bedsOk = hinhThuc !== 'Ghép giường' || (giuongChon.length === need && need > 0);
  async function submit(event) {
    event.preventDefault();
    if (!maPhong || !bedsOk || sending) return;
    setSending(true); setError('');
    try {
      await datCocApi.khachGuiYeuCauGiuCho({ maDangKy: row.maDangKy, maPhong, hinhThucThue: hinhThuc, giuongs: giuongChon });
      onSent?.();
    } catch (e) { setError(e.response?.data?.message || 'Chưa gửi được yêu cầu. Vui lòng thử lại.'); setSending(false); }
  }
  const toggleBed = (id) => setGiuongChon((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  const selectedRoom = (info?.phong || []).find((room) => room.maPhong === maPhong);
  return <div className="lxp-modal-backdrop" onMouseDown={onClose}>
    <div className="lxp-modal customer-deposit-modal" role="dialog" aria-modal="true" aria-label="Đặt cọc giữ chỗ" onMouseDown={(e) => e.stopPropagation()}>
      <div className="lxp-modal-head customer-deposit-head">
        <div className="ui-dialog-heading">
          <span className="ui-heading-symbol"><Icon name="description" /></span>
          <div><h3>Tôi muốn đặt cọc</h3><p>Chọn chỗ ở bạn muốn giữ</p></div>
        </div>
        <button className="lxp-modal-close" type="button" aria-label="Đóng" onClick={onClose}><Icon name="close" /></button>
      </div>
      <form className="customer-deposit-shell" onSubmit={submit}>
        <div className="lxp-modal-body customer-deposit-form">
          {loading && <p role="status">Đang tải các phòng bạn đã xem...</p>}
          {error && <p className="customer-viewing-error" role="alert">{error}</p>}
          {info?.daGuiYeuCau && <p className="customer-viewing-error" role="alert">Phiếu của bạn đã gửi yêu cầu giữ chỗ rồi.</p>}
          <div className="customer-deposit-layout">
            <div className="customer-deposit-fields">
              {info && <fieldset><legend><span>1</span> Chọn phòng</legend>
                {(info.phong || []).map((p) => <label key={p.maPhong} className={`customer-deposit-option customer-deposit-room ${maPhong === p.maPhong ? 'is-selected' : ''} ${p.daXem ? '' : 'is-disabled'}`}>
                  <input type="radio" name="phong-giu-cho" checked={maPhong === p.maPhong} disabled={!p.daXem} onChange={() => setMaPhong(p.maPhong)} />
                  <span className="customer-deposit-room-icon"><Icon name="meeting_room" /></span>
                  <span className="customer-deposit-room-copy"><strong>{p.tenPhong || p.maPhong}</strong><small>{p.tenPhong && p.tenPhong !== p.maPhong ? p.maPhong : 'Phòng đã có lịch xem'}</small></span>
                  <span className={`customer-deposit-room-state${p.daXem ? ' is-ready' : ''}`}>{p.daXem ? 'Đã xem' : 'Chưa xem'}</span>
                </label>)}
                {!(info.phong || []).length && <p>Bạn chưa có phòng nào đã xem.</p>}
              </fieldset>}
              {maPhong && <fieldset><legend><span>2</span> Hình thức thuê</legend>
                <div className="customer-deposit-rent-types">
                  <label className={`customer-deposit-option ${hinhThuc === 'Nguyên phòng' ? 'is-selected' : ''}`}><input type="radio" name="hinh-thuc" checked={hinhThuc === 'Nguyên phòng'} onChange={() => setHinhThuc('Nguyên phòng')} /><span>Nguyên phòng</span></label>
                  <label className={`customer-deposit-option ${hinhThuc === 'Ghép giường' ? 'is-selected' : ''} ${info?.khacGioi ? 'is-disabled' : ''}`}><input type="radio" name="hinh-thuc" disabled={info?.khacGioi} checked={hinhThuc === 'Ghép giường'} onChange={() => setHinhThuc('Ghép giường')} /><span>Ghép giường</span></label>
                </div>
                {info?.khacGioi && <p className="customer-deposit-field-note">Nhóm nam và nữ chưa ghép giường được.</p>}
                {hinhThuc === 'Ghép giường' && <div className="customer-deposit-beds">
                  {giuongs.map((g) => <label key={g.maGiuong} className={giuongChon.includes(g.maGiuong) ? 'is-selected' : ''}>
                    <input type="checkbox" checked={giuongChon.includes(g.maGiuong)} disabled={!giuongChon.includes(g.maGiuong) && giuongChon.length >= need} onChange={() => toggleBed(g.maGiuong)} /> {g.maGiuong}</label>)}
                  <small>Đã chọn {giuongChon.length}/{need} giường{giuongs.length === 0 ? ' · phòng này không còn giường trống' : ''}</small>
                </div>}
              </fieldset>}
            </div>
            <aside className="customer-deposit-summary" aria-label="Yêu cầu của bạn">
              <h4>Yêu cầu của bạn</h4>
              <dl>
                <div><dt><Icon name="meeting_room" /> Phòng</dt><dd>{selectedRoom?.tenPhong || selectedRoom?.maPhong || 'Chưa chọn'}</dd></div>
                <div><dt><Icon name="people" /> Hình thức</dt><dd>{maPhong ? hinhThuc : 'Chưa chọn'}</dd></div>
                <div><dt><Icon name="bed" /> Giường</dt><dd>{hinhThuc === 'Ghép giường' ? (giuongChon.join(', ') || 'Chưa chọn') : 'Không áp dụng'}</dd></div>
              </dl>
              {hinhThuc === 'Ghép giường' && <p className={`customer-deposit-progress${bedsOk ? ' is-complete' : ''}`}><Icon name={bedsOk ? 'check_circle' : 'info'} /> Đã chọn {giuongChon.length}/{need} giường</p>}
              <p className="customer-viewing-hint"><Icon name="shield" /> Quản lý chi nhánh sẽ xác nhận trong tối đa 12 giờ. Chưa thanh toán ở bước này.</p>
            </aside>
          </div>
        </div>
        <div className="customer-deposit-actions">
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onClose} disabled={sending}>Để sau</button>
          <button type="submit" className="ui-btn ui-btn--primary" disabled={!maPhong || !bedsOk || sending || info?.daGuiYeuCau}>{sending ? 'Đang gửi...' : 'Gửi yêu cầu giữ chỗ'}</button>
        </div>
      </form>
    </div>
  </div>;
}
