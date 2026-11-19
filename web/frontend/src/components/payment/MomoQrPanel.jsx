import React, { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { httpClient } from '../../api/httpClient.js';
import './momoQrPanel.css';

// Mã QR MoMo hiện ngay khi khách chọn phương thức MoMo: tạo đơn, lấy mã từ MoMo Sandbox, rồi tự kiểm tra
// kết quả mỗi vài giây. Khách chỉ việc quét. Đơn đã tạo được nhớ theo `createPath` để đổi tab qua lại không tạo đơn mới.
const POLL_MS = 4000;
const inflight = new Map();
const cacheKey = (createPath) => `momo-panel:${createPath}`;
const readCache = (createPath) => { try { return JSON.parse(sessionStorage.getItem(cacheKey(createPath))); } catch { return null; } };
const writeCache = (createPath, value) => { try { sessionStorage.setItem(cacheKey(createPath), JSON.stringify(value)); } catch { /* QR vẫn hiện khi trình duyệt chặn lưu. */ } };
const errorText = (error, fallback) => error?.response?.data?.message || fallback;

async function renderQr(qrCode) {
  return QRCode.toDataURL(qrCode, { width: 280, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#A50064', light: '#FFFFFF' } });
}

// Trả về { orderId, image } cho đơn đang chờ của `createPath`; dùng lại đơn cũ nếu còn hiệu lực.
async function openOrder(createPath) {
  const cached = readCache(createPath);
  if (cached?.orderId && cached.image) {
    try {
      const { data } = await httpClient.get(`/thanh-toan-mo-phong/${encodeURIComponent(cached.orderId)}`);
      if (data.status === 'Pending' || data.status === 'Paid') return { ...cached, status: data.status };
    } catch { /* đơn cũ không còn: tạo đơn mới bên dưới */ }
  }
  const { data: order } = await httpClient.post(createPath);
  const { data } = await httpClient.post(`/thanh-toan-mo-phong/${encodeURIComponent(order.id)}/momo/qr`);
  if (!data.qrCode) return { orderId: order.id, image: null, existing: Boolean(data.existing), status: order.status };
  const image = await renderQr(data.qrCode);
  const result = { orderId: order.id, image, status: 'Pending' };
  writeCache(createPath, { orderId: order.id, image });
  return result;
}

export default function MomoQrPanel({ createPath, onPaid }) {
  const [state, setState] = useState({ phase: 'loading', orderId: '', image: null, error: '' });
  const paidRef = useRef(false);
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;
  const start = useCallback(() => {
    setState({ phase: 'loading', orderId: '', image: null, error: '' });
    let promise = inflight.get(createPath);
    if (!promise) { promise = openOrder(createPath).finally(() => inflight.delete(createPath)); inflight.set(createPath, promise); }
    let cancelled = false;
    promise.then((result) => {
      if (cancelled) return;
      if (result.status === 'Paid') { paidRef.current = true; onPaidRef.current?.(result.orderId); return; }
      if (!result.image) {
        setState({ phase: 'error', orderId: result.orderId, image: null, error: 'Đơn MoMo trước đó vẫn đang chờ nên chưa lấy lại được mã. Bấm "Tạo lại mã" để hủy đơn cũ và tạo mã mới.' });
        return;
      }
      setState({ phase: 'ready', orderId: result.orderId, image: result.image, error: '' });
    }).catch((error) => {
      if (!cancelled) setState({ phase: 'error', orderId: '', image: null, error: errorText(error, 'Chưa tạo được mã MoMo lúc này.') });
    });
    return () => { cancelled = true; };
  }, [createPath]);

  useEffect(() => start(), [start]);

  useEffect(() => {
    if (state.phase !== 'ready') return undefined;
    const timer = setInterval(async () => {
      if (paidRef.current) return;
      try {
        const { data } = await httpClient.post(`/thanh-toan-mo-phong/${encodeURIComponent(state.orderId)}/momo/trang-thai`);
        if (data.status === 'Paid') { paidRef.current = true; onPaidRef.current?.(state.orderId); }
      } catch { /* lần kiểm tra sau sẽ thử lại */ }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [state.phase, state.orderId]);

  async function recreate() {
    try { if (state.orderId) await httpClient.post(`/thanh-toan-mo-phong/${encodeURIComponent(state.orderId)}/huy`); } catch { /* vẫn thử tạo mới */ }
    try { sessionStorage.removeItem(cacheKey(createPath)); } catch { /* bỏ qua */ }
    start();
  }

  return (
    <div className="momo-qr" aria-live="polite">
      {state.phase === 'loading' && <p className="momo-qr-status">Đang tạo mã MoMo…</p>}
      {state.phase === 'ready' && (
        <>
          <figure className="momo-qr-figure">
            <span className="momo-qr-badge">MoMo</span>
            <img src={state.image} alt="Mã QR MoMo của khoản thanh toán" width="280" height="280" />
            <figcaption>Mở MoMo, chọn Quét mã rồi quét mã này. Trang tự cập nhật khi thanh toán xong.</figcaption>
          </figure>
        </>
      )}
      {state.phase === 'error' && (
        <div className="momo-qr-error" role="alert">
          <p>{state.error}</p>
          <button type="button" className="kp-btn kp-btn-soft" onClick={recreate}>Tạo lại mã</button>
        </div>
      )}
    </div>
  );
}
