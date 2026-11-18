import React, { useEffect, useMemo, useState } from 'react';
import EmptyState from '../common/EmptyState.jsx';
import StatusFilterTabs from '../common/StatusFilterTabs.jsx';
import RepairItem from './RepairItem.jsx';
import { errorText, suaChuaApi } from './suaChua.api.js';
import './suaChua.css';

const FILTERS = [
  { key: '', label: 'Tất cả' }, { key: 'Chờ tiếp nhận', label: 'Chờ tiếp nhận' }, { key: 'Đang xử lý', label: 'Đang xử lý' },
  { key: 'Hoàn tất', label: 'Hoàn tất' }, { key: 'Từ chối', label: 'Từ chối' },
];

function Actions({ item, onDone }) {
  const [mode, setMode] = useState(''), [chiPhi, setChiPhi] = useState(''), [loiDoKhach, setLoiDoKhach] = useState(false), [ghiChu, setGhiChu] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function run(fn) {
    setBusy(true); setError('');
    try { await fn(); setMode(''); await onDone(); } catch (e) { setError(errorText(e, 'Chưa lưu được. Vui lòng thử lại.')); } finally { setBusy(false); }
  }
  if (!['Chờ tiếp nhận', 'Đang xử lý'].includes(item.trangThai)) return null;
  return <div className="scb-actions">
    {mode === 'done' && <>
      <fieldset className="scb-choice">
        <legend>Kết quả xử lý <span className="ui-required">*</span></legend>
        <label className={!loiDoKhach ? 'is-active' : ''}><input type="radio" name={`ket-qua-${item.maYeuCau}`} checked={!loiDoKhach} onChange={() => setLoiDoKhach(false)} />
          <span><strong>Bảo trì thông thường</strong><small>Hư do sử dụng bình thường, hao mòn. Chủ nhà chịu chi phí.</small></span></label>
        <label className={loiDoKhach ? 'is-active' : ''}><input type="radio" name={`ket-qua-${item.maYeuCau}`} checked={loiDoKhach} onChange={() => setLoiDoKhach(true)} />
          <span><strong>Do khách gây ra</strong><small>Chi phí sửa được cộng vào hóa đơn tháng kế tiếp của khách.</small></span></label>
      </fieldset>
      <div className="scb-inline">
        <label className="ui-form-field"><span>Chi phí sửa (đ){loiDoKhach && <span className="ui-required"> *</span>}</span><input className="ui-input" type="number" min="0" step="1000" value={chiPhi} onChange={(e) => setChiPhi(e.target.value)} /></label>
        <label className="ui-form-field"><span>{loiDoKhach ? 'Lý do tính cho khách' : 'Ghi chú xử lý'}{loiDoKhach && <span className="ui-required"> *</span>}</span><input className="ui-input" value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} placeholder={loiDoKhach ? 'Ví dụ: khách làm rơi đồ vỡ bồn rửa' : 'Ví dụ: đã thay ron vòi nước'} /></label>
      </div>
    </>}
    {mode === 'reject' && <label className="ui-form-field"><span>Lý do từ chối <span className="ui-required">*</span></span><input className="ui-input" value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} /></label>}
    {error && <p className="scb-message scb-message--error" role="alert">{error}</p>}
    <div className="scb-actions-row">
      {mode ? <>
        <button type="button" className="ui-btn ui-btn--secondary" disabled={busy} onClick={() => { setMode(''); setError(''); }}>Hủy</button>
        {mode === 'done' && <button type="button" className="ui-btn ui-btn--primary" disabled={busy} onClick={() => run(() => suaChuaApi.hoanTat(item.maYeuCau, { chiPhi: Number(chiPhi || 0), loiDoKhach, ghiChu }))}>Xác nhận hoàn tất</button>}
        {mode === 'reject' && <button type="button" className="ui-btn ui-btn--danger" disabled={busy || !ghiChu.trim()} onClick={() => run(() => suaChuaApi.tuChoi(item.maYeuCau, { lyDo: ghiChu }))}>Xác nhận từ chối</button>}
      </> : <>
        <button type="button" className="ui-btn ui-btn--secondary" disabled={busy} onClick={() => setMode('reject')}>Từ chối</button>
        {item.trangThai === 'Chờ tiếp nhận'
          ? <button type="button" className="ui-btn ui-btn--primary" disabled={busy} onClick={() => run(() => suaChuaApi.tiepNhan(item.maYeuCau))}>Tiếp nhận</button>
          : <button type="button" className="ui-btn ui-btn--primary" disabled={busy} onClick={() => setMode('done')}>Đã sửa xong</button>}
      </>}
    </div>
  </div>;
}

// Tab "Báo hỏng" của quản lý chi nhánh: tiếp nhận, ghi kết quả (chi phí, có do khách hay không) hoặc từ chối.
export default function ManagerRepairTab() {
  const [items, setItems] = useState(null), [error, setError] = useState(''), [filter, setFilter] = useState('');
  async function load() {
    setError('');
    try { const { data } = await suaChuaApi.danhSach(); setItems(data || []); }
    catch (e) { setItems([]); setError(errorText(e, 'Chưa tải được danh sách báo hỏng.')); }
  }
  useEffect(() => { load(); }, []);
  const counts = useMemo(() => Object.fromEntries(FILTERS.map(({ key }) => [key, (items || []).filter((item) => !key || item.trangThai === key).length])), [items]);
  const visible = (items || []).filter((item) => !filter || item.trangThai === filter);
  return <section className="scb-page" aria-label="Báo hỏng của khách">
    <div className="ui-list-toolbar"><StatusFilterTabs items={FILTERS} activeKey={filter} onChange={setFilter} counts={counts} ariaLabel="Lọc theo trạng thái báo hỏng" /></div>
    {error && <p className="scb-message scb-message--error" role="alert">{error}</p>}
    {items === null ? <p role="status">Đang tải...</p>
      : visible.length ? <div className="scb-list">{visible.map((item) => <RepairItem key={item.maYeuCau} item={item} showCustomer><Actions item={item} onDone={load} /></RepairItem>)}</div>
        : <div className="ui-card"><EmptyState message={filter ? `Không có báo hỏng "${filter}".` : 'Chưa có báo hỏng nào ở chi nhánh của bạn.'} /></div>}
  </section>;
}
