import React, { useState } from 'react';
import { createPublicClient, http, isAddress } from 'viem';
import { verifyEvidence } from '@homestaydorm/settlement/evidence';
import { CLOSURE_SCHEMA, verifyClosureEvidence } from '@homestaydorm/settlement/closure';
import { HandoverView } from '../../components/xacNhan/DocumentView.jsx';
import '../../components/xacNhan/xacNhan.css';
import './avalancheVerify.css';

const chainId = Number(import.meta.env.VITE_AVALANCHE_CHAIN_ID || 43113);
const address = import.meta.env.VITE_AVALANCHE_CONTRACT_ADDRESS || '';
const rpcUrl = import.meta.env.VITE_AVALANCHE_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc';
const deployment = { chainId, address };

export default function AvalancheVerifyPage() {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [evidence, setEvidence] = useState(null);

  async function onFile(event) {
    const file = event.target.files?.[0];
    setResult(null);
    setEvidence(null);
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setResult({ valid: false, reason: 'Tệp bằng chứng phải nhỏ hơn 8 MB.' });
      return;
    }
    setBusy(true);
    try {
      const bundle = JSON.parse(await file.text());
      const closure = bundle.schema === CLOSURE_SCHEMA;
      const needsChain = !closure || Object.keys(bundle.chainRecords || {}).length > 0;
      if (needsChain && (!Number.isSafeInteger(chainId) || chainId < 1 || !isAddress(address))) {
        setResult({ valid: false, reason: 'Ứng dụng chưa cấu hình contract Avalanche để kiểm chứng.' });
        return;
      }
      const client = createPublicClient({ transport: http(rpcUrl) });
      const checked = closure ? await verifyClosureEvidence(client, deployment, bundle) : await verifyEvidence(client, deployment, bundle);
      setResult(checked);
      if (checked.valid) setEvidence(bundle);
    } catch (error) {
      setResult({ valid: false, reason: `Không kiểm chứng được: ${error.message}` });
    } finally { setBusy(false); }
  }

  return (
    <main className="avalanche-verify">
      <a href="/">← HomeStayDorm</a>
      <h1>Kiểm chứng hồ sơ trên Avalanche</h1>
      <p>Chọn tệp bằng chứng do hai bên lưu giữ. Trình duyệt đối chiếu nội dung với contract đã cấu hình; tệp không được tải lên máy chủ HomeStayDorm.</p>
      {chainId === 43113 && isAddress(address) && <p>Mạng thử Avalanche Fuji · <a href={`https://testnet.snowtrace.io/address/${address}`} target="_blank" rel="noreferrer">Xem contract trên Snowtrace ↗</a></p>}
      <label htmlFor="evidence-file">Tệp bằng chứng JSON</label>
      <input id="evidence-file" type="file" accept=".json,application/json" onChange={onFile} disabled={busy} />
      {busy && <p role="status">Đang đọc trạng thái trên chain...</p>}
      {result && (
        <section aria-live="polite" className={result.valid ? 'avalanche-verify-ok' : 'avalanche-verify-error'}>
          {result.valid ? (
            <>
              {result.kind === 'closure' ? <>
                <h2>Gói bằng chứng kết thúc hợp đồng</h2>
                <p>{result.mode === 'without-consent' ? 'Đóng không có xác nhận của khách.' : 'Bản bàn giao và đối soát được khách xác nhận trên chuỗi.'}</p>
                <p><strong>{result.notice}</strong></p>
                <p>Mã băm Web2 khớp nội dung tệp; mã này không chứng minh danh tính bên lập hoặc việc chuyển tiền thực tế.</p>
                <p>Hợp đồng: {evidence?.web2.contractId} · Đối soát: {evidence?.web2.settlementId}</p>
                <p>Hoàn cọc: {evidence?.web2.refundDueVnd} đ · Thu thêm: {evidence?.web2.topUpDueVnd} đ</p>
                <p>Thời điểm ghi nhận đóng: {evidence?.web2.closedAt}</p>
                {evidence?.web2.reason && <p>Lý do: {evidence.web2.reason}</p>}
                {evidence?.web2.paymentProofs.map(proof => <div key={proof.id} className="avalanche-proof"><p>Chứng từ: {proof.name} · {proof.amountVnd} đ · {proof.paidAt}</p><p>SHA-256: <code>{proof.sha256}</code></p></div>)}
                {Object.entries(result.chainResults).map(([kind, checked]) => <p key={kind}>{kind === 'handover' ? 'Bàn giao' : 'Đối soát'}: khớp bản ghi trên chuỗi; {checked.accepted ? 'đã xác nhận' : 'chưa xác nhận'}.</p>)}
                {result.web2Only && <p>Hồ sơ này không có bản xác nhận trên chuỗi.</p>}
              </> : <><h2>Nội dung khớp bản ghi trên chain</h2><p>Trạng thái: {result.status}. {result.accepted ? 'Đã được bên cần xác nhận chấp nhận.' : 'Chưa được chấp nhận.'}</p></>}
              {result.kind === 'handover' && evidence && <HandoverView policy={evidence.documents.policy} handover={evidence.documents.handover} />}
              {result.kind === 'settlement' && (
                <p>Phiên bản {result.version}{result.superseded ? ' — đã có bản mới hơn' : ' — bản mới nhất'};
                  {result.disputed ? ' đã từng bị phản đối;' : ''}
                </p>
              )}
            </>
          ) : (
            <><h2>Chưa xác minh được</h2><p>{result.reason}</p></>
          )}
        </section>
      )}
      <p className="avalanche-verify-note">Bản ghi xác nhận dữ liệu và chữ ký ví; nó không xác minh tình trạng phòng hay giao dịch ngân hàng.</p>
    </main>
  );
}
