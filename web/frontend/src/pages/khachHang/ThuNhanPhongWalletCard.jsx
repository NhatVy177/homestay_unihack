import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { httpClient } from '../../api/httpClient.js';

const money = value => Number(value || 0).toLocaleString('vi-VN') + ' đ';

export default function ThuNhanPhongWalletCard({ contractId }) {
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let current = true;
    setQuote(null); setError('');
    httpClient.get(`/thanh-toan-mo-phong/thu-nhan-phong/${contractId}`)
      .then(({ data }) => { if (current) setQuote(data); })
      .catch(e => { if (current) setError(e?.response?.data?.message || 'Chưa tải được khoản thu kỳ đầu.'); });
    return () => { current = false; };
  }, [contractId]);
  if (!quote && !error) return null;
  if (quote?.status === 'Unavailable') return null;
  const openPayment = async () => {
    setBusy(true); setError('');
    try {
      const { data } = await httpClient.post(`/thanh-toan-mo-phong/thu-nhan-phong/${contractId}`);
      navigate(`/thanh-toan-mo-phong/${data.id}`);
    } catch (e) { setError(e?.response?.data?.message || 'Không mở được cổng thanh toán mô phỏng.'); }
    finally { setBusy(false); }
  };
  return <section className="hd-card">
    <div className="hd-card-header"><h3>Thanh toán khi nhận phòng</h3></div>
    <div className="hd-card-body">
      {quote?.status === 'Paid' && <p>Khoản thu kỳ đầu của hợp đồng {contractId} đã thanh toán.</p>}
      {quote?.status === 'Accounting' && <p>Khoản thu kỳ đầu cần kế toán xử lý. Vui lòng liên hệ kế toán.</p>}
      {quote?.status === 'Pending' && <>
        <div className="hd-summary-row"><span>Khoản thu kỳ đầu</span><strong>{money(quote.amountVnd)}</strong></div>
        <button type="button" className="kp-btn kp-btn-primary" disabled={busy} onClick={openPayment}>
          {busy ? 'Đang mở cổng…' : 'MoMo (mô phỏng)'}
        </button>
      </>}
      {error && <p role="alert">{error}</p>}
    </div>
  </section>;
}
