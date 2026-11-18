import React, { lazy, Suspense, useCallback, useEffect, useId, useRef, useState } from 'react';
import { httpClient } from '../../api/httpClient.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useSigner } from '../../components/xacNhan/signerContext.js';
import EmailCodeGate from '../../components/xacNhan/EmailCodeGate.jsx';
import { avalancheApi, dateTime, privyAppId } from '../../lib/avalanche/api.js';
import { Icon } from '../../components/common/Icon.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import './customerRewards.css';

const SignerProvider = lazy(() => import('../../components/xacNhan/AccountSignerProvider.jsx'));
const endpoint = '/diem-thuong';
const money = amount => Number(amount).toLocaleString('vi-VN') + 'đ';
const message = (error, fallback) => error.response?.data?.message || fallback;
const pending = row => row.status === 'Queued' || row.status === 'Sent';

export default function CustomerProfileRewards({ defaultOpen = false }) {
  const detailsId = useId();
  const [open, setOpen] = useState(defaultOpen);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const id = ++request.current;
    setError('');
    try {
      const response = await httpClient.get(endpoint);
      if (id === request.current) setData(response.data);
    } catch (error) {
      if (id === request.current) setError(message(error, 'Chưa tải được điểm thưởng. Bạn có thể thử lại.'));
    }
  }, []);
  useEffect(() => {
    void refresh();
    return () => { request.current += 1; };
  }, [refresh]);
  const processing = Boolean(data?.history?.some(row => pending(row) && (data.linked || row.type === 'Redeem')));
  useEffect(() => {
    if (!open || !processing) return undefined;
    const timer = window.setInterval(() => { void refresh(); }, 8000);
    return () => window.clearInterval(timer);
  }, [open, processing, refresh]);

  if (data?.enabled === false) return null;
  function toggle() {
    if (!open) void refresh();
    setOpen(!open);
  }
  return <div className="reward-profile">
    <button type="button" className="reward-profile-toggle" aria-expanded={open} aria-controls={detailsId} onClick={toggle}>
      <span className="reward-profile-label"><Icon name="sparkle" />Điểm thưởng</span>
      <span className="reward-profile-score">
        <strong>{data ? `${data.balance.toLocaleString('vi-VN')} điểm` : error ? 'Xem chi tiết' : 'Đang tải…'}</strong>
        <Icon name={open ? 'expand_less' : 'expand_more'} />
      </span>
    </button>
    <div id={detailsId} hidden={!open}>
      {open && <div className="reward-page">
        {error && <p role="alert" className="reward-feedback is-error">{error}</p>}
        {!data && !error && <p role="status">Đang tải điểm thưởng…</p>}
        {!data && error && <button className="ui-btn ui-btn--secondary" type="button" onClick={refresh}>Thử lại</button>}
        {data?.enabled && <>
          <section className="ui-card reward-card" aria-labelledby={`${detailsId}-history`}>
            <div className="reward-history-heading">
              <h3 id={`${detailsId}-history`}>Lịch sử điểm thưởng</h3>
              <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={refresh}>Cập nhật số dư</button>
            </div>
            <p>Nhận {data.awardPoints} điểm khi thanh toán đúng hạn một hóa đơn tháng.</p>
            {!data.history.length && <p>Chưa có giao dịch điểm thưởng.</p>}
            {data.history.length > 0 && <ul className="reward-history">
              {data.history.map(row => <RewardRow key={row.id} row={row} data={data} />)}
            </ul>}
          </section>
          <RewardsWithSigner data={data} refresh={refresh} />
        </>}
      </div>}
    </div>
  </div>;
}

function RewardsWithSigner({ data, refresh }) {
  const { user } = useAuth();
  const [mode, setMode] = useState(null);
  useEffect(() => {
    if (!privyAppId) return undefined;
    let current = true;
    avalancheApi.get('/config')
      .then(config => { if (current && config.enabled) setMode(config.walletAuth); })
      .catch(() => {});
    return () => { current = false; };
  }, []);
  const actions = <RewardActions data={data} refresh={refresh} />;
  if (!mode || !privyAppId) return actions;
  return <Suspense fallback={<p role="status">Đang tải điểm thưởng…</p>}>
    <SignerProvider appId={privyAppId} mode={mode} accountEmail={user?.email}>{actions}</SignerProvider>
  </Suspense>;
}

function RewardActions({ data, refresh }) {
  const signer = useSigner();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [selectedContract, setSelectedContract] = useState('');
  const ready = signer?.status === 'ready';
  useEffect(() => { if (ready) void refresh(); }, [refresh, ready]);
  const contract = data.contracts.some(row => row.id === selectedContract) ? selectedContract : data.contracts[0]?.id || '';
  const redeeming = data.history.some(row => row.type === 'Redeem' && pending(row));
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
      await refresh();
    } catch (error) { setError(message(error, 'Chưa đổi được ưu đãi. Vui lòng thử lại.')); }
    finally { setBusy(false); }
  }
  return <section className="ui-card reward-card">
    <h3>Giảm {money(data.voucherVnd)} hóa đơn tháng</h3>
    {error && <p role="alert" className="reward-feedback is-error">{error}</p>}
    {notice && <p role="status" className="reward-feedback">{notice}</p>}
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
  </section>;
}

function RewardRow({ row, data }) {
  const award = row.type === 'Award';
  const title = award ? `Tích điểm từ hóa đơn ${row.invoiceId}` : `Ưu đãi ${money(row.discountVnd)} · Hợp đồng ${row.contractId}`;
  let label = 'Đang xử lý';
  let tone = 'warning';
  if (row.status === 'Failed') { label = 'Chưa thành công'; tone = 'danger'; }
  if (row.status === 'Confirmed') {
    label = award ? 'Đã cộng điểm' : row.appliedInvoiceId ? `Đã áp dụng · ${row.appliedInvoiceId}` : 'Chờ áp vào hóa đơn';
    tone = 'success';
  }
  if (award && pending(row) && !data.linked) label = 'Chờ xác nhận email';
  return <li>
    <div className="reward-history-entry">
      <strong>{title}</strong>
      {row.createdAt && <time dateTime={row.createdAt}>{dateTime(row.createdAt)}</time>}
    </div>
    <div className="reward-history-result">
      {row.status === 'Confirmed' && <strong className={award ? 'reward-earned' : undefined}>
        {award ? '+' : '−'}{award ? data.awardPoints : data.voucherPoints} điểm
      </strong>}
      <StatusBadge status={label} tone={tone} />
    </div>
  </li>;
}
