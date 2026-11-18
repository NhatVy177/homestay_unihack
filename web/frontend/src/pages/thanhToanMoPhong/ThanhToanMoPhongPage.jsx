import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { httpClient } from '../../api/httpClient.js';
import { Icon } from '../../components/common/Icon.jsx';
import './thanhToanMoPhong.css';
// D-013: cổng ví điện tử MÔ PHỎNG cho demo. Không phải ứng dụng/API của nhà cung cấp thật; không trừ tiền thật.
const money = v => Number(v || 0).toLocaleString('vi-VN') + ' đ';
const message = (e, f) => e?.response?.data?.message || f;
const purposes = {
  'dat-coc': { label: 'Tiền cọc', reference: 'Phiếu đặt cọc', tab: 'dat-coc' },
  'hoa-don': { label: 'Hóa đơn tháng', reference: 'Hóa đơn', tab: 'dat-coc' },
  'thu-nhan-phong': { label: 'Khoản thu kỳ đầu', reference: 'Hợp đồng', tab: 'hop-dong' },
  'thu-them-doi-soat': { label: 'Khoản thu thêm khi trả phòng', reference: 'Phiếu đối soát', tab: 'hop-dong' },
};
export default function ThanhToanMoPhongPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const endpoint = `/thanh-toan-mo-phong/${encodeURIComponent(id)}`;
  useEffect(() => {
    const controller = new AbortController();
    setOrder(null);
    setError('');
    httpClient.get(endpoint, { signal: controller.signal }).then(({ data }) => {
      if (!controller.signal.aborted) setOrder(data);
    }).catch(e => {
      if (!controller.signal.aborted) setError(message(e, 'Chưa tải được đơn thanh toán.'));
    });
    return () => controller.abort();
  }, [endpoint, attempt]);
  const act = async path => {
    if (busy || order?.status !== 'Pending') return;
    setBusy(true); setError('');
    try { setOrder((await httpClient.post(`${endpoint}/${path}`)).data); }
    catch (e) {
      setError(message(e, 'Thanh toán không thành công.'));
      try {
        const { data } = await httpClient.get(endpoint);
        setOrder(data);
        if (data.status === 'Paid' || data.status === 'Cancelled') setError('');
      } catch { /* Keep the original error visible. */ }
    }
    finally { setBusy(false); }
  };
  const purpose = purposes[order?.purpose || 'dat-coc'] || { label: 'Thanh toán', reference: 'Mã tham chiếu', tab: 'dat-coc' };
  return <main className="tm-page">
    <p className="tm-sim-banner">Giao dịch mô phỏng không trừ tiền thật.</p>
    <section className="tm-card">
      <header><span className="tm-wallet-icon"><Icon name="payments" /></span><div><h1>MoMo mô phỏng</h1><p>Thanh toán cho HomeStayDorm</p></div></header>
      {error && <p className="tm-error" role="alert">{error}</p>}
      {!order && !error && <p role="status">Đang tải đơn thanh toán…</p>}
      {!order && error && <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setAttempt(value => value + 1)}>Thử lại</button>}
      {order && <>
        <dl>
          <div><dt>Nội dung</dt><dd>{purpose.label}</dd></div>
          <div><dt>{purpose.reference}</dt><dd>{order.refId}</dd></div>
          <div className="tm-amount"><dt>Số tiền</dt><dd>{money(order.amountVnd)}</dd></div>
        </dl>
        {order.status === 'Pending' && <>
          <div className="tm-actions">
            <button type="button" className="ui-btn ui-btn--secondary" disabled={busy} onClick={() => act('huy')}>Hủy</button>
            <button type="button" className="ui-btn ui-btn--primary" disabled={busy} onClick={() => act('thanh-toan')}>{busy ? 'Đang xử lý…' : 'Xác nhận thanh toán'}</button>
          </div>
        </>}
        {order.status === 'Paid' && <div className="tm-result ok" role="status"><strong>Thanh toán thành công (mô phỏng)</strong><p>Hệ thống đã ghi nhận thanh toán cho {order.refId}.{order.transId && ` Mã giao dịch mô phỏng: ${order.transId}`}</p></div>}
        {order.status === 'Cancelled' && <div className="tm-result"><strong>Đã hủy thanh toán</strong><p>Bạn có thể mở lại khoản thanh toán trong tài khoản.</p></div>}
        {['Failed', 'Processing'].includes(order.status) && <div className="tm-result" role="status"><strong>{order.status === 'Failed' ? 'Thanh toán không thành công' : 'Đang xử lý'}</strong><p>{order.lastError || 'Vui lòng kiểm tra lại khoản thanh toán.'}</p>{order.status === 'Processing' && <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setAttempt(value => value + 1)}>Kiểm tra trạng thái</button>}</div>}
      </>}
      <Link className="tm-back" to={`/khach-hang?tab=${purpose.tab}`}>{purpose.tab === 'hop-dong' ? 'Quay lại hợp đồng' : 'Quay lại thanh toán'}</Link>
    </section>
  </main>;
}
