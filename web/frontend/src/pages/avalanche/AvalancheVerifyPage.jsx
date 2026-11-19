import React, { useState } from 'react';
import { createPublicClient, http, isAddress } from 'viem';
import { verifyEvidence } from '@homestaydorm/settlement/evidence';
import { CLOSURE_SCHEMA, verifyClosureEvidence } from '@homestaydorm/settlement/closure';
import { HandoverView } from '../../components/xacNhan/DocumentView.jsx';
import { ConfirmationNotice } from '../../components/xacNhan/ConfirmationFeedback.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import '../../components/xacNhan/xacNhan.css';
import './avalancheVerify.css';

const chainId = Number(import.meta.env.VITE_AVALANCHE_CHAIN_ID || 43113);
const address = import.meta.env.VITE_AVALANCHE_CONTRACT_ADDRESS || '';
const rpcUrl = import.meta.env.VITE_AVALANCHE_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc';
const deployment = { chainId, address };

function EvidenceStatus({ result }) {
  if (result.superseded) return <StatusBadge status="Đã có bản mới hơn" tone="neutral" />;
  if (result.accepted) return <StatusBadge status="Đã xác nhận" tone="success" />;
  return <StatusBadge status={result.disputed ? 'Đã phản đối' : 'Chờ xác nhận'} tone="warning" />;
}

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
      <p>Dùng khi bạn muốn tự kiểm tra biên bản của mình có đúng với bản đã lưu hay không. Hãy chọn file biên bản (đuôi .json) mà bạn đã tải về từ HomeStayDorm hoặc nhận qua email. Việc đối chiếu với Avalanche diễn ra ngay trên máy bạn, file không được gửi đi đâu.</p>
      {chainId === 43113 && isAddress(address) && <p>Mạng thử Avalanche Fuji · <a href={`https://testnet.snowtrace.io/address/${address}`} target="_blank" rel="noreferrer">Xem contract trên Snowtrace ↗</a></p>}
      <label htmlFor="evidence-file">Chọn file biên bản của bạn (.json)</label>
      <input id="evidence-file" type="file" accept=".json,application/json" onChange={onFile} disabled={busy} />
      {busy && <ConfirmationNotice>Đang đối chiếu hồ sơ…</ConfirmationNotice>}
      {result && (
        <section className="avalanche-verify-result">
          {result.valid ? (
            <>
              <ConfirmationNotice tone="success">Nội dung khớp với bản đã lưu.</ConfirmationNotice>
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
                {Object.entries(result.chainResults).map(([kind, checked]) => <p className="avalanche-verify-state" key={kind}>
                  <strong>{kind === 'handover' ? 'Bàn giao' : 'Đối soát'}</strong>
                  <EvidenceStatus result={checked} />
                </p>)}
                {result.web2Only && <p>Hồ sơ này không có bản xác nhận trên chuỗi.</p>}
              </> : <p className="avalanche-verify-state">
                <EvidenceStatus result={result} />
              </p>}
              {result.kind === 'handover' && evidence && <HandoverView showTechnical policy={evidence.documents.policy} handover={evidence.documents.handover} />}
              {result.kind === 'settlement' && (
                <p>Phiên bản {result.version}{result.superseded ? ' — đã có bản mới hơn' : ' — bản mới nhất'};
                  {result.disputed ? ' đã từng bị phản đối;' : ''}
                </p>
              )}
            </>
          ) : (
            <ConfirmationNotice tone="danger"><strong>Chưa xác minh được</strong><p>{result.reason}</p></ConfirmationNotice>
          )}
        </section>
      )}
      <p className="avalanche-verify-note">Bản ghi xác nhận dữ liệu và chữ ký ví; nó không xác minh tình trạng phòng hay giao dịch ngân hàng.</p>
    </main>
  );
}
