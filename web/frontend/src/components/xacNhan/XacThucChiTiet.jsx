import React, { useState } from 'react';
import { explorerTx, trustedDeployment } from '../../lib/avalanche/api.js';
import { eventLabels, receiptTime } from './receiptDisplay.js';

const networkName = chainId => chainId === 43113 ? 'Avalanche Fuji (mạng thử)'
  : chainId === 31337 ? 'Chain thử nghiệm trên máy (local)' : `Chain ID ${chainId}`;
const shortHash = hash => hash.length > 12 ? `${hash.slice(0, 6)}…${hash.slice(-4)}` : hash;

export default function XacThucChiTiet({ receipts = [] }) {
  const [copied, setCopied] = useState('');
  return <details className="xn-tech">
    <summary>Thông tin xác thực trên Avalanche</summary>
    <p>Mạng: {networkName(trustedDeployment.chainId)}</p>
    {!receipts.length ? <p>Chưa có giao dịch được ghi nhận.</p> : <ul>
      {receipts.map((receipt, index) => {
        const hash = receipt.hash || '';
        const at = receiptTime(receipt.at);
        const url = hash ? explorerTx(hash) : null;
        return <li key={`${hash}-${index}`}>
          <strong>{eventLabels[receipt.event] || receipt.event || 'Sự kiện'}</strong>{at && ` lúc ${at}`}
          {hash && <> · <code title={hash}>{shortHash(hash)}</code>{' '}
            <button type="button" className="xn-link" aria-label={`Sao chép mã giao dịch ${shortHash(hash)}`}
              onClick={async () => { try { await navigator.clipboard.writeText(hash); setCopied(hash); } catch { setCopied(''); } }}>
              {copied === hash ? 'Đã sao chép' : 'Sao chép mã đầy đủ'}
            </button>
            {url && <> · <a href={url} target="_blank" rel="noreferrer">Xem trên Snowtrace ↗</a></>}
          </>}
        </li>;
      })}
    </ul>}
  </details>;
}
