import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { createPublicClient, http } from 'viem';
import { abi } from '@homestaydorm/settlement/abi';
import { canonicalize, documentHash } from '@homestaydorm/settlement/evidence';
import { confirmationData } from '@homestaydorm/settlement/confirmation';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useSigner } from './signerContext.js';
import { HandoverView, SettlementView, Pill } from './DocumentView.jsx';
import { checkSnapshot, downloadEvidence } from '../../lib/avalanche/evidence.js';
import { avalancheApi, dateTime, errorMessage, privyAppId, rpcUrl, trustedDeployment } from '../../lib/avalanche/api.js';
import { emailNotice, receiptTime } from './receiptDisplay.js';
import './xacNhan.css';
const AccountSignerProvider = privyAppId ? lazy(() => import('./AccountSignerProvider.jsx')) : null;
const recordedAt = receipt => {
  const time = receiptTime(receipt?.at);
  return time ? ` lúc ${time}` : '';
};
const withoutTenant = ({ tenant, ...rest }) => canonicalize(rest);
/** D-012: section inside "Hợp đồng" (customer portal). Renders nothing when the feature is off. */
export default function HopDongXacNhanSection({ contractId, emptyText }) {
  const { user } = useAuth();
  const [config, setConfig] = useState(null);
  useEffect(() => { avalancheApi.get('/config').then(setConfig).catch(() => setConfig({ enabled: false })); }, []);
  if (!config?.enabled || user?.vaiTro !== 'KhachHang') return emptyText && config ? <p className="xn-muted">{emptyText}</p> : null;
  const body = <TenantCases contractId={contractId} emptyText={emptyText} />;
  if (!AccountSignerProvider) return body;
  return <Suspense fallback={body}>
    <AccountSignerProvider appId={privyAppId} mode={config.walletAuth === 'jwt' ? 'jwt' : 'email'} accountEmail={user.email}>{body}</AccountSignerProvider>
  </Suspense>;
}
/** D-015: one-time email code, shown only when the tenant first confirms. */
function EmailCodeGate({ signer, onCancel }) {
  const [email, setEmail] = useState(signer.accountEmail), [code, setCode] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const act = async fn => { setBusy(true); setError(''); try { await fn(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); } };
  return <div className="xn-form xn-gate">
    <strong>Xác nhận email trước khi ký</strong>
    <p className="xn-muted">Để bảo đảm đúng là bạn đang xác nhận, HomeStayDorm gửi một mã 6 số tới email của bạn. Bạn chỉ cần làm một lần trên trình duyệt này.</p>
    {!signer.codeSentTo ? <>
      {signer.accountEmail ? <p>Email: <strong>{signer.accountEmail}</strong></p>
        : <label>Email nhận mã (tài khoản chưa có email)<input type="text" value={email} onChange={e => setEmail(e.target.value)} /></label>}
      <div className="xn-actions">
        <button type="button" className="xn-btn" disabled={busy} onClick={() => act(() => signer.sendCode(email))}>{busy ? 'Đang gửi…' : 'Gửi mã'}</button>
        <button type="button" className="xn-btn secondary" disabled={busy} onClick={onCancel}>Hủy</button>
      </div>
    </> : <>
      <label>Mã đã gửi tới {signer.codeSentTo}<input type="text" inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="6 chữ số" /></label>
      <div className="xn-actions">
        <button type="button" className="xn-btn" disabled={busy || code.length !== 6} onClick={() => act(() => signer.verifyCode(code))}>{busy ? 'Đang kiểm tra…' : 'Xác nhận mã'}</button>
        <button type="button" className="xn-link" disabled={busy} onClick={() => act(() => signer.sendCode(signer.codeSentTo))}>Gửi lại mã</button>
        <button type="button" className="xn-btn secondary" disabled={busy} onClick={onCancel}>Hủy</button>
      </div>
    </>}
    {error && <div className="xn-alert error">{error}</div>}
  </div>;
}
function TenantCases({ contractId, emptyText }) {
  const signer = useSigner();
  const [cases, setCases] = useState(null), [error, setError] = useState('');
  const load = useCallback(async () => {
    const all = await avalancheApi.get('/cases');
    const visible = contractId ? all.filter(c => c.contractId === contractId) : all;
    setCases(visible);
    return visible;
  }, [contractId]);
  useEffect(() => { load().catch(e => setError(errorMessage(e))); }, [load]);
  if (!cases) return error ? <div className="xn-alert error">{error}</div> : null;
  if (!cases.length) return emptyText ? <p className="xn-muted">{emptyText}</p> : null;
  return cases.map(c => <TenantCase key={c.id} c={c} signer={signer} reload={load} />);
}
function TenantCase({ c, signer, reload }) {
  const [busy, setBusy] = useState(''), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [changeOpen, setChangeOpen] = useState(false), [reason, setReason] = useState('');
  const [disputeOpen, setDisputeOpen] = useState(false), [disputeReason, setDisputeReason] = useState('');
  const draft = c.drafts?.[c.drafts.length - 1];
  const shown = c.handover ? c.handover.documents : { policy: draft?.policy, handover: draft?.handover };
  const revision = c.handover?.revision ?? draft?.revision;
  const latest = c.versions[c.versions.length - 1];
  const waitingHandover = ['review', 'handover-pending'].includes(c.state);
  const run = async (label, fn, done) => {
    setBusy(label); setError(''); setNotice('');
    try {
      await fn();
      const updated = await reload().catch(() => []);
      setNotice(typeof done === 'function' ? done(updated.find(item => item.id === c.id)) : done);
    } catch (e) { setError(errorMessage(e)); await reload().catch(() => {}); } finally { setBusy(''); }
  };
  // D-015: if the email code is still needed, remember the action and resume it once ready.
  const [pending, setPending] = useState(null);
  const signerRef = useRef(signer);
  signerRef.current = signer;
  const signed = (label, fn, done) => {
    if (signer?.status === 'needs-email') { setPending({ label, fn, done }); return; }
    run(label, fn, done);
  };
  useEffect(() => {
    if (pending && signer?.status === 'ready') { const p = pending; setPending(null); run(p.label, p.fn, p.done); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, signer?.status]);
  const signReady = ['ready', 'needs-email'].includes(signer?.status) && Boolean(trustedDeployment.address);
  async function sign(action, reasonText) {
    const next = await avalancheApi.post(`/cases/${c.id}/prepare`, { action, reason: reasonText, revision: action === 1 ? revision : undefined });
    // The browser checks that what will be signed is exactly what the tenant is looking at (D-003).
    const same = action === 1
      ? withoutTenant(next.bundle.documents.handover.payload) === withoutTenant(shown.handover.payload)
        && canonicalize(next.bundle.documents.policy.payload) === canonicalize(shown.policy.payload)
      : canonicalize(next.bundle.documents.statement.payload) === canonicalize(latest.bundle.documents.statement.payload);
    if (!same) throw new Error('Nội dung vừa thay đổi so với bản bạn đang xem. Hãy tải lại trang và xem lại.');
    const client = createPublicClient({ transport: http(rpcUrl) });
    if (await client.getChainId() !== trustedDeployment.chainId) throw new Error('Không kết nối được hệ thống xác thực. Vui lòng thử lại.');
    await checkSnapshot(client, trustedDeployment, abi, next.bundle, next.typedData.message);
    if (action === 3 && documentHash(next.dispute.payload, next.dispute.salt) !== next.typedData.message.reasonHash) throw new Error('Nội dung phản hồi bị thay đổi.');
    const typedData = confirmationData(trustedDeployment, next.typedData.message);
    const signature = await signerRef.current.sign(typedData);
    await avalancheApi.post(`/cases/${c.id}/confirm`, { message: typedData.message, signature, dispute: next.dispute });
  }
  const signerHint = !signer ? 'Xác nhận điện tử đang được thiết lập cho hệ thống; bạn vẫn có thể gửi yêu cầu chỉnh sửa.'
    : !trustedDeployment.address ? 'Hệ thống xác thực chưa được cấu hình đầy đủ.'
      : signer.status === 'error' ? signer.error : signer.status === 'preparing' && pending ? 'Đang chuẩn bị xác nhận cho tài khoản của bạn…' : '';
  const handoverLabel = c.state === 'change-requested' ? ['Đã gửi yêu cầu chỉnh sửa', 'info'] : waitingHandover ? ['Chờ bạn xác nhận', 'warn'] : ['Đã xác nhận', 'done'];
  return <article className="xn-card">
    <div className="xn-head">
      <div><h3>Biên bản bàn giao phòng</h3><p>Hợp đồng {c.contractId} · bản số {revision} · phát hành {dateTime(draft?.publishedAt)}</p></div>
      <Pill label={handoverLabel} />
    </div>
    {waitingHandover && draft?.resolution && <div className="xn-alert info">Quản lý đã điều chỉnh theo yêu cầu: {draft.resolution}</div>}
    {c.state === 'change-requested' && <div className="xn-alert info">Bạn đã yêu cầu chỉnh sửa: “{draft.changeRequest?.reason}”. Quản lý sẽ phát hành bản mới và gửi email báo cho bạn.</div>}
    <HandoverView {...shown} />
    {waitingHandover && !c.pending && <>
      <p className="xn-muted">Kiểm tra kỹ tài sản và tình trạng phòng. Khi bấm xác nhận, bạn đồng ý biên bản này đúng với lúc nhận phòng. Nếu có sai sót, hãy yêu cầu chỉnh sửa.</p>
      <div className="xn-actions">
        <button type="button" className="xn-btn" disabled={!signReady || Boolean(busy)} onClick={() => signed('confirm', () => sign(1), updated => emailNotice(updated, 'handover-confirmed', 'Đã ghi nhận bạn xác nhận biên bản bàn giao. Bản lưu đã được gửi qua email.', 'Đã ghi nhận bạn xác nhận biên bản bàn giao. Bạn có thể tải bản lưu ở trên.'))}>
          {busy === 'confirm' ? 'Đang ghi nhận…' : 'Xác nhận biên bản'}</button>
        {c.state === 'review' && <button type="button" className="xn-btn secondary" disabled={Boolean(busy)} onClick={() => setChangeOpen(!changeOpen)}>Yêu cầu chỉnh sửa</button>}
      </div>
      {signerHint && <p className="xn-muted">{signerHint}</p>}
      {changeOpen && <div className="xn-form">
        <label>Nội dung cần chỉnh sửa<textarea rows={3} maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} placeholder="Ví dụ: nệm có vết rách ở góc nhưng biên bản ghi nguyên vẹn." /></label>
        <div className="xn-actions"><button type="button" className="xn-btn" disabled={!reason.trim() || Boolean(busy)}
          onClick={() => run('change', async () => { await avalancheApi.post(`/cases/${c.id}/change-request`, { reason }); setChangeOpen(false); setReason(''); }, 'Đã gửi yêu cầu chỉnh sửa cho quản lý.')}>Gửi yêu cầu</button></div>
      </div>}
    </>}
    {c.handover?.confirmationReceipt && <div className="xn-alert ok xn-saved">
      <strong>✅ Bạn đã xác nhận biên bản{recordedAt(c.handover.confirmationReceipt)}. Biên bản đã được lưu và không thể chỉnh sửa.</strong>
      <div className="xn-actions"><button type="button" className="xn-link" onClick={() => downloadEvidence(c.handover, `ban-giao-${c.contractId}.json`)}>Tải bản lưu biên bản</button>
        <a href="/kiem-chung-avalanche" target="_blank" rel="noreferrer">Kiểm tra biên bản</a></div>
      <span className="xn-muted">Tải file bản lưu lên để tự kiểm tra biên bản chưa bị sửa.</span>
    </div>}
    {latest && <section className="xn-doc">
      <div className="xn-head"><div><h3>Đối soát tiền cọc</h3><p>Phiên bản {latest.bundle.version}</p></div>
        <Pill label={latest.accepted ? ['Đã đồng ý', 'done'] : latest.dispute ? ['Đã gửi phản hồi', 'info'] : ['Chờ bạn xem', 'warn']} /></div>
      <SettlementView bundle={latest.bundle} />
      {latest.dispute && <div className="xn-alert info">Bạn đã phản hồi: “{latest.dispute.payload.reason}”. Kế toán sẽ xem xét và gửi phiên bản mới nếu có điều chỉnh.</div>}
      {c.state === 'settlement-pending' && !c.pending && <>
        <div className="xn-actions">
          <button type="button" className="xn-btn" disabled={!signReady || Boolean(busy)} onClick={() => signed('accept', () => sign(2), updated => emailNotice(updated, 'settlement-confirmed', 'Đã ghi nhận bạn đồng ý đối soát. Bản lưu đã được gửi qua email.', 'Đã ghi nhận bạn đồng ý đối soát. Bạn có thể tải bản lưu ở trên.'))}>{busy === 'accept' ? 'Đang ghi nhận…' : 'Đồng ý đối soát'}</button>
          <button type="button" className="xn-btn secondary" disabled={Boolean(busy)} onClick={() => setDisputeOpen(!disputeOpen)}>Không đồng ý / phản hồi</button>
        </div>
        {signerHint && <p className="xn-muted">{signerHint}</p>}
        {disputeOpen && <div className="xn-form">
          <label>Lý do<textarea rows={3} maxLength={2000} value={disputeReason} onChange={e => setDisputeReason(e.target.value)} placeholder="Ví dụ: vết rách nệm đã có trong biên bản bàn giao lúc nhận phòng." /></label>
          <div className="xn-actions"><button type="button" className="xn-btn" disabled={!signReady || !disputeReason.trim() || Boolean(busy)}
            onClick={() => signed('dispute', async () => { await sign(3, disputeReason); setDisputeOpen(false); setDisputeReason(''); }, updated => emailNotice(updated, 'settlement-disputed', 'Đã gửi phản hồi đối soát. Bản lưu đã được gửi qua email.', 'Đã gửi phản hồi đối soát. Bạn có thể tải bản lưu ở trên.'))}>Gửi phản hồi</button></div>
        </div>}
      </>}
      {(latest.bundle.confirmationReceipt || latest.disputeReceipt) && <div className="xn-alert ok xn-saved">
        <strong>✅ {latest.bundle.confirmationReceipt ? 'Bạn đã đồng ý bảng đối soát' : 'Bạn đã gửi phản hồi cho bảng đối soát'} phiên bản {latest.bundle.version}{recordedAt(latest.bundle.confirmationReceipt || latest.disputeReceipt)}. Bản lưu đã được ghi nhận.</strong>
        <div className="xn-actions"><button type="button" className="xn-link" onClick={() => downloadEvidence({ ...latest.bundle, dispute: latest.dispute, disputeReceipt: latest.disputeReceipt }, `doi-soat-${c.contractId}-v${latest.bundle.version}.json`)}>Tải bản lưu đối soát</button>
          <a href="/kiem-chung-avalanche" target="_blank" rel="noreferrer">Kiểm tra đối soát</a></div>
        <span className="xn-muted">Tải file bản lưu lên để tự kiểm tra đối soát chưa bị sửa.</span>
      </div>}
      <p className="xn-muted">Đồng ý đối soát không có nghĩa là đã nhận tiền; việc hoàn/thu tiền thực hiện theo quy trình thanh toán của HomeStayDorm.</p>
      {!latest.bundle.confirmationReceipt && !latest.disputeReceipt && <div className="xn-actions"><button type="button" className="xn-link" onClick={() => downloadEvidence({ ...latest.bundle, dispute: latest.dispute, disputeReceipt: latest.disputeReceipt }, `doi-soat-${c.contractId}-v${latest.bundle.version}.json`)}>Tải bản lưu đối soát</button></div>}
      {c.versions.length > 1 && <details className="xn-history"><summary>Các phiên bản trước ({c.versions.length - 1})</summary>
        <ol>{c.versions.slice(0, -1).map(v => <li key={v.bundle.version}>Phiên bản {v.bundle.version}{v.dispute ? ` — bạn phản hồi: “${v.dispute.payload.reason}”` : ''} — đã được thay bằng phiên bản mới.</li>)}</ol>
      </details>}
    </section>}
    {c.pending && <div className="xn-alert info">Đang ghi nhận thao tác gần nhất… <button type="button" className="xn-link" onClick={() => run('sync', () => avalancheApi.post(`/cases/${c.id}/sync`), 'Đã cập nhật trạng thái.')}>Cập nhật</button></div>}
    {pending && signer?.status === 'needs-email' && <EmailCodeGate signer={signer} onCancel={() => setPending(null)} />}
    {pending && signer?.status === 'preparing' && <div className="xn-alert info">Đang chuẩn bị xác nhận cho tài khoản của bạn…</div>}
    {error && <div className="xn-alert error" role="alert">{error}</div>}
    {notice && <div className="xn-alert ok" role="status">{notice}</div>}
    {c.drafts?.length > 1 && <details className="xn-history"><summary>Lịch sử chỉnh sửa biên bản ({c.drafts.length} bản)</summary>
      <ol>{c.drafts.map(d => <li key={d.revision}>Bản {d.revision} ({dateTime(d.publishedAt)}){d.resolution ? ` — điều chỉnh: ${d.resolution}` : ''}{d.changeRequest ? ` — bạn yêu cầu: “${d.changeRequest.reason}”` : ''}</li>)}</ol>
    </details>}
  </article>;
}
