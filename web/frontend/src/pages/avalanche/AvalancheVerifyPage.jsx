import React, { useState } from 'react';
import { createPublicClient, http, isAddress } from 'viem';
import { verifyEvidence } from '@homestaydorm/settlement/evidence';
import './avalancheVerify.css';

const chainId = Number(import.meta.env.VITE_AVALANCHE_CHAIN_ID || 43113);
const address = import.meta.env.VITE_AVALANCHE_CONTRACT_ADDRESS || '';
const rpcUrl = import.meta.env.VITE_AVALANCHE_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc';
const deployment = { chainId, address };

export default function AvalancheVerifyPage() {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onFile(event) {
    const file = event.target.files?.[0];
    setResult(null);
    if (!file) return;
    if (!Number.isSafeInteger(chainId) || chainId < 1 || !isAddress(address)) {
      setResult({ valid: false, reason: 'Ứng dụng chưa cấu hình contract Avalanche để kiểm chứng.' });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setResult({ valid: false, reason: 'Tệp bằng chứng phải nhỏ hơn 8 MB.' });
      return;
    }
    setBusy(true);
    try {
      const bundle = JSON.parse(await file.text());
      const client = createPublicClient({ transport: http(rpcUrl) });
      setResult(await verifyEvidence(client, deployment, bundle));
    } catch (error) {
      setResult({ valid: false, reason: `Không kiểm chứng được: ${error.message}` });
    } finally { setBusy(false); }
  }

  return (
    <main className="avalanche-verify">
      <a href="/">← HomeStayDorm</a>
      <h1>Kiểm chứng hồ sơ trên Avalanche</h1>
      <p>Chọn tệp bằng chứng do hai bên lưu giữ. Trình duyệt đối chiếu nội dung với contract đã cấu hình; tệp không được tải lên máy chủ HomeStayDorm.</p>
      <label htmlFor="evidence-file">Tệp bằng chứng JSON</label>
      <input id="evidence-file" type="file" accept=".json,application/json" onChange={onFile} disabled={busy} />
      {busy && <p role="status">Đang đọc trạng thái trên chain...</p>}
      {result && (
        <section aria-live="polite" className={result.valid ? 'avalanche-verify-ok' : 'avalanche-verify-error'}>
          {result.valid ? (
            <>
              <h2>Nội dung khớp bản ghi trên chain</h2>
              <p>Trạng thái: {result.status}. {result.accepted ? 'Đã được bên cần xác nhận chấp nhận.' : 'Chưa được chấp nhận.'}</p>
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
