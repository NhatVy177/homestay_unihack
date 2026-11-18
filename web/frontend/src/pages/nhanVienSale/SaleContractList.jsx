import React, { useState } from 'react';
import { Icon } from '../../components/common/Icon.jsx';
import StatusFilterTabs from '../../components/common/StatusFilterTabs.jsx';
import { dateKey, dateLabel } from './salePresentation.js';

export default function SaleContractList({ rows, loading, error, search, onSearch, date, onDate, onSelect, onView, onResidence, branch, formatRent, statusInfo }) {
  const [mode, setMode] = useState('pending');
  const pending = rows.filter(p => p.coTheLapHopDong);
  // Same view-contract condition used by the existing deposit lookup.
  const issued = rows.filter(p => !p.coTheLapHopDong && (p.trangThaiHoSoCuTru === 'Đã duyệt cư trú' || p.trangThaiCoc === 'Đã lập HĐ'));
  const keyword = search.trim().toLocaleLowerCase('vi-VN');
  const filtered = (mode === 'pending' ? pending : issued).filter(p => (!date || dateKey(p.thoiDiemDatCoc) === date)
    && [p.maPhieuDatCoc, p.hoTenKhachHang, p.sdt, p.viTriThue].join(' ').toLocaleLowerCase('vi-VN').includes(keyword));
  return <div className="sale-view sale-contract-list">
    <div className="sale-section-heading"><div><p>{mode === 'pending' ? <>Danh sách phiếu cọc đã được duyệt cư trú <span className="ui-badge ui-badge--success">Đạt</span> và đủ điều kiện lập hợp đồng.</> : 'Xem lại hợp đồng thuê đã lập từ phiếu cọc.'}</p><p className="sale-contract-branch"><Icon name="apartment" /> Chi nhánh của bạn: <strong>{branch || 'Chưa phân công'}</strong></p></div><div className="sale-actions"><StatusFilterTabs ariaLabel="Lọc phiếu hợp đồng" activeKey={mode} onChange={setMode} items={[{ key: 'pending', label: 'Phiếu chờ lập hợp đồng', count: pending.length }, { key: 'issued', label: 'Hợp đồng đã lập', count: issued.length }]} /></div></div>
    <section className="ui-card sale-contract-search" aria-label="Tìm kiếm phiếu hợp đồng"><label className="sale-search"><Icon name="search" /><span className="sale-sr-only">Tìm phiếu hợp đồng</span><input className="ui-input" placeholder="Tìm theo tên khách, mã phiếu, SĐT, mã phòng..." value={search} onChange={e => onSearch(e.target.value)} /></label><label className="ui-form-field">Ngày tạo phiếu<input className="ui-input" type="date" value={date} onChange={e => onDate(e.target.value)} /></label></section>
    {error && <p className="sale-alert sale-alert--danger" role="alert">{error}</p>}
    <section className="ui-card sale-contract-results" aria-label={mode === 'pending' ? 'Phiếu đủ điều kiện lập hợp đồng' : 'Hợp đồng đã lập'}>
      {loading ? <p className="sale-contract-empty" role="status">Đang tải danh sách phiếu...</p> : !filtered.length ? <div className="sale-contract-empty"><Icon name="filter_list" /><h2>{mode === 'pending' ? 'Không tìm thấy phiếu nào' : 'Chưa có hợp đồng đã lập'}</h2><p>{mode === 'pending' ? 'Thử điều chỉnh bộ lọc để xem thêm kết quả.' : 'Hợp đồng đã lập sẽ xuất hiện tại đây.'}</p></div>
        : <div className="sale-contract-table"><table className="ui-table"><thead><tr><th>Phiếu cọc</th><th>Khách hàng</th><th>Phòng / giường</th><th>Thông tin thuê</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{filtered.map(p => {
          const status = statusInfo(p);
          return <tr key={p.maPhieuDatCoc}><td><strong>{p.maPhieuDatCoc}</strong><small>{dateLabel(p.thoiDiemDatCoc)}</small></td><td><strong>{p.hoTenKhachHang}</strong><small>{p.sdt}</small></td><td>{p.viTriThue}<small>{p.hinhThucThue}</small></td><td>{formatRent(p.tongGiaThue ?? p.giaThue)}<small>{dateLabel(p.thoiGianNhanPhong)}</small></td><td><span className={`lhd-badge ${status.class}`}>{status.label}</span></td><td>{p.coTheLapHopDong ? <button className="ui-btn ui-btn--primary ui-btn--sm" onClick={() => onSelect(p)}>Lập hợp đồng</button> : <button className="ui-btn ui-btn--secondary ui-btn--sm" onClick={() => onView(p.maPhieuDatCoc)}>Xem hợp đồng</button>}</td></tr>;
        })}</tbody></table></div>}
    </section>
    {onResidence && <button className="sale-context-link" onClick={onResidence}><Icon name="person" /> Hỗ trợ khai thông tin người ở trước khi lập hợp đồng <Icon name="chevron_right" /></button>}
  </div>;
}
