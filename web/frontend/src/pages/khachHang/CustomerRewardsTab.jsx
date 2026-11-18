import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { httpClient } from '../../api/httpClient.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useSigner } from '../../components/xacNhan/signerContext.js';
import EmailCodeGate from '../../components/xacNhan/EmailCodeGate.jsx';
import { avalancheApi, privyAppId } from '../../lib/avalanche/api.js';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import './customerRewards.css';

const SignerProvider = lazy(() => import('../../components/xacNhan/AccountSignerProvider.jsx'));
const endpoint = '/diem-thuong';
const money = amount => Number(amount).toLocaleString('vi-VN') + 'đ';
const message = (error, fallback) => error.response?.data?.message || fallback;
const pending = row => row.status === 'Queued' || row.status === 'Sent';

export default function CustomerRewardsTab() {
  const { user } = useAuth();
  const [mode, setMode] = useState(null);
  useEffect(() => {
    let current = true;
    avalancheApi.get('/config')
      .then(config => { if (current && config.enabled) setMode(config.walletAuth); })
      .catch(() => {});
    return () => { current = false; };
  }, []);
  if (!mode || !privyAppId) return <Rewards />;
  return <Suspense fallback={<p role="status">Đang tải điểm thưởng…</p>}>
    <SignerProvider appId={privyAppId} mode={mode} accountEmail={user?.email}><Rewards /></SignerProvider>
  </Suspense>;
}

function Rewards() {
  const signer = useSigner();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [selectedContract, setSelectedContract] = useState('');
  const ready = signer?.status === 'ready';
  const load = useCallback(async () => {
    const response = await httpClient.get(endpoint);
    setData(response.data);
  }, []);
  const refresh = useCallback(() => {
    setError('');
    return load().catch(error => setError(message(error, 'Chưa tải được điểm thưởng. Bạn có thể thử lại.')));
  }, [load]);
  useEffect(() => { void refresh(); }, [refresh, ready]);
  const processing = Boolean(data?.history?.some(row => pending(row) && (data.linked || row.type === 'Redeem')));
  useEffect(() => {
    if (!processing) return undefined;
    const timer = window.setInterval(() => { load().catch(() => {}); }, 8000);
    return () => window.clearInterval(timer);
  }, [load, processing]);
  const contract = data?.contracts?.some(row => row.id === selectedContract) ? selectedContract : data?.contracts?.[0]?.id || '';
  const redeeming = Boolean(data?.history?.some(row => row.type === 'Redeem' && pending(row)));
  async function redeem() {
    if (!ready || busy || !contract) return;
    setBusy(true);
    setNotice('');
    setError('');
    try {
      const { data: quote } = await httpClient.post(`${endpoint}/doi-uu-dai`, { contractId: contract });
      if (quote.contractId !== contract) throw new Error('Hợp đồng không khớp.');
      const signature = await signer.sign(quote.typedData);
      await httpClient.post(`${endpoint}/doi-uu-dai/${encodeURIComponent(quote.id)}`, { signature });
      setNotice('Đã gửi yêu cầu đổi điểm. Voucher sẽ hiện khi xử lý xong.');
      await load();
    } catch (error) { setError(message(error, 'Chưa đổi được ưu đãi. Vui lòng thử lại.')); }
    finally { setBusy(false); }
  }
  return <section className="reward-page">
    <h2>Điểm thưởng</h2>
    {error && <p role="alert" className="reward-feedback is-error">{error}</p>}
    {notice && <p role="status" className="reward-feedback">{notice}</p>}
    {!data && !error && <p role="status">Đang tải điểm thưởng…</p>}
    {!data && error && <button className="ui-btn ui-btn--secondary" type="button" onClick={refresh}>Thử lại</button>}
    {data && !data.enabled && <p>Chương trình điểm thưởng chưa được mở.</p>}
    {data?.enabled && <>
      <div className="reward-summary">
        <article className="ui-card reward-card">
          <span>Điểm hiện có</span>
          <strong className="reward-balance">{data.balance.toLocaleString('vi-VN')} điểm</strong>
          <p>Nhận {data.awardPoints} điểm khi thanh toán đúng hạn một hóa đơn tháng.</p>
          <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" disabled={busy} onClick={refresh}>Cập nhật số dư</button>
        </article>
        <article className="ui-card reward-card">
          <h3>Giảm {money(data.voucherVnd)} hóa đơn tháng</h3>
          <p>Đổi {data.voucherPoints} điểm để áp dụng ưu đãi cho hóa đơn kế tiếp đủ điều kiện.</p>
          {data.contracts.length > 0 && <label className="reward-field">Hợp đồng áp dụng
            <select className="ui-input" value={contract} disabled={busy} onChange={event => setSelectedContract(event.target.value)}>
              {data.contracts.map(row => <option value={row.id} key={row.id}>{row.id}</option>)}
            </select>
          </label>}
          {!data.linked && signer?.status === 'needs-email' && !verifyOpen &&
            <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setVerifyOpen(true)}>Xác nhận email để nhận điểm</button>}
          {data.linked && !ready && signer?.status === 'needs-email' && !verifyOpen && data.balance >= data.voucherPoints &&
            <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setVerifyOpen(true)}>Xác nhận email để đổi điểm</button>}
          {verifyOpen && signer?.status === 'needs-email' && <EmailCodeGate signer={signer} onCancel={() => setVerifyOpen(false)} />}
          {signer?.status === 'preparing' && <p role="status">Đang chuẩn bị xác nhận tài khoản…</p>}
          {signer?.status === 'error' && <p role="alert" className="reward-feedback is-error">{signer.error}</p>}
          {!signer && <p>Xác nhận qua email hiện chưa sẵn sàng.</p>}
          {data.linked && !contract && <p>Chưa có hợp đồng đủ điều kiện đổi ưu đãi.</p>}
          <button type="button" className="ui-btn ui-btn--primary" onClick={redeem}
            disabled={!ready || busy || redeeming || !contract || data.balance < data.voucherPoints}>
            {busy || redeeming ? 'Đang xử lý…' : 'Đổi ưu đãi'}
          </button>
        </article>
      </div>
      <section className="ui-card reward-card" aria-label="Lịch sử điểm thưởng">
        <h3>Lịch sử điểm thưởng</h3>
        {!data.history.length && <p>Chưa có điểm hoặc ưu đãi nào được ghi nhận.</p>}
        {data.history.length > 0 && <ul className="reward-history">
          {data.history.map(row => <RewardRow key={row.id} row={row} linked={data.linked} />)}
        </ul>}
      </section>
    </>}
  </section>;
}

function RewardRow({ row, linked }) {
  const award = row.type === 'Award';
  const title = award ? `Tích điểm từ hóa đơn ${row.invoiceId}` : `Ưu đãi ${money(row.discountVnd)} · Hợp đồng ${row.contractId}`;
  let label = 'Đang xử lý';
  let tone = 'warning';
  if (row.status === 'Failed') { label = 'Chưa thành công'; tone = 'danger'; }
  if (row.status === 'Confirmed') {
    label = award ? 'Đã cộng điểm' : row.appliedInvoiceId ? `Đã áp dụng · ${row.appliedInvoiceId}` : 'Chờ áp vào hóa đơn';
    tone = 'success';
  }
  if (award && pending(row) && !linked) label = 'Chờ xác nhận email';
  return <li><span>{title}</span><StatusBadge status={label} tone={tone} /></li>;
}
