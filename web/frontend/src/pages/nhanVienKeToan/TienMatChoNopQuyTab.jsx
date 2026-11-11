import React, { useCallback, useEffect, useState } from 'react';
import { datCocApi } from '../datCoc/datCoc.api.js';

export default function TienMatChoNopQuyTab() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const load = useCallback(async () => {
    try { setRows((await datCocApi.tienMatChoNopQuy()).data || []); setError(''); }
    catch (e) { setError(e.response?.data?.message || 'Không tải được danh sách'); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const confirm = async id => {
    setBusy(id);
    try { await datCocApi.ghiNhanNopQuy(id); await load(); }
    catch (e) { setError(e.response?.data?.message || 'Không ghi nhận được nộp quỹ'); }
    finally { setBusy(''); }
  };
  return <div className="ktp-container">
    <h2>Tiền mặt chờ nộp quỹ</h2>
    {error && <p role="alert" style={{ color: '#b3261e' }}>{error}</p>}
    <table className="ktp-table"><thead><tr><th>Phiếu</th><th>Khách</th><th>Phòng</th><th>Số tiền</th><th>Đã thu lúc</th><th>Thao tác</th></tr></thead>
      <tbody>{rows.length ? rows.map(row => <tr key={row.maPhieuDatCoc}>
        <td>{row.maPhieuDatCoc}</td><td>{row.hoTen}</td><td>{row.maPhong}</td>
        <td>{Number(row.soTienCoc || 0).toLocaleString('vi-VN')} đ</td>
        <td>{row.thuLuc ? new Date(row.thuLuc).toLocaleString('vi-VN') : '—'}</td>
        <td><button className="ktp-btn-action-fill" disabled={busy === row.maPhieuDatCoc}
          onClick={() => confirm(row.maPhieuDatCoc)}>Đã nộp quỹ</button></td>
      </tr>) : <tr><td colSpan={6}>Không có khoản tiền mặt chờ nộp quỹ.</td></tr>}</tbody>
    </table>
  </div>;
}
