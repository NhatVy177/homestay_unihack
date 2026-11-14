import React, { useMemo, useState } from 'react';
import { Icon } from '../../components/common/Icon.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import './customerDepositHistory.css';

// Lịch sử đặt cọc (theo màn "Lịch sử đặt cọc" của dự án nhóm): yêu cầu giữ chỗ đang chờ quản lý + các phiếu cọc.
const dateLabel = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('vi-VN');
};
const money = (value) => (Number(value) > 0 ? `${Math.round(Number(value)).toLocaleString('vi-VN')} VNĐ` : 'Chưa tính');

// group: pending (chờ xác nhận) | payable (chờ thanh toán) | paid | closed
const DEPOSIT_STATES = {
  'Chờ thanh toán': { group: 'payable', label: 'Chờ thanh toán', desc: 'Phiếu cọc đã được lập. Vui lòng thanh toán trước hạn để giữ chỗ phòng.', canPay: true },
  'Bị từ chối': { group: 'payable', label: 'Chứng từ bị từ chối', desc: 'Chứng từ chưa hợp lệ. Vui lòng gửi lại chứng từ trước hạn thanh toán.', canPay: true },
  'Chờ xác nhận': { group: 'pending', label: 'Đã nộp minh chứng', desc: 'Kế toán đang kiểm tra và xác nhận đã nhận tiền cọc.' },
  'Hoàn tất': { group: 'paid', label: 'Đã cọc thành công', desc: 'Khoản cọc đã được ghi nhận. Phòng đã được giữ cho bạn.' },
  'Hết hạn': { group: 'closed', label: 'Hết hạn', desc: 'Đã quá hạn thanh toán, hệ thống đã nhả phòng. Liên hệ nhân viên Sale nếu vẫn muốn thuê.' },
  'Đã hủy': { group: 'closed', label: 'Đã hủy', desc: 'Phiếu cọc đã bị hủy.' },
};

export function buildDepositHistoryItems({ deposits = [], requests = [] }) {
  const requestItems = requests.map((item) => ({
    key: `yc-${item.maDangKy}-${item.maPhong}`, id: item.maDangKy, kind: 'request', room: item.tenPhong, branch: item.tenChiNhanh,
    group: 'pending', label: 'Chờ quản lý xác nhận', desc: 'Phòng chưa được giữ cho đến khi quản lý chi nhánh xác nhận (tối đa 12 giờ).',
    amount: null, form: item.hinhThucThue, when: ['Gửi lúc', item.guiLuc], sort: item.guiLuc, canPay: false,
  }));
  const depositItems = deposits.map((item) => {
    const state = DEPOSIT_STATES[item.trangThai] || { group: 'closed', label: item.trangThai || 'Không rõ', desc: '' };
    return {
      key: `coc-${item.maPhieuCoc}`, id: item.maPhieuCoc, kind: 'deposit', room: item.tenPhong || item.loaiPhong, branch: item.tenChiNhanh,
      group: state.group, label: state.label, desc: state.desc, amount: item.soTienCoc, form: item.hinhThucThue,
      when: ['Hạn thanh toán', item.thoiHanThanhToan], sort: item.thoiHanThanhToan, canPay: Boolean(state.canPay), source: item,
    };
  });
  return [...requestItems, ...depositItems].sort((a, b) => String(b.sort || '').localeCompare(String(a.sort || '')));
}

export default function CustomerDepositHistory({ deposits, requests, loading, error, onOpenDeposit, onGoViewing }) {
  const [query, setQuery] = useState('');
  const items = useMemo(() => buildDepositHistoryItems({ deposits, requests }), [deposits, requests]);
  const needle = query.trim().toLocaleLowerCase('vi-VN');
  const visible = needle ? items.filter((item) => [item.id, item.room, item.branch].filter(Boolean).join(' ').toLocaleLowerCase('vi-VN').includes(needle)) : items;
  const count = (group) => items.filter((item) => item.group === group).length;
  const stats = [['Tổng yêu cầu', items.length], ['Chờ xác nhận', count('pending')], ['Chờ thanh toán', count('payable')], ['Đã thanh toán', count('paid')]];

  return <section className="cdh-page" aria-label="Lịch sử đặt cọc">
    <header className="ui-card cdh-head">
      <div><h2>Lịch sử đặt cọc</h2><p>Theo dõi các yêu cầu đặt cọc sau khi bạn đã hoàn tất buổi xem phòng với nhân viên Sale.</p></div>
      <button type="button" className="ui-btn ui-btn--primary" onClick={onGoViewing}>Xem lịch xem phòng <Icon name="arrow_forward" /></button>
    </header>
    <div className="cdh-stats">{stats.map(([label, value], index) => <article key={label} className={`ui-card${index === 1 ? ' is-highlight' : ''}`}><strong>{String(value).padStart(2, '0')}</strong><span>{label}</span></article>)}</div>
    <div className="ui-card cdh-list">
      <label className="cdh-search"><Icon name="search" /><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo mã yêu cầu, phòng, chi nhánh..." aria-label="Tìm trong lịch sử đặt cọc" /></label>
      {error && <p className="customer-viewing-error" role="alert">{error}</p>}
      {loading && <p role="status">Đang tải lịch sử đặt cọc...</p>}
      {!loading && !visible.length && <div className="cdh-empty"><EmptyState message={items.length ? 'Không có yêu cầu nào phù hợp.' : 'Chưa có yêu cầu đặt cọc.'} />
        {!items.length && <p>Sau khi hoàn thành lịch xem phòng, bạn có thể gửi yêu cầu đặt cọc tại trang lịch xem phòng.</p>}</div>}
      {visible.map((item) => <article key={item.key} className="cdh-card" aria-label={`Đặt cọc ${item.id}`}>
        <div className="cdh-card-top">
          <div><small>{item.kind === 'request' ? `YÊU CẦU ${item.id}` : item.id}</small><h3>{item.room || 'Phòng đã chọn'}</h3>{item.branch && <p>{item.branch}</p>}</div>
          <span className={`cdh-chip cdh-chip--${item.group}`}>{item.label}</span>
        </div>
        <div className="cdh-facts">
          <div><small>Số tiền cọc</small><strong>{money(item.amount)}</strong></div>
          <div><small>Hình thức thuê</small><strong>{item.form || '—'}</strong></div>
          <div><small>{item.when[0]}</small><strong>{dateLabel(item.when[1])}</strong></div>
        </div>
        <p className="cdh-desc">{item.desc}</p>
        {item.kind === 'deposit' && <div className="cdh-actions">
          {item.canPay
            ? <button type="button" className="ui-btn ui-btn--primary" onClick={() => onOpenDeposit(item.source)}><Icon name="payments" /> Thanh toán cọc</button>
            : <button type="button" className="ui-btn ui-btn--secondary" onClick={() => onOpenDeposit(item.source)}>Xem chi tiết</button>}
        </div>}
      </article>)}
    </div>
  </section>;
}
