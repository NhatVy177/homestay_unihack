import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { httpClient } from '../../api/httpClient.js';
import { Icon } from '../../components/common/Icon.jsx';
import MomoQrPanel from '../../components/payment/MomoQrPanel.jsx';
import './thanhToanMoPhong.css';
// Checkout thử nghiệm. Dữ liệu QR được cấp bởi MoMo Sandbox cho đúng đơn.
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
  const [search] = useSearchParams();
  const returnedFromMomo = search.get('orderId') === `HSD-${id}` && search.has('resultCode');
  const [order, setOrder] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const endpoint = `/thanh-toan-mo-phong/${encodeURIComponent(id)}`;
  useEffect(() => {
    const controller = new AbortController();
    setOrder(null);
    setPendingMessage('');
    setError('');
    const load = returnedFromMomo
      ? httpClient.post(`${endpoint}/momo/trang-thai`, undefined, { signal: controller.signal })
        .catch(() => httpClient.get(endpoint, { signal: controller.signal }))
      : httpClient.get(endpoint, { signal: controller.signal });
    load.then(({ data }) => {
      if (controller.signal.aborted) return;
      setOrder(data);
    }).catch(e => {
      if (!controller.signal.aborted) setError(message(e, 'Chưa tải được đơn thanh toán.'));
    });
    return () => controller.abort();
  }, [endpoint, attempt, returnedFromMomo]);
  async function act(path) {
    if (busy || order?.status !== 'Pending') return;
    setBusy(true); setError('');
    setPendingMessage('');
    try {
      const { data } = await httpClient.post(`${endpoint}/${path}`);
      setOrder(data);
      if (path === 'momo/trang-thai' && data.status === 'Pending') {
        setPendingMessage('MoMo Test chưa xác nhận thanh toán. Vui lòng thử kiểm tra lại sau khi thanh toán trên app.');
      }
    }
    catch (e) {
      setError(message(e, 'Thanh toán không thành công.'));
      try {
        const { data } = await httpClient.get(endpoint);
        setOrder(data);
        if (data.status === 'Paid' || data.status === 'Cancelled') setError('');
      } catch { /* Keep the original error visible. */ }
    }
    finally { setBusy(false); }
  }
  const purpose = purposes[order?.purpose || 'dat-coc'] || { label: 'Thanh toán', reference: 'Mã tham chiếu', tab: 'dat-coc' };
  return <main className="tm-page">
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
          <MomoQrPanel orderId={order.id} onPaid={() => setAttempt((value) => value + 1)} onCancelled={() => setAttempt((value) => value + 1)} />
          {pendingMessage && <p className="tm-result" role="status">{pendingMessage}</p>}
          <div className="tm-actions">
            <button type="button" className="ui-btn ui-btn--secondary" disabled={busy} onClick={() => act('huy')}>Hủy thanh toán</button>
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
