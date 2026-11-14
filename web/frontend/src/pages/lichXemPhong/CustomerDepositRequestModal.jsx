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
  return <div className="lxp-modal-backdrop" onMouseDown={onClose}>
    <div className="lxp-modal" role="dialog" aria-modal="true" aria-label="Đặt cọc giữ chỗ" onMouseDown={(e) => e.stopPropagation()}>
      <div className="lxp-modal-head"><h3>Tôi muốn đặt cọc</h3><button className="lxp-modal-close" type="button" aria-label="Đóng" onClick={onClose}><Icon name="close" /></button></div>
      <form onSubmit={submit}>
        <div className="lxp-modal-body customer-deposit-form">
          {loading && <p role="status">Đang tải các phòng bạn đã xem...</p>}
          {error && <p className="customer-viewing-error" role="alert">{error}</p>}
          {info?.daGuiYeuCau && <p className="customer-viewing-error" role="alert">Phiếu của bạn đã gửi yêu cầu giữ chỗ rồi.</p>}
          {info && <fieldset><legend>Chọn phòng bạn muốn giữ</legend>
            {(info.phong || []).map((p) => <label key={p.maPhong} className={`customer-deposit-option ${maPhong === p.maPhong ? 'is-selected' : ''} ${p.daXem ? '' : 'is-disabled'}`}>
              <input type="radio" name="phong-giu-cho" checked={maPhong === p.maPhong} disabled={!p.daXem} onChange={() => setMaPhong(p.maPhong)} />
              <span>{p.tenPhong || p.maPhong}</span>{!p.daXem && <small>Chưa xem</small>}
            </label>)}
            {!(info.phong || []).length && <p>Bạn chưa có phòng nào đã xem.</p>}
          </fieldset>}
          {maPhong && <fieldset><legend>Hình thức thuê</legend>
            <label className="customer-deposit-option"><input type="radio" name="hinh-thuc" checked={hinhThuc === 'Nguyên phòng'} onChange={() => setHinhThuc('Nguyên phòng')} /><span>Nguyên phòng</span></label>
            <label className={`customer-deposit-option ${info?.khacGioi ? 'is-disabled' : ''}`}><input type="radio" name="hinh-thuc" disabled={info?.khacGioi} checked={hinhThuc === 'Ghép giường'} onChange={() => setHinhThuc('Ghép giường')} /><span>Ghép giường</span>{info?.khacGioi && <small>Nhóm nam và nữ chưa ghép giường được</small>}</label>
            {hinhThuc === 'Ghép giường' && <div className="customer-deposit-beds">
              {giuongs.map((g) => <label key={g.maGiuong} className={giuongChon.includes(g.maGiuong) ? 'is-selected' : ''}>
                <input type="checkbox" checked={giuongChon.includes(g.maGiuong)} disabled={!giuongChon.includes(g.maGiuong) && giuongChon.length >= need} onChange={() => toggleBed(g.maGiuong)} /> {g.maGiuong}</label>)}
              <small>Đã chọn {giuongChon.length}/{need} giường{giuongs.length === 0 ? ' · phòng này không còn giường trống' : ''}</small>
            </div>}
          </fieldset>}
          <p className="customer-viewing-hint"><Icon name="shield" /> Phòng chưa được giữ cho đến khi quản lý chi nhánh xác nhận (tối đa 12 giờ). Bạn chưa phải thanh toán ở bước này.</p>
        </div>
        <div className="customer-deposit-actions">
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onClose} disabled={sending}>Để sau</button>
          <button type="submit" className="ui-btn ui-btn--primary" disabled={!maPhong || !bedsOk || sending || info?.daGuiYeuCau}>{sending ? 'Đang gửi...' : 'Gửi yêu cầu giữ chỗ'}</button>
        </div>
      </form>
    </div>
  </div>;
}
