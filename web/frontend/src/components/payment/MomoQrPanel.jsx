import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { httpClient } from '../../api/httpClient.js';
import { Icon } from '../common/Icon.jsx';
import './momoQrPanel.css';

// Mã QR kiểu MoMo, hiện ngay khi khách chọn MoMo: tạo đơn, lấy mã từ MoMo Sandbox, đếm ngược thời hạn mã,
// tự hỏi kết quả mỗi vài giây. Bản demo (D-078): sau AUTO_PAY_MS mã tự báo "đã thanh toán" như khi khách quét xong,
// đặt VITE_MOMO_DEMO_AUTOPAY=false để tắt. Đơn được nhớ trong sessionStorage nên đổi tab qua lại không tạo đơn mới
// và đồng hồ không bị đặt lại.
const POLL_MS = 4000;
const EXPIRE_MS = 10 * 60 * 1000; // thời hạn hiển thị của mã (chọn theo thói quen app MoMo, tài liệu MoMo không nêu cố định)
const AUTO_PAY_MS = 3 * 60 * 1000;
const SUCCESS_HOLD_MS = 1600;
const autoPayEnabled = import.meta.env.VITE_MOMO_DEMO_AUTOPAY !== 'false';
const inflight = new Map();
const orderUrl = (id) => `/thanh-toan-mo-phong/${encodeURIComponent(id)}`;
const errorText = (error, fallback) => error?.response?.data?.message || fallback;
const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
const clock = (ms) => { const total = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`; };
const keyOf = (createPath, orderId, cacheTag = '') => `momo-panel:${orderId || createPath}:${cacheTag}`;
const readCache = (key) => { try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; } };
const writeCache = (key, value) => { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* mã vẫn hiện khi trình duyệt chặn lưu */ } };

const renderQr = (qrCode) => QRCode.toDataURL(qrCode, { width: 280, margin: 1, errorCorrectionLevel: 'H', color: { dark: '#000000', light: '#FFFFFF' } });

async function loadQr(orderId) {
  const { data } = await httpClient.post(`${orderUrl(orderId)}/momo/qr`);
  return data.qrCode ? renderQr(data.qrCode) : null;
}

// Trả về { orderId, image, startedAt, status } cho đơn đang chờ; dùng lại đơn đã nhớ nếu còn hiệu lực.
async function openOrder(createPath, fixedOrderId, key) {
  const cached = readCache(key);
  if (cached?.orderId && cached.image) {
    try {
      const { data } = await httpClient.get(orderUrl(cached.orderId));
      if (data.status === 'Pending' || data.status === 'Paid') return { ...cached, status: data.status };
    } catch { /* đơn cũ không còn: tạo mới bên dưới */ }
  }
  let orderId = fixedOrderId;
  let status = 'Pending';
  if (!orderId) {
    const { data: order } = await httpClient.post(createPath);
    orderId = order.id;
    status = order.status;
  }
  const image = await loadQr(orderId);
  if (!image) return { orderId, image: null, startedAt: Date.now(), status };
  const result = { orderId, image, startedAt: Date.now(), status: 'Pending' };
  writeCache(key, { orderId, image, startedAt: result.startedAt });
  return result;
}

export default function MomoQrPanel({ createPath, orderId: fixedOrderId, amount, description, onPaid, onCancelled, cacheTag = '' }) {
  const [state, setState] = useState({ phase: 'loading', orderId: '', image: null, startedAt: 0, error: '' });
  const [now, setNow] = useState(() => Date.now());
  const paidRef = useRef(false);
  const autoRef = useRef(false);
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;
  const key = keyOf(createPath, fixedOrderId, cacheTag);

  function markPaid(orderId) {
    if (paidRef.current) return;
    paidRef.current = true;
    setState((current) => ({ ...current, phase: 'paid' }));
    setTimeout(() => onPaidRef.current?.(orderId), SUCCESS_HOLD_MS);
  }

  function start() {
    paidRef.current = false;
    autoRef.current = false;
    setState({ phase: 'loading', orderId: '', image: null, startedAt: 0, error: '' });
    let promise = inflight.get(key);
    if (!promise) { promise = openOrder(createPath, fixedOrderId, key).finally(() => inflight.delete(key)); inflight.set(key, promise); }
    let cancelled = false;
    promise.then((result) => {
      if (cancelled) return;
      if (result.status === 'Paid') { markPaid(result.orderId); return; }
      if (!result.image) {
        setState({ phase: 'error', orderId: result.orderId, image: null, startedAt: 0, error: 'Đơn MoMo trước đó vẫn đang chờ nên chưa lấy lại được mã. Bấm "Tạo lại mã" để hủy đơn cũ và tạo mã mới.' });
        return;
      }
      setNow(Date.now());
      setState({ phase: 'ready', orderId: result.orderId, image: result.image, startedAt: result.startedAt, error: '' });
    }).catch((error) => {
      if (!cancelled) setState({ phase: 'error', orderId: '', image: null, startedAt: 0, error: errorText(error, 'Chưa tạo được mã MoMo lúc này.') });
    });
    return () => { cancelled = true; };
  }

  useEffect(() => start(), [key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Đồng hồ đếm ngược, hết hạn thì dừng; tới mốc AUTO_PAY_MS thì báo thanh toán (bản demo).
  useEffect(() => {
    if (state.phase !== 'ready') return undefined;
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      const elapsed = current - state.startedAt;
      if (elapsed >= EXPIRE_MS) { setState((s) => (s.phase === 'ready' ? { ...s, phase: 'expired' } : s)); return; }
      if (autoPayEnabled && elapsed >= AUTO_PAY_MS && !autoRef.current && !paidRef.current) {
        autoRef.current = true;
        httpClient.post(`${orderUrl(state.orderId)}/thanh-toan`)
          .then(({ data }) => { if (data.status === 'Paid') markPaid(state.orderId); else autoRef.current = false; })
          .catch(() => { autoRef.current = false; });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [state.phase, state.orderId, state.startedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Khách thật quét bằng MoMo Test thì MoMo báo về, ta hỏi trạng thái định kỳ.
  useEffect(() => {
    if (state.phase !== 'ready') return undefined;
    const timer = setInterval(async () => {
      if (paidRef.current) return;
      try {
        const { data } = await httpClient.post(`${orderUrl(state.orderId)}/momo/trang-thai`);
        if (data.status === 'Paid') markPaid(state.orderId);
      } catch { /* lần hỏi sau sẽ thử lại */ }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [state.phase, state.orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function recreate() {
    try { if (state.orderId) await httpClient.post(`${orderUrl(state.orderId)}/huy`); } catch { /* vẫn thử tiếp */ }
    try { sessionStorage.removeItem(key); } catch { /* bỏ qua */ }
    if (fixedOrderId) { onCancelled?.(); return; }
    start();
  }

  const remaining = EXPIRE_MS - (now - state.startedAt);
  const urgent = state.phase === 'ready' && remaining <= 60_000;
  const orderCode = state.orderId ? String(state.orderId).replace(/\D/g, '').slice(-7) || state.orderId : '';
  return (
    <div className="momo-qr" aria-live="polite">
      <header className="momo-qr-top">
        <div className="momo-qr-brand">
          <span className="momo-qr-logo" aria-hidden="true"><i>mo</i><i>mo</i></span>
          <span className="momo-qr-sep" aria-hidden="true" />
          <strong>QR Đa Năng</strong>
        </div>
        <p>THANH TOÁN BẰNG MỌI ỨNG DỤNG</p>
      </header>
      <section className="momo-qr-card">
        <h3>HOMESTAYDORM</h3>
        {amount != null && <p className="momo-qr-amount">{money(amount)}</p>}
        {description && <p className="momo-qr-desc">{description}</p>}
        {state.phase === 'loading' && <p className="momo-qr-status">Đang tạo mã MoMo…</p>}
        {state.phase === 'ready' && (
          <>
            <figure className="momo-qr-figure">
              <img src={state.image} alt="Mã QR MoMo của khoản thanh toán" width="280" height="280" />
              <span className="momo-qr-center" aria-hidden="true">HSD</span>
            </figure>
            {orderCode && (
              <p className="momo-qr-code">COM-QRC ID: {orderCode}
                <button type="button" aria-label="Sao chép mã" title="Sao chép mã" onClick={() => navigator.clipboard?.writeText(orderCode)}><Icon name="copy" /></button>
              </p>
            )}
          </>
        )}
        {state.phase === 'paid' && (
          <div className="momo-qr-done" role="status">
            <span className="momo-qr-check"><Icon name="check_circle" /></span>
            <strong>Đã thanh toán</strong>
            <span>Đang chuyển tới kết quả…</span>
          </div>
        )}
        {state.phase === 'expired' && (
          <div className="momo-qr-error" role="status">
            <p>Mã QR đã hết hạn.</p>
            <button type="button" className="kp-btn kp-btn-primary" onClick={recreate}>Tạo mã mới</button>
          </div>
        )}
        {state.phase === 'error' && (
          <div className="momo-qr-error" role="alert">
            <p>{state.error}</p>
            <button type="button" className="kp-btn kp-btn-soft" onClick={recreate}>Tạo lại mã</button>
          </div>
        )}
        <div className="momo-qr-banks">
          <p>Nhận tiền từ mọi Ví Điện Tử và Ngân Hàng</p>
          <div><span className="momo-qr-mini" aria-hidden="true"><i>mo</i><i>mo</i></span><span className="momo-qr-sep" aria-hidden="true" /><span>50+ ngân hàng</span></div>
        </div>
      </section>
      {state.phase === 'ready' && (
        <footer className="momo-qr-foot">
          <p className={`momo-qr-timer${urgent ? ' is-urgent' : ''}`}><Icon name="schedule" /> Mã hết hạn sau <strong>{clock(remaining)}</strong></p>
          <p className="momo-qr-wait"><span className="momo-qr-dot" /> Mở MoMo, chọn Quét mã và quét mã trên. Đang chờ thanh toán…</p>
        </footer>
      )}
    </div>
  );
}
