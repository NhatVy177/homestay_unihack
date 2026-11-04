import React, { useEffect, useState } from 'react';
import { PrivyProvider, usePrivy, useWallets, useSignMessage, useSignTypedData } from '@privy-io/react-auth';
import { avalancheFuji, hardhat } from 'viem/chains';
import { createPublicClient, http } from 'viem';
import { abi } from '@homestaydorm/settlement/abi';
import { documentHash } from '@homestaydorm/settlement/evidence';
import { confirmationData } from '@homestaydorm/settlement/confirmation';
import { httpClient } from '../../api/httpClient.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { getAuthenticatedHomePath } from '../../auth/auth.routes.js';
import { checkSnapshot, downloadEvidence } from '../../lib/avalanche/evidence.js';
import './portal.css';
const appId = import.meta.env.VITE_PRIVY_APP_ID;
const trusted = {
  chainId: Number(import.meta.env.VITE_AVALANCHE_CHAIN_ID || 43113),
  address: import.meta.env.VITE_AVALANCHE_CONTRACT_ADDRESS || '',
};
const rpc = import.meta.env.VITE_AVALANCHE_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc';
const api = async (path, body) => (await (body === undefined ? httpClient.get('/avalanche' + path) : httpClient.post('/avalanche' + path, body))).data;
const stateLabels = { draft: 'Chưa phát hành', 'handover-pending': 'Chờ khách xác nhận bàn giao', active: 'Đã xác nhận bàn giao', 'settlement-pending': 'Chờ khách phản hồi đối soát', disputed: 'Khách đã phản đối', accepted: 'Đã thống nhất đối soát' };
function EvidenceView({ bundle }) {
  if (!bundle) return null;
  const docs = bundle.documents;
  return <div className="av-document">
    {docs.policy && <section><h3>Chính sách đầu kỳ</h3><p className="av-pre">{docs.policy.payload.text}</p></section>}
    {docs.handover && <section><h3>Biên bản bàn giao</h3>
      <p>Cọc thực tế còn giữ: <strong>{Number(docs.handover.payload.depositHeldVnd).toLocaleString('vi-VN')} VND</strong></p>
      <p className="av-pre">Ghi chú chung: {docs.handover.payload.notes || 'Không có'}</p>
      <ul>{docs.handover.payload.inventory.map((item, i) => <li key={i}>{item.item} — số lượng {item.quantity}: {item.condition}</li>)}</ul>
      <p>File đính kèm: {(docs.handover.payload.attachments || []).length || 'Không có'}</p>
      {(docs.handover.payload.attachments || []).map((file, index) => <div key={index}>
        <button type="button" onClick={() => {
          const bytes = Uint8Array.from(atob(file.dataBase64), c => c.charCodeAt(0));
          const url = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
          const link = document.createElement('a'); link.href = url; link.download = file.name; link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}>Tải bản gốc: {file.name}</button>
        {/^image\/(png|jpeg|webp)$/.test(file.mediaType) && <img alt={file.name} style={{ maxWidth: '100%', maxHeight: 300 }} src={'data:' + file.mediaType + ';base64,' + file.dataBase64} />}
      </div>)}
    </section>}
    {docs.statement && <section><h3>Đối soát phiên bản {bundle.version}</h3>
      <table><thead><tr><th>Khoản trừ</th><th>VND</th></tr></thead><tbody>{docs.statement.payload.items.map((i, n) => <tr key={n}><td>{i.description}</td><td>{Number(i.amountVnd).toLocaleString('vi-VN')}</td></tr>)}</tbody></table>
      <p>Hoàn dự kiến: <strong>{Number(docs.statement.payload.refundDueVnd).toLocaleString('vi-VN')} VND</strong></p>
      <p>Thu thêm dự kiến: <strong>{Number(docs.statement.payload.topUpDueVnd).toLocaleString('vi-VN')} VND</strong></p>
    </section>}
  </div>;
}
export default function PrivyPortal() {
  return <PrivyProvider appId={appId} config={{
    loginMethods: ['email'], appearance: { theme: 'light', accentColor: '#16796f' },
    embeddedWallets: { ethereum: { createOnLogin: 'users-without-wallets' } },
    defaultChain: trusted.chainId === 31337 ? hardhat : avalancheFuji, supportedChains: [avalancheFuji, hardhat],
  }}><Portal /></PrivyProvider>;
}
function Portal() {
  const { user } = useAuth();
  const { login, logout, authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const { signMessage } = useSignMessage();
  const { signTypedData } = useSignTypedData();
  const wallet = wallets.find(w => w.walletClientType === 'privy');
  const [cases, setCases] = useState([]), [linked, setLinked] = useState(null), [config, setConfig] = useState(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const [form, setForm] = useState({ sourceId: '', depositHeldVnd: '', policy: '', depositConfirmed: false });
  const [attachments, setAttachments] = useState([]), [selected, setSelected] = useState(null);
  const [reason, setReason] = useState(''), [review, setReview] = useState(null), [saved, setSaved] = useState(false);
  const [statementSource, setStatementSource] = useState('');
  const customer = user.vaiTro === 'KhachHang';
  async function load() {
    const cfg = await api('/config'); setConfig(cfg);
    if (cfg.enabled) {
      setCases(await api('/cases')); setLinked((await api('/wallet')).address);
    }
  }
  useEffect(() => { load().catch(e => setError(e.response?.data?.message || e.message)); }, [user.maNguoiDung]);
  const run = async fn => {
    setBusy(true); setError(''); setNotice('');
    try { await fn(); } catch (e) { setError(e.response?.data?.message || e.message); }
    finally { setBusy(false); }
  };
  const current = cases.find(c => c.id === selected);
  async function linkWallet() {
    if (!wallet) throw new Error('Ví trong app chưa sẵn sàng. Hãy hoàn tất đăng nhập email.');
    const challenge = await api('/wallet/challenge', { address: wallet.address });
    const { signature } = await signMessage({ message: challenge.message }, { address: wallet.address });
    await api('/wallet/link', { id: challenge.id, signature }); await load();
    setNotice('Đã thiết lập xác nhận cho tài khoản. Khi đổi thiết bị, đăng nhập lại cùng email để khôi phục ví.');
  }
  async function prepare(action) {
    if (!wallet || wallet.address.toLowerCase() !== linked?.toLowerCase()) throw new Error('Hãy đăng nhập đúng ví đã liên kết tài khoản.');
    const next = await api('/cases/' + current.id + '/prepare', { action, reason });
    const client = createPublicClient({ transport: http(rpc) });
    if (await client.getChainId() !== trusted.chainId) throw new Error('RPC kiểm tra đang sai mạng.');
    await checkSnapshot(client, trusted, abi, next.bundle, next.typedData.message);
    if (action === 3 && documentHash(next.dispute.payload, next.dispute.salt) !== next.typedData.message.reasonHash) throw new Error('Lý do phản đối bị thay đổi.');
    // Rebuild domain/types locally rather than trusting a typed-data object supplied by the server.
    next.typedData = confirmationData(trusted, next.typedData.message);
    setReview(next); setSaved(false);
  }
  async function confirm() {
    if (!saved || !review || !wallet) return;
    const client = createPublicClient({ transport: http(rpc) });
    await checkSnapshot(client, trusted, abi, review.bundle, review.typedData.message);
    const { signature } = await signTypedData(review.typedData, { address: wallet.address });
    await api('/cases/' + current.id + '/confirm', { message: review.typedData.message, signature, dispute: review.dispute, savedCopy: true });
    setReview(null); await load(); setNotice('Đã ghi nhận xác nhận. Tải bản bằng chứng hoàn chỉnh trong lịch sử bên dưới.');
  }
  async function pickFiles(event) {
    const files = Array.from(event.target.files || []);
    if (files.length > 10 || files.reduce((n, f) => n + f.size, 0) > 4 * 1024 * 1024) throw new Error('Tối đa 10 file, tổng 4 MB.');
    setAttachments(await Promise.all(files.map(async file => {
      const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); });
      return { name: file.name, mediaType: file.type, dataBase64: data };
    })));
  }
  return <main className="av-portal">
    <header><a href={getAuthenticatedHomePath(user)}>← Về trang của tôi</a><a href="/kiem-chung-avalanche">Tự kiểm chứng bằng chứng</a></header>
    <h1>Bàn giao & đối soát đã xác nhận</h1>
    <p>Xem đúng nội dung, giữ bản sao và chủ động xác nhận. Ứng dụng trả phí ghi nhận; tiền cọc vẫn xử lý theo quy trình hiện tại.</p>
    {error && <p role="alert" className="av-error">{error}</p>}{notice && <p role="status">{notice}</p>}
    {config && !config.enabled && <p>Chức năng xác nhận đang được chuẩn bị. Vui lòng thử lại sau.</p>}
    {customer && config?.enabled && <section>
      <h2>Thiết lập xác nhận trong tài khoản</h2>
      <p>{linked ? 'Tài khoản đã có ví xác nhận: ' + linked : 'Dùng email để thiết lập và khôi phục xác nhận khi đổi thiết bị.'}</p>
      {!authenticated ? <button disabled={!ready || busy} onClick={() => login()}>Tiếp tục bằng email</button> :
        <><button disabled={busy || !wallet} onClick={() => run(linkWallet)}>Liên kết ví đang đăng nhập</button><button disabled={busy} onClick={() => logout()}>Khóa/đổi phiên ví</button></>}
    </section>}
    {config?.enabled && user.chucVu === 'Quản lý' && <form onSubmit={e => { e.preventDefault(); run(async () => { const c = await api('/cases', { ...form, attachments }); setSelected(c.id); await load(); }); }}>
      <h2>Phát hành biên bản bàn giao đã lập</h2>
      <label>Mã biên bản Web2<input required maxLength={6} value={form.sourceId} onChange={e => setForm({ ...form, sourceId: e.target.value })} /></label>
      <label>Cọc thực tế còn giữ (VND)<input required type="number" min="0" step="1" value={form.depositHeldVnd} onChange={e => setForm({ ...form, depositHeldVnd: e.target.value })} /></label>
      <label>Chính sách đầu kỳ<textarea required maxLength={8000} value={form.policy} onChange={e => setForm({ ...form, policy: e.target.value })} /></label>
      <label>Ảnh/tài liệu gốc (tổng tối đa 4 MB)<input type="file" multiple onChange={e => run(() => pickFiles(e))} /></label>
      <label><input type="checkbox" required checked={form.depositConfirmed} onChange={e => setForm({ ...form, depositConfirmed: e.target.checked })} />Tôi đã đối chiếu số cọc thực tế còn giữ, không suy ra từ giá thuê.</label>
      <button disabled={busy}>Phát hành để khách xem và xác nhận</button>
    </form>}
    <section><h2>Hồ sơ của tôi</h2><button disabled={busy} onClick={() => run(load)}>Tải lại</button>
      {!cases.length && <p>Chưa có hồ sơ xác nhận.</p>}
      {cases.map(c => <button className={selected === c.id ? 'av-selected' : ''} key={c.id} disabled={busy} onClick={() => { setSelected(c.id); setReview(null); setSaved(false); }}>{c.contractId} — {stateLabels[c.state]}{c.pending ? ' (đang đồng bộ)' : ''}</button>)}
    </section>
    {current && <section>
      <h2>Hợp đồng {current.contractId}</h2>
      <button disabled={busy} onClick={() => run(async () => { await api('/cases/' + current.id + '/sync', {}); await load(); })}>Đồng bộ giao dịch / thử phát hành lại bản nháp</button>
      <EvidenceView bundle={current.handover} />
      <button onClick={() => downloadEvidence(current.handover)}>Tải bản bàn giao {current.handover.confirmationReceipt ? 'đã xác nhận' : 'chưa được khách xác nhận'}</button>
      {customer && current.state === 'handover-pending' && !current.pending && <button disabled={busy} onClick={() => run(() => prepare(1))}>Xem và xác nhận biên bản</button>}
      {current.versions.map(v => <article key={v.bundle.version}>
        <EvidenceView bundle={v.bundle} />
        <p>{v.accepted ? 'Khách đã đồng ý' : v.dispute ? 'Khách phản đối: ' + v.dispute.payload.reason : 'Chờ xác nhận'}{v.bundle.version !== current.versions.length ? ' — đã có phiên bản mới hơn' : ''}</p>
        <button onClick={() => downloadEvidence({ ...v.bundle, dispute: v.dispute, disputeReceipt: v.disputeReceipt })}>Lưu bằng chứng phiên bản {v.bundle.version}</button>
      </article>)}
      {user.chucVu === 'Kế toán' && ['active', 'disputed'].includes(current.state) && !current.pending && <form onSubmit={e => { e.preventDefault(); run(async () => { await api('/cases/' + current.id + '/settlements', { sourceId: statementSource }); await load(); }); }}>
        <h3>{current.state === 'disputed' ? 'Phát hành phiên bản mới sau điều chỉnh Web2' : 'Phát hành bảng đối soát'}</h3>
        <label>Mã đối soát Web2<input required maxLength={6} value={statementSource} onChange={e => setStatementSource(e.target.value)} /></label><button disabled={busy}>Phát hành bản mới và giữ lịch sử cũ</button>
      </form>}
      {customer && current.state === 'settlement-pending' && !current.pending && <div>
        <button disabled={busy} onClick={() => run(() => prepare(2))}>Xem và đồng ý đối soát</button>
        <label>Lý do phản đối<textarea value={reason} maxLength={2000} onChange={e => setReason(e.target.value)} /></label>
        <button disabled={busy || !reason.trim()} onClick={() => run(() => prepare(3))}>Xem và phản đối phiên bản này</button>
      </div>}
      {current.receipts.map(r => <p key={r.hash}>Ghi nhận: {r.event} — {trusted.chainId === 43113 ? <a target="_blank" rel="noreferrer" href={'https://testnet.snowtrace.io/tx/' + r.hash}>{r.hash}</a> : r.hash}</p>)}
    </section>}
    {review && <section className="av-review"><h2>Kiểm tra trước khi xác nhận</h2><EvidenceView bundle={review.bundle} />
      {review.dispute && <p>Bạn phản đối vì: {review.dispute.payload.reason}</p>}
      <p>Bản sao trước khi ký chưa phải bằng chứng khách đã xác nhận trên chain.</p>
      <button onClick={() => downloadEvidence({ ...review.bundle, pendingConfirmation: { message: review.typedData.message, dispute: review.dispute } })}>1. Tải bản sao nội dung đang xem</button>
      <label><input type="checkbox" checked={saved} onChange={e => setSaved(e.target.checked)} />Tôi đã lưu và giữ được bản sao, đã đọc nội dung và các khoản tiền ở trên.</label>
      <button disabled={!saved || busy} onClick={() => run(confirm)}>2. Ký và {review.dispute ? 'gửi phản đối' : 'xác nhận'}</button>
      <button disabled={busy} onClick={() => setReview(null)}>Hủy</button>
    </section>}
    {busy && <p role="status">Đang xử lý, chờ ghi nhận và kiểm tra giao dịch…</p>}
  </main>;
}
