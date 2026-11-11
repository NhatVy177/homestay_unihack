import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { datCocApi } from '../datCoc/datCoc.api.js';
import OverviewCards from '../../components/common/OverviewCards.jsx';
import ListSearch, { ListCount } from '../../components/common/ListSearch.jsx';
import TableState from '../../components/common/TableState.jsx';

const formatTien = (v) => `${Number(v || 0).toLocaleString('vi-VN')} đ`;

export default function TienMatChoNopQuyTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [search, setSearch] = useState('');
  const load = useCallback(async () => {
    try { setRows((await datCocApi.tienMatChoNopQuy()).data || []); setError(''); }
    catch (e) { setError(e.response?.data?.message || 'Không tải được danh sách'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const confirm = async id => {
    setBusy(id);
    try { await datCocApi.ghiNhanNopQuy(id); await load(); }
    catch (e) { setError(e.response?.data?.message || 'Không ghi nhận được nộp quỹ'); }
    finally { setBusy(''); }
  };

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(row => [row.maPhieuDatCoc, row.hoTen, row.maPhong].some(v => String(v || '').toLowerCase().includes(q)));
  }, [rows, search]);
  const tongTien = rows.reduce((sum, row) => sum + Number(row.soTienCoc || 0), 0);

  return <div className="ktp-container">
    <OverviewCards items={[
      { key: 'phieu', label: 'Phiếu chờ nộp quỹ', value: rows.length, icon: 'receipt_long' },
      { key: 'tien', label: 'Tổng tiền mặt đang giữ', value: formatTien(tongTien), icon: 'account_balance' }
    ]} />
    {error && rows.length > 0 && <p role="alert" className="ui-list-alert">{error}</p>}
    <div className="ui-list-toolbar">
      <ListSearch value={search} onChange={setSearch} placeholder="Mã phiếu, tên khách hoặc phòng..." />
      <ListCount shown={shown.length} total={rows.length} noun="phiếu" />
    </div>
    <section className="ktp-table-section ui-list-table-card">
      <table className="ktp-table"><thead><tr><th>Phiếu</th><th>Khách</th><th>Phòng</th><th className="ui-num">Số tiền</th><th>Đã thu lúc</th><th className="ui-num">Thao tác</th></tr></thead>
        <tbody>{loading ? <TableState kind="loading" colSpan={6} />
          : error && !rows.length ? <TableState kind="error" colSpan={6} message={error} />
          : shown.length ? shown.map(row => <tr key={row.maPhieuDatCoc}>
            <td className="ui-cell-code">{row.maPhieuDatCoc}</td><td><p className="ui-cell-main">{row.hoTen}</p></td><td>{row.maPhong}</td>
            <td className="ui-num">{formatTien(row.soTienCoc)}</td>
            <td>{row.thuLuc ? new Date(row.thuLuc).toLocaleString('vi-VN') : '—'}</td>
            <td className="ui-num"><button type="button" className="ui-btn ui-btn--primary ui-btn--sm" disabled={busy === row.maPhieuDatCoc}
              onClick={() => confirm(row.maPhieuDatCoc)}>Đã nộp quỹ</button></td>
          </tr>) : <TableState kind="empty" colSpan={6} message={rows.length ? 'Không có phiếu khớp từ khóa.' : 'Không có khoản tiền mặt chờ nộp quỹ.'} />}</tbody>
      </table>
    </section>
  </div>;
}
