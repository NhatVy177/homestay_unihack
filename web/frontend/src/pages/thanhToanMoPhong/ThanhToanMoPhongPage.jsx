import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { httpClient } from '../../api/httpClient.js';
import './thanhToanMoPhong.css';
// D-013: cổng ví điện tử MÔ PHỎNG cho demo. Không phải ứng dụng/API của nhà cung cấp thật; không trừ tiền thật.
const money = v => Number(v || 0).toLocaleString('vi-VN') + ' đ';
const message = (e, f) => e?.response?.data?.message || f;
export default function ThanhToanMoPhongPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { httpClient.get(`/thanh-toan-mo-phong/${id}`).then(r => setOrder(r.data)).catch(e => setError(message(e, 'Không tìm thấy đơn thanh toán.'))); }, [id]);
  const act = async path => {
    setBusy(true); setError('');
    try { setOrder((await httpClient.post(`/thanh-toan-mo-phong/${id}/${path}`)).data); }
    catch (e) {
      setError(message(e, 'Thanh toán không thành công.'));
      try { setOrder((await httpClient.get(`/thanh-toan-mo-phong/${id}`)).data); } catch { /* Keep the original error visible. */ }
    }
    finally { setBusy(false); }
  };
  const topUp = order?.purpose === 'thu-them-doi-soat';
  const firstCharge = order?.purpose === 'thu-nhan-phong' || topUp; // both return to the contract tab
  const description = topUp ? `Khoản thu thêm khi trả phòng – đối soát ${order.refId}`
    : firstCharge ? `Khoản thu kỳ đầu – hợp đồng ${order.refId}` : `Tiền cọc – phiếu ${order?.refId || ''}`;
  return <main className="tm-page">
    <div className="tm-sim-banner">MÔI TRƯỜNG MÔ PHỎNG — dùng để demo, không có tiền thật được chuyển.</div>
    <section className="tm-card">
      <header><span className="tm-logo">VĐT</span><div><strong>Cổng ví điện tử (mô phỏng)</strong><small>Thanh toán cho HomeStayDorm</small></div></header>
      {error && <p className="tm-error" role="alert">{error}</p>}
      {!order && !error && <p>Đang tải đơn thanh toán…</p>}
      {order && <>
        <dl>
          <div><dt>Nội dung</dt><dd>{description}</dd></div>
          <div><dt>Mã đơn</dt><dd>{order.id}</dd></div>
          <div className="tm-amount"><dt>Số tiền</dt><dd>{money(order.amountVnd)}</dd></div>
        </dl>
        {order.status === 'Pending' && <>
          <div className="tm-qr" aria-hidden="true">{Array.from({ length: 49 }, (_, i) => <i key={i} className={(i * 7 + order.id.charCodeAt(i % order.id.length)) % 3 ? 'on' : ''} />)}</div>
          <p className="tm-hint">Trong môi trường thật, bạn quét mã bằng ứng dụng ví. Ở bản mô phỏng, bấm nút bên dưới để giả lập ví xác nhận thanh toán.</p>
          <div className="tm-actions">
            <button type="button" className="tm-btn" disabled={busy} onClick={() => act('thanh-toan')}>{busy ? 'Đang xử lý…' : 'Xác nhận thanh toán'}</button>
            <button type="button" className="tm-btn secondary" disabled={busy} onClick={() => act('huy')}>Hủy</button>
          </div>
        </>}
        {order.status === 'Paid' && <div className="tm-result ok"><strong>Thanh toán thành công (mô phỏng)</strong><p>{topUp ? `Khoản thu thêm của đối soát ${order.refId}` : firstCharge ? `Khoản thu kỳ đầu của hợp đồng ${order.refId}` : `Phiếu cọc ${order.refId}`} đã được ghi nhận thanh toán. Mã giao dịch mô phỏng: {order.transId}</p></div>}
        {order.status === 'Cancelled' && <div className="tm-result"><strong>Đã hủy thanh toán</strong><p>Bạn có thể mở lại khoản thanh toán trong tài khoản.</p></div>}
        {['Failed', 'Processing'].includes(order.status) && <div className="tm-result"><strong>{order.status === 'Failed' ? 'Thanh toán không thành công' : 'Đang xử lý'}</strong><p>{order.lastError || 'Vui lòng kiểm tra lại khoản thanh toán.'}</p></div>}
      </>}
      <Link className="tm-back" to={firstCharge ? '/khach-hang?tab=hop-dong' : '/khach-hang?tab=dat-coc'}>← {firstCharge ? 'Quay lại hợp đồng' : 'Quay lại phiếu đặt cọc'}</Link>
    </section>
  </main>;
}
