import React, { useEffect, useState } from 'react';
import StatusBadge from '../common/StatusBadge.jsx';
import { ConfirmationNotice } from '../xacNhan/ConfirmationFeedback.jsx';
import { closureError, downloadClosure, getClosure } from './checkoutClosure.api.js';
import './checkoutClosure.css';
export default function CheckoutClosureCard({ contractId }) {
  const [status, setStatus] = useState(null), [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false; setStatus(null); setError('');
    getClosure(contractId).then(value => { if (!cancelled) setStatus(value); }).catch(e => { if (!cancelled) setError(closureError(e)); });
    return () => { cancelled = true; };
  }, [contractId]);
  if (!status?.hasReturn && !error) return null;
  return <section className="ui-card checkout-customer-card"><h3>Kết thúc hợp đồng</h3>
    {error && <ConfirmationNotice tone="danger">{error}</ConfirmationNotice>}
    {status && <>
      <StatusBadge status={status.closed ? 'Đã thanh lý' : status.response.overdue ? 'Quá hạn phản hồi' : 'Chờ hoàn tất'} tone={status.closed ? 'success' : 'warning'} />
      {status.mode === 'without-consent' && <p>Hợp đồng đã đóng không có xác nhận của khách.</p>}
      {!status.closed && <p>{status.response.overdue ? 'Vui lòng kiểm tra hồ sơ bàn giao và đối soát.' : 'Hồ sơ đang chờ hoàn tất xác nhận và thu/hoàn.'}</p>}
      {!status.closed && <ul className="checkout-missing">{status.money.missing.map(text => <li key={text}>{text}</li>)}</ul>}
      {status.closed && <div className="checkout-actions"><button className="ui-btn ui-btn--primary" onClick={() => downloadClosure(contractId).catch(e => setError(closureError(e)))}>Tải gói bằng chứng kết thúc</button><a className="ui-btn ui-btn--secondary" href="/kiem-chung-avalanche" target="_blank" rel="noreferrer">Kiểm chứng hồ sơ</a></div>}
      <p>Thông tin thu/chi do bên cho thuê ghi nhận, không nằm trên chuỗi.</p>
    </>}
  </section>;
}
