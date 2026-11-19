import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { httpClient } from '../../api/httpClient.js';
import { Icon } from '../../components/common/Icon.jsx';
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
  const [momo, setMomo] = useState(null), [pendingMessage, setPendingMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const endpoint = `/thanh-toan-mo-phong/${encodeURIComponent(id)}`;
  const qrCacheKey = `momo-test:${id}`;
  useEffect(() => {
    const controller = new AbortController();
    setOrder(null);
    setMomo(null);
    setPendingMessage('');
    setError('');
    const load = returnedFromMomo
      ? httpClient.post(`${endpoint}/momo/trang-thai`, undefined, { signal: controller.signal })
        .catch(() => httpClient.get(endpoint, { signal: controller.signal }))
      : httpClient.get(endpoint, { signal: controller.signal });
    load.then(({ data }) => {
      if (controller.signal.aborted) return;
      setOrder(data);
      if (data.status === 'Pending') {
        try { setMomo(JSON.parse(sessionStorage.getItem(qrCacheKey))); }
        catch { /* QR generation remains available when browser storage is disabled. */ }
      }
    }).catch(e => {
      if (!controller.signal.aborted) setError(message(e, 'Chưa tải được đơn thanh toán.'));
    });
    return () => controller.abort();
  }, [endpoint, attempt, qrCacheKey, returnedFromMomo]);
  async function createQr() {
    if (busy || order?.status !== 'Pending') return;
    setBusy(true);
    setError('');
    setPendingMessage('');
    try {
      const { data } = await httpClient.post(`${endpoint}/momo/qr`);
      const image = data.qrCode ? await QRCode.toDataURL(data.qrCode, { width: 320, margin: 4, errorCorrectionLevel: 'M', color: { dark: '#A50064', light: '#FFFFFF' } }) : null;
      const checkout = { image, payUrl: data.payUrl, existing: data.existing };
      setMomo(checkout);
      if (image || data.payUrl) {
        try { sessionStorage.setItem(qrCacheKey, JSON.stringify(checkout)); }
        catch { /* Keep the checkout visible even if storage is unavailable. */ }
      }
    } catch (e) {
      setError(message(e, 'Chưa tạo được mã QR MoMo thử nghiệm.'));
    } finally { setBusy(false); }
  }

  // Vào trang là hiện mã luôn, khách không phải bấm tạo mã.
  useEffect(() => {
    if (order?.status === 'Pending' && !momo && !returnedFromMomo) createQr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.status]);

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
          {momo?.image && <figure className="tm-qr-panel">
            <img src={momo.image} alt="Mã QR MoMo Sandbox của đơn thanh toán" width="320" height="320" />
            <figcaption>Mở MoMo Test, chọn Quét QR và xác nhận khoản thanh toán thử.</figcaption>
          </figure>}
          {momo?.payUrl && <a className="tm-back" href={momo.payUrl} target="_blank" rel="noreferrer">{momo.image ? 'Mở trang thanh toán MoMo Sandbox' : 'Mở MoMo Sandbox để lấy mã QR'}</a>}
          {momo?.existing && <p className="tm-result" role="status">Đơn thử đã được tạo. Bạn có thể kiểm tra kết quả hoặc hủy để tạo đơn mới.</p>}
          {pendingMessage && <p className="tm-result" role="status">{pendingMessage}</p>}
          <div className="tm-actions">
            <button type="button" className="ui-btn ui-btn--secondary" disabled={busy} onClick={() => act('huy')}>Hủy</button>
            {momo
              ? <button type="button" className="ui-btn ui-btn--primary" disabled={busy} onClick={() => act('momo/trang-thai')}>{busy ? 'Đang đối chiếu…' : 'Kiểm tra thanh toán'}</button>
              : <button type="button" className="ui-btn ui-btn--primary" disabled={busy} onClick={createQr}>{busy ? 'Đang tạo mã…' : 'Tạo lại mã MoMo'}</button>}
          </div>
          {!momo && <button type="button" className="ui-btn ui-btn--ghost" disabled={busy} onClick={() => act('momo/trang-thai')}>Kiểm tra giao dịch đã quét</button>}
        </>}
        {order.status === 'Paid' && <div className="tm-result ok" role="status"><strong>Thanh toán thành công (mô phỏng)</strong><p>Hệ thống đã ghi nhận thanh toán cho {order.refId}.{order.transId && ` Mã giao dịch mô phỏng: ${order.transId}`}</p></div>}
        {order.status === 'Cancelled' && <div className="tm-result"><strong>Đã hủy thanh toán</strong><p>Bạn có thể mở lại khoản thanh toán trong tài khoản.</p></div>}
        {['Failed', 'Processing'].includes(order.status) && <div className="tm-result" role="status"><strong>{order.status === 'Failed' ? 'Thanh toán không thành công' : 'Đang xử lý'}</strong><p>{order.lastError || 'Vui lòng kiểm tra lại khoản thanh toán.'}</p>{order.status === 'Processing' && <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setAttempt(value => value + 1)}>Kiểm tra trạng thái</button>}</div>}
      </>}
      <Link className="tm-back" to={`/khach-hang?tab=${purpose.tab}`}>{purpose.tab === 'hop-dong' ? 'Quay lại hợp đồng' : 'Quay lại thanh toán'}</Link>
    </section>
  </main>;
}
