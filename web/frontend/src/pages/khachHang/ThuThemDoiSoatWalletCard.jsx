import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { httpClient } from '../../api/httpClient.js';

const money = value => Number(value || 0).toLocaleString('vi-VN') + ' đ';

// C3 / D-030 (3): once the tenant agreed to a settlement with an amount due, pay it through the
// simulated wallet. Hidden until there is something to pay; cash/transfer at the counter still works.
export default function ThuThemDoiSoatWalletCard({ contractId }) {
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let current = true;
    setQuote(null); setError('');
    httpClient.get(`/thanh-toan-mo-phong/thu-them/${contractId}`)
      .then(({ data }) => { if (current) setQuote(data); })
      .catch(e => { if (current && e?.response?.status !== 404) setError(e?.response?.data?.message || 'Chưa tải được khoản thu thêm.'); });
    return () => { current = false; };
  }, [contractId]);
  if (!quote && !error) return null;
  if (quote?.status === 'Unavailable') return null;
  const openPayment = async () => {
    setBusy(true); setError('');
    try {
      const { data } = await httpClient.post(`/thanh-toan-mo-phong/thu-them/${contractId}`);
      navigate(`/thanh-toan-mo-phong/${data.id}`);
    } catch (e) { setError(e?.response?.data?.message || 'Không mở được cổng thanh toán mô phỏng.'); }
    finally { setBusy(false); }
  };
  return <section className="hd-card">
    <div className="hd-card-header"><h3>Thanh toán khi trả phòng</h3></div>
    <div className="hd-card-body">
      {quote?.status === 'Paid' && <p>Khoản thu thêm theo đối soát đã thanh toán.</p>}
      {quote?.status === 'Pending' && <>
        <div className="hd-summary-row"><span>Khoản phải trả thêm theo đối soát bạn đã đồng ý</span><strong>{money(quote.amountVnd)}</strong></div>
        <button type="button" className="kp-btn kp-btn-primary" disabled={busy} onClick={openPayment}>
          {busy ? 'Đang mở cổng…' : 'Ví điện tử (mô phỏng)'}
        </button>
        <p>Bạn cũng có thể trả tiền mặt hoặc chuyển khoản cho kế toán.</p>
      </>}
      {error && <p role="alert">{error}</p>}
    </div>
  </section>;
}
