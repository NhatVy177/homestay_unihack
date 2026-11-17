import React, { useState } from 'react';
import { createPublicClient, http } from 'viem';
import { verifyEvidence } from '@homestaydorm/settlement/evidence';
import { rpcUrl, trustedDeployment } from '../../lib/avalanche/api.js';

// "Kiểm tra ngay": đối chiếu ngay trong trang bản biên bản/đối soát khách đang xem với bản đã lưu, không cần tải tệp lên trang khác.
// Việc đối chiếu chạy trong trình duyệt của khách (không gửi nội dung lên máy chủ HomeStayDorm).
export default function VerifyNow({ evidence, label = 'Kiểm tra ngay' }) {
  const [state, setState] = useState({ status: 'idle' });
  async function run() {
    setState({ status: 'busy' });
    try {
      const result = await verifyEvidence(createPublicClient({ transport: http(rpcUrl) }), trustedDeployment, evidence);
      setState(result.valid ? { status: 'ok', at: new Date() } : { status: 'bad', reason: result.reason });
    } catch (error) {
      setState({ status: 'bad', reason: `Chưa kiểm tra được lúc này: ${error.message}` });
    }
  }
  return <span className="xn-verify">
    <button type="button" className="xn-link" disabled={state.status === 'busy'} onClick={run}>{state.status === 'busy' ? 'Đang kiểm tra...' : label}</button>
    {state.status === 'ok' && <span className="xn-verify-ok" role="status">✅ Khớp với bản đã lưu, chưa bị chỉnh sửa (kiểm tra lúc {state.at.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})</span>}
    {state.status === 'bad' && <span className="xn-verify-bad" role="alert">⚠️ Chưa xác minh được: {state.reason}</span>}
  </span>;
}
