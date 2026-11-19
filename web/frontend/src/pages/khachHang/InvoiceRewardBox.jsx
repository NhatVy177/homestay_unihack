import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { httpClient } from '../../api/httpClient.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useSigner } from '../../components/xacNhan/signerContext.js';
import EmailCodeGate from '../../components/xacNhan/EmailCodeGate.jsx';
import { avalancheApi, privyAppId } from '../../lib/avalanche/api.js';
import { Icon } from '../../components/common/Icon.jsx';
import './customerRewards.css';

// D-082: dùng điểm thưởng ngay trên trang thanh toán hóa đơn tháng. Đổi điểm (ký bằng ví nhúng) xong,
// backend áp voucher vào chính hóa đơn đang mở và trang cập nhật số tiền cần trả.
const SignerProvider = lazy(() => import('../../components/xacNhan/AccountSignerProvider.jsx'));
const endpoint = '/diem-thuong';
const money = (amount) => `${Number(amount).toLocaleString('vi-VN')}đ`;
const errorText = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

export default function InvoiceRewardBox({ contractId, invoiceId, onApplied }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [mode, setMode] = useState(null);
  const refresh = useCallback(async () => {
    try { const { data: next } = await httpClient.get(endpoint); setData(next); return next; } catch { return null; }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!privyAppId) return undefined;
    let alive = true;
    avalancheApi.get('/config').then((config) => { if (alive && config.enabled) setMode(config.walletAuth); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  if (!data?.enabled) return null;
  const body = <RewardBody data={data} refresh={refresh} contractId={contractId} invoiceId={invoiceId} onApplied={onApplied} />;
  if (!mode || !privyAppId) return body;
  return <Suspense fallback={null}><SignerProvider appId={privyAppId} mode={mode} accountEmail={user?.email}>{body}</SignerProvider></Suspense>;
}

function RewardBody({ data, refresh, contractId, invoiceId, onApplied }) {
  const signer = useSigner();
  const [busy, setBusy] = useState(false);
  const [waitingId, setWaitingId] = useState('');
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const appliedRef = useRef(false);
  const ready = signer?.status === 'ready';
  const eligible = data.contracts.some((row) => row.id === contractId);
  const enough = data.balance >= data.voucherPoints;

  // Chờ chuỗi xác nhận lượt đổi điểm, rồi báo trang tải lại số tiền hóa đơn.
  useEffect(() => {
    if (!waitingId) return undefined;
    const timer = setInterval(async () => {
      const next = await refresh();
      const row = next?.history?.find((item) => item.id === waitingId);
      if (!row || row.status === 'Queued' || row.status === 'Sent') return;
      setWaitingId('');
      if (row.status === 'Failed') { setError('Đổi điểm chưa thành công. Vui lòng thử lại.'); return; }
      if (row.appliedInvoiceId === invoiceId && !appliedRef.current) {
        appliedRef.current = true;
        setNotice(`Đã trừ ${money(row.discountVnd || data.voucherVnd)} vào hóa đơn ${invoiceId}.`);
        onApplied?.();
      } else {
        setNotice('Đổi điểm thành công. Ưu đãi sẽ tự trừ vào hóa đơn tháng kế tiếp.');
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [waitingId, refresh, invoiceId, onApplied, data.voucherVnd]);

  async function redeem() {
    if (!ready || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const { data: quote } = await httpClient.post(`${endpoint}/doi-uu-dai`, { contractId });
      if (quote.contractId !== contractId) throw new Error('Hợp đồng không khớp.');
      const signature = await signer.sign(quote.typedData);
      await httpClient.post(`${endpoint}/doi-uu-dai/${encodeURIComponent(quote.id)}`, { signature });
      setWaitingId(quote.id);
      setNotice('Đang đổi điểm, vài giây nữa số tiền hóa đơn sẽ được cập nhật…');
    } catch (e) { setError(errorText(e, 'Chưa đổi được điểm. Vui lòng thử lại.')); }
    finally { setBusy(false); }
  }

  return <section className="dc-section-card dpay-card reward-pay" aria-label="Điểm thưởng">
    <div className="reward-pay-head">
      <span className="reward-pay-icon"><Icon name="sparkle" /></span>
      <div><h3 className="dc-section-title">Điểm thưởng của bạn</h3><p>{data.balance.toLocaleString('vi-VN')} điểm · đổi {data.voucherPoints} điểm giảm {money(data.voucherVnd)}</p></div>
    </div>
    {notice && <p className="reward-feedback" role="status">{notice}</p>}
    {error && <p className="reward-feedback is-error" role="alert">{error}</p>}
    {!waitingId && !appliedRef.current && (
      !enough ? <p className="reward-pay-note">Chưa đủ {data.voucherPoints} điểm để dùng cho hóa đơn này. Mỗi hóa đơn tháng trả đúng hạn được {data.awardPoints} điểm.</p>
        : !eligible ? <p className="reward-pay-note">Hợp đồng này đang có một ưu đãi chờ áp dụng, chưa đổi thêm được.</p>
          : signer?.status === 'needs-email'
            ? (verifyOpen ? <div className="reward-gate"><EmailCodeGate signer={signer} onCancel={() => setVerifyOpen(false)} /></div>
              : <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setVerifyOpen(true)}>Xác nhận email để dùng điểm</button>)
            : <button type="button" className="ui-btn ui-btn--primary" disabled={!ready || busy} onClick={redeem}>
              {busy ? 'Đang xử lý…' : ready ? `Dùng ${data.voucherPoints} điểm, giảm ${money(data.voucherVnd)}` : 'Đang chuẩn bị ví…'}
            </button>
    )}
  </section>;
}
