import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '../../components/common/Icon.jsx';
import { hoaDonDinhKyApi } from './hoaDonDinhKy.api.js';
import './hoaDonDinhKy.css';

// Màn "Hóa đơn định kỳ" của kế toán, theo bố cục và chức năng màn cùng tên của nhóm Hằng (AccountantMonthlyPage):
// thẻ tổng quan theo kỳ, tab "Lập hóa đơn định kỳ" (chọn hợp đồng, chốt chỉ số, dịch vụ, phí phát sinh) và tab "Danh sách hóa đơn".
const STANDARD_FEES = [
  { value: 'voi_sen', label: 'Đền bù làm hỏng vòi sen tắm', code: 'CPPS-8821', amount: 150000 },
  { value: 'the_tu', label: 'Đền bù làm mất thẻ từ/chìa khóa', code: 'CPPS-4102', amount: 100000 },
  { value: 've_sinh', label: 'Phạt vi phạm nội quy vệ sinh', code: 'CPPS-1104', amount: 200000 },
  { value: 'tu_ao', label: 'Đền bù hư hỏng tủ quần áo', code: 'CPPS-5531', amount: 500000 },
  { value: 'phu_thu', label: 'Phí phụ thu vệ sinh phòng thêm', code: 'CPPS-3211', amount: 300000 },
  { value: 'ban_hoc', label: 'Đền bù làm hư hỏng bàn học + ghế', code: 'CPPS-6204', amount: 150000 },
  { value: 'khoa_cua', label: 'Đền bù làm hỏng khóa cửa điện tử', code: 'CPPS-7128', amount: 800000 },
  { value: 'giuong_nem', label: 'Đền bù hư hỏng giường đơn + nệm', code: 'CPPS-9901', amount: 200000 },
  { value: 'other', label: 'Khác (Tự nhập chi tiết)', code: 'CPPS', amount: 0 },
];
const STATUS_LABEL = { paid: 'Đã thu', pending: 'Chờ TT', overdue: 'Quá hạn' };
const STATUS_FULL = { paid: 'Đã thanh toán', pending: 'Chờ thanh toán', overdue: 'Quá hạn' };

const money = (v) => `${Math.round(Number(v) || 0).toLocaleString('vi-VN')} đ`;
const plain = (v) => Math.round(Number(v) || 0).toLocaleString('vi-VN');
const showPeriod = (p) => (p ? `${p.slice(5, 7)}/${p.slice(0, 4)}` : '');
const day = (v) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '—');
const today = () => new Date().toISOString().slice(0, 10);
const currentPeriod = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const errorOf = (e, fallback) => e?.response?.data?.message || fallback;
const suffix = () => Math.floor(1000 + Math.random() * 9000);

function printInvoice(inv) {
  const rows = (inv.chiTiet || []).map((l) => `<tr><td>${l.tenDichVu}</td><td>${l.soLuong ?? ''} ${l.donViTinh || ''}</td><td>${plain(l.donGia)}</td><td>${plain(l.thanhTien)}</td></tr>`).join('');
  const fees = (inv.phiPhatSinh || []).map((f) => `<tr><td>${f.tenPhi}</td><td></td><td></td><td>${plain(f.soTien)}</td></tr>`).join('');
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${inv.maHoaDon}</title><style>
    body{font-family:"Segoe UI",Arial,sans-serif;color:#191C1A;margin:24px}h1{color:#4A6549;font-size:22px;margin:0 0 4px}
    table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #E0E3DF;padding:6px 8px;text-align:left}th{background:#F1F4F0}
    .total{font-size:18px;font-weight:700;color:#4A6549;text-align:right;margin-top:12px}</style></head><body>
    <h1>Hóa đơn ${inv.maHoaDon}</h1><p>Kỳ ${showPeriod(inv.kyThanhToan)} · ${inv.hoTen} · ${inv.tenPhong} · Hạn thanh toán ${day(inv.ngayHanTT)}</p>
    <table><thead><tr><th>Khoản</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>
    <tr><td>Tiền phòng</td><td>1 tháng</td><td>${plain(inv.tienPhong)}</td><td>${plain(inv.tienPhong)}</td></tr>${rows}${fees}</tbody></table>
    <p class="total">Tổng cộng: ${plain(inv.tongTien)} VNĐ</p></body></html>`);
  win.document.close(); win.focus(); setTimeout(() => win.print(), 300);
}

export default function HoaDonDinhKyTab() {
  const [contracts, setContracts] = useState([]), [invoices, setInvoices] = useState([]);
  const [loadError, setLoadError] = useState(''), [notice, setNotice] = useState(null);
  const [activeTab, setActiveTab] = useState('input');
  const [period, setPeriod] = useState(''), [branch, setBranch] = useState('all'), [status, setStatus] = useState('all');
  const [search, setSearch] = useState(''), [contractSearch, setContractSearch] = useState('');
  const [selectedId, setSelectedId] = useState(''), [detail, setDetail] = useState(null), [detailError, setDetailError] = useState('');
  const [elecOld, setElecOld] = useState(0), [elecNew, setElecNew] = useState(0), [waterOld, setWaterOld] = useState(0), [waterNew, setWaterNew] = useState(0);
  const [busy, setBusy] = useState(false);
  const [drawer, setDrawer] = useState(null), [payMethod, setPayMethod] = useState('Chuyển khoản');
  const [feeModal, setFeeModal] = useState(null);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const [c, i] = await Promise.all([hoaDonDinhKyApi.danhSachHopDong(), hoaDonDinhKyApi.danhSachHoaDon()]);
      setContracts(c.data || []); setInvoices(i.data || []);
      setPeriod((p) => p || (c.data || []).map((x) => x.kyCanLap).sort()[0] || currentPeriod());
    } catch (e) { setLoadError(errorOf(e, 'Chưa tải được dữ liệu hóa đơn định kỳ.')); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // resetReadings = false khi chỉ làm mới phí phát sinh, để giữ chỉ số kế toán đang nhập.
  const loadDetail = useCallback(async (maHopDong, resetReadings = true) => {
    if (resetReadings) setDetail(null);
    setDetailError('');
    if (!maHopDong) return;
    try {
      const { data } = await hoaDonDinhKyApi.chiTietLap(maHopDong);
      setDetail(data);
      if (!resetReadings) return;
      const cur = data.chiSo.current, prev = data.chiSo.previous;
      setElecOld(cur ? cur.dienDau : prev ? prev.dienCuoi : 0); setElecNew(cur ? cur.dienCuoi : prev ? prev.dienCuoi : 0);
      setWaterOld(cur ? cur.nuocDau : prev ? prev.nuocCuoi : 0); setWaterNew(cur ? cur.nuocCuoi : prev ? prev.nuocCuoi : 0);
    } catch (e) { setDetailError(errorOf(e, 'Chưa tải được thông tin hợp đồng.')); }
  }, []);
  useEffect(() => { loadDetail(selectedId); }, [selectedId, loadDetail]);

  const periodOptions = useMemo(() => [...new Set([...invoices.map((i) => i.kyThanhToan), ...contracts.map((c) => c.kyCanLap), period].filter(Boolean))]
    .sort((a, b) => b.localeCompare(a)), [invoices, contracts, period]);
  const branchOptions = useMemo(() => [...new Map([...invoices, ...contracts].filter((x) => x.maChiNhanh).map((x) => [x.maChiNhanh, x.tenChiNhanh])).entries()], [invoices, contracts]);
  const inBranch = (x) => branch === 'all' || x.maChiNhanh === branch;
  const q = search.trim().toLocaleLowerCase('vi-VN'), cq = contractSearch.trim().toLocaleLowerCase('vi-VN');
  const filteredInvoices = invoices.filter((i) => i.kyThanhToan === period && inBranch(i) && (status === 'all' || i.nhom === status)
    && (!q || [i.hoTen, i.tenPhong, i.maHoaDon].join(' ').toLocaleLowerCase('vi-VN').includes(q)));
  const filteredContracts = contracts.filter((c) => inBranch(c) && c.kyCanLap <= period
    && (!cq || [c.hoTen, c.tenPhong, c.maHopDong].join(' ').toLocaleLowerCase('vi-VN').includes(cq)));
  const expected = filteredInvoices.reduce((s, i) => s + i.tongTien, 0);
  const paid = filteredInvoices.filter((i) => i.nhom === 'paid').reduce((s, i) => s + i.tongTien, 0);
  const rate = expected > 0 ? ((paid / expected) * 100).toFixed(1) : '0';

  // Tính trước để kế toán thấy trước khi lập; số tiền cuối do máy chủ tính lại.
  const services = detail?.dichVu || [];
  const priceOf = (unit) => services.find((s) => s.donViTinh === unit)?.donGia || 0;
  const share = detail?.tyLeChia ?? 1;
  const elecUse = Math.max(0, Number(elecNew) - Number(elecOld)), waterUse = Math.max(0, Number(waterNew) - Number(waterOld));
  const elecCost = Math.round(elecUse * share * 100) / 100 * priceOf('kWh');
  const waterCost = Math.round(waterUse * share * 100) / 100 * priceOf('m3');
  const fixed = services.filter((s) => !['kWh', 'm3'].includes(s.donViTinh));
  const servicesCost = fixed.reduce((s, x) => s + x.donGia * x.soLuong, 0);
  const fees = detail?.phiPhatSinh || [];
  const feesCost = fees.filter((f) => f.trangThai === 'Đã xác nhận').reduce((s, f) => s + f.soTien, 0);
  const rent = detail?.hopDong.giaThue || 0;
  const total = rent + elecCost + waterCost + servicesCost + feesCost;
  const hasUnconfirmed = fees.some((f) => f.trangThai === 'Chưa xác nhận');
  const lockedReading = Boolean(detail?.chiSo.current);
  const firstReading = !detail?.chiSo.previous && !lockedReading;

  async function run(fn, done) {
    setBusy(true); setNotice(null);
    try { await fn(); if (done) setNotice({ type: 'success', text: done }); }
    catch (e) { setNotice({ type: 'error', text: errorOf(e, 'Thao tác chưa thành công.') }); }
    finally { setBusy(false); }
  }
  const createInvoice = (e) => {
    e.preventDefault();
    if (hasUnconfirmed) { setNotice({ type: 'error', text: 'Bạn có khoản phát sinh chưa xác nhận! Vui lòng xác nhận hoặc xóa bỏ trước khi lập hóa đơn.' }); return; }
    run(async () => {
      const { data } = await hoaDonDinhKyApi.lapHoaDon({ maHopDong: detail.hopDong.maHopDong, kyThanhToan: detail.kyThanhToan,
        chiSoDienCu: elecOld, chiSoDienMoi: elecNew, chiSoNuocCu: waterOld, chiSoNuocMoi: waterNew });
      setNotice({ type: 'success', text: `Lập hóa đơn định kỳ thành công! Mã hóa đơn ${data.maHoaDon}, tổng ${money(data.tongTien)}.` });
      setSelectedId(''); setDetail(null); setPeriod(data.kyThanhToan); await load(); setActiveTab('list');
    });
  };
  const confirmFee = (maPhi) => run(async () => { await hoaDonDinhKyApi.xacNhanPhi(maPhi); await loadDetail(selectedId, false); });
  const confirmAllFees = () => run(async () => {
    for (const f of fees.filter((x) => x.trangThai === 'Chưa xác nhận')) await hoaDonDinhKyApi.xacNhanPhi(f.maPhi);
    await loadDetail(selectedId, false);
  });
  const deleteFee = (maPhi) => run(async () => { await hoaDonDinhKyApi.xoaPhi(maPhi); await loadDetail(selectedId, false); });
  const openFeeModal = () => setFeeModal({ type: 'voi_sen', code: `${STANDARD_FEES[0].code}-${suffix()}`, name: STANDARD_FEES[0].label, amount: STANDARD_FEES[0].amount, status: 'Đã xác nhận', date: today() });
  const changeFeeType = (value) => {
    const s = STANDARD_FEES.find((x) => x.value === value);
    setFeeModal((m) => ({ ...m, type: value, code: `${s.code}-${suffix()}`, name: value === 'other' ? '' : s.label, amount: s.amount }));
  };
  const submitFee = (e) => {
    e.preventDefault();
    run(async () => {
      await hoaDonDinhKyApi.themPhi({ maHopDong: detail.hopDong.maHopDong, maPhi: feeModal.code, tenPhi: feeModal.name, soTien: Number(feeModal.amount),
        trangThai: feeModal.status, ngayGhiNhan: feeModal.date });
      setFeeModal(null); await loadDetail(selectedId, false);
    });
  };
  const openDrawer = (inv) => { setPayMethod('Chuyển khoản'); setDrawer({ ...inv, loading: true }); hoaDonDinhKyApi.chiTietHoaDon(inv.maHoaDon).then(({ data }) => setDrawer(data)).catch(() => setDrawer({ ...inv, loading: false })); };
  const collect = (inv, method) => run(async () => {
    await hoaDonDinhKyApi.thuTien(inv.maHoaDon, method);
    await load();
    if (drawer?.maHoaDon === inv.maHoaDon) setDrawer((d) => ({ ...d, nhom: 'paid', trangThai: 'Đã TT' }));
  }, `Đã ghi nhận thanh toán hóa đơn ${inv.maHoaDon}.`);

  return <div className="hdk-page">
    <header className="hdk-head">
      <div><h2>Hóa đơn định kỳ</h2><p>Quản lý và chốt chỉ số điện/nước hàng tháng</p></div>
      <div className="hdk-filters">
        <select aria-label="Kỳ thanh toán" value={period} onChange={(e) => setPeriod(e.target.value)}>{periodOptions.map((p) => <option key={p} value={p}>Tháng {showPeriod(p)}</option>)}</select>
        <select aria-label="Chi nhánh" value={branch} onChange={(e) => setBranch(e.target.value)}><option value="all">Tất cả chi nhánh</option>{branchOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
        <select aria-label="Trạng thái" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Tất cả trạng thái</option><option value="paid">Đã thanh toán</option><option value="pending">Chờ thanh toán</option><option value="overdue">Quá hạn</option></select>
      </div>
    </header>
    {loadError && <p className="hdk-alert is-error" role="alert">{loadError}</p>}
    {notice && <p className={`hdk-alert is-${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>{notice.text}</p>}

    <div className="hdk-cards">
      <article><h3>Dự kiến tháng</h3><p>{money(expected)}</p></article>
      <article className="is-paid"><h3>Đã thu</h3><p>{money(paid)}</p></article>
      <article className="is-debt"><h3>Còn nợ</h3><p>{money(expected - paid)}</p></article>
      <article><h3>Tỷ lệ thanh toán</h3><p>{rate} %</p></article>
    </div>

    <section className="hdk-panel">
      <div className="hdk-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={activeTab === 'input'} className={activeTab === 'input' ? 'is-active' : ''} onClick={() => setActiveTab('input')}>Lập hóa đơn định kỳ</button>
        <button type="button" role="tab" aria-selected={activeTab === 'list'} className={activeTab === 'list' ? 'is-active' : ''} onClick={() => setActiveTab('list')}>Danh sách hóa đơn</button>
      </div>

      {activeTab === 'input' && <div className="hdk-input">
        <aside className="hdk-contracts">
          <h3>Hợp đồng chờ thanh toán</h3>
          <p>Chọn một hợp đồng đang hoạt động để tiến hành lập hóa đơn.</p>
          <label className="hdk-search"><Icon name="search" /><input value={contractSearch} onChange={(e) => setContractSearch(e.target.value)} placeholder="Tìm khách hàng, phòng..." aria-label="Tìm hợp đồng" /></label>
          <div className="hdk-contract-list">
            {filteredContracts.map((c) => <button type="button" key={c.maHopDong} className={`hdk-contract${selectedId === c.maHopDong ? ' is-selected' : ''}`} onClick={() => setSelectedId(c.maHopDong)}>
              <span className="hdk-contract-top"><b>{c.maHopDong}</b><em>Tháng {showPeriod(c.kyCanLap)}</em></span>
              <strong>{c.hoTen}</strong>
              <span className="hdk-contract-bottom"><span>{c.tenPhong}{c.giuong ? ` · Giường ${c.giuong}` : ''}</span><b>{money(c.giaThue)}</b></span>
            </button>)}
            {!filteredContracts.length && <p className="hdk-empty-line">Không tìm thấy hợp đồng nào.</p>}
          </div>
        </aside>

        <div className="hdk-form-col">
          {!selectedId && <div className="hdk-placeholder"><span><Icon name="receipt_long" /></span><h4>Chưa chọn hợp đồng</h4>
            <p>Vui lòng chọn một hợp đồng trong danh sách bên trái để kiểm tra chỉ số sử dụng và tiến hành lập hóa đơn định kỳ.</p></div>}
          {selectedId && detailError && <p className="hdk-alert is-error" role="alert">{detailError}</p>}
          {selectedId && !detail && !detailError && <p role="status">Đang tải hợp đồng...</p>}
          {detail && <form className="hdk-form" onSubmit={createInvoice}>
            {hasUnconfirmed && <div className="hdk-warn"><Icon name="warning" /><div><h5>Khoản phí phát sinh chưa xác nhận</h5>
              <p>Hệ thống ghi nhận có khoản phí phát sinh chưa được kế toán xác nhận trước khi lập hóa đơn định kỳ.</p></div>
              <button type="button" disabled={busy} onClick={confirmAllFees}>Xác nhận tất cả</button></div>}

            <section className="hdk-box is-soft">
              <h4><Icon name="description" /> Chi tiết hợp đồng</h4>
              <dl className="hdk-facts">
                <div><dt>Khách thuê đại diện</dt><dd>{detail.hopDong.hoTen}</dd></div>
                <div><dt>Mã phòng/giường</dt><dd>{detail.hopDong.tenPhong}{detail.hopDong.giuong ? ` · ${detail.hopDong.giuong}` : ''}</dd></div>
                <div><dt>Kỳ thanh toán</dt><dd>Tháng {showPeriod(detail.kyThanhToan)}</dd></div>
                <div><dt>Tiền phòng định kỳ</dt><dd className="is-accent">{money(rent)}</dd></div>
              </dl>
            </section>

            <section className="hdk-box">
              <h4 className="hdk-box-title">Chốt chỉ số sử dụng (Điện & Nước)</h4>
              {lockedReading && <p className="hdk-hint">Phòng đã được chốt chỉ số kỳ này (hợp đồng khác cùng phòng), dùng lại chỉ số đã chốt.</p>}
              {share < 1 && <p className="hdk-hint">Phòng ghép: hợp đồng này chịu {(share * 100).toFixed(0)}% lượng điện nước của phòng theo số giường thuê.</p>}
              <div className="hdk-meters">
                {[['Điện sinh hoạt (kWh)', elecOld, setElecOld, elecNew, setElecNew, elecUse, 'kWh', elecCost], ['Nước sinh hoạt (m³)', waterOld, setWaterOld, waterNew, setWaterNew, waterUse, 'm3', waterCost]]
                  .map(([title, oldV, setOld, newV, setNew, use, unit, cost]) => <div className="hdk-meter" key={unit}>
                    <h5>{title}</h5>
                    <div className="hdk-meter-inputs">
                      <label><span>Chỉ số cũ</span><input type="number" min="0" value={oldV} readOnly={!firstReading} onChange={(e) => setOld(e.target.value)} /></label>
                      <label><span className="is-accent">Chỉ số mới</span><input type="number" min="0" value={newV} readOnly={lockedReading} onChange={(e) => setNew(e.target.value)} /></label>
                    </div>
                    <div className="hdk-meter-line"><span>Tiêu thụ: <strong>{use} {unit === 'm3' ? 'm³' : 'kWh'}</strong></span><span>Đơn giá: <strong>{plain(priceOf(unit))}đ</strong></span></div>
                    <div className="hdk-meter-cost">Thành tiền: {money(cost)}</div>
                  </div>)}
              </div>
              {firstReading && <p className="hdk-hint">Phòng chưa có chỉ số kỳ trước: nhập chỉ số cũ theo đồng hồ lúc nhận phòng.</p>}
            </section>

            <section className="hdk-box">
              <h4 className="hdk-box-title">Phí dịch vụ cố định đã đăng ký</h4>
              <div className="hdk-lines">
                {fixed.map((s) => <div key={s.maChiTietDVHD}><span>{s.tenDichVu}{s.soLuong > 1 ? ` × ${s.soLuong}` : ''}</span><b>{money(s.donGia * s.soLuong)}</b></div>)}
                {!fixed.length && <div><span>Không đăng ký dịch vụ cố định</span><b>0 đ</b></div>}
                <div className="is-total"><span>Tổng tiền dịch vụ:</span><b>{money(servicesCost)}</b></div>
              </div>
            </section>

            <section className="hdk-box">
              <div className="hdk-box-row"><h4 className="hdk-box-title">Khoản phí phát sinh thêm trong kỳ</h4>
                <button type="button" className="hdk-chip-btn" onClick={openFeeModal}><Icon name="add" /> Thêm khoản phí</button></div>
              <div className="hdk-fees">
                {fees.map((f) => <div key={f.maPhi} className={`hdk-fee${f.trangThai === 'Chưa xác nhận' ? ' is-pending' : ''}`}>
                  <div><p>{f.trangThai === 'Chưa xác nhận' && <span className="hdk-badge">Chưa xác nhận</span>}<b>{f.tenPhi}</b></p>
                    <small>Mã: <b>{f.maPhi}</b> • Ngày sự cố: <b>{day(f.ngayGhiNhan)}</b></small></div>
                  <div className="hdk-fee-actions"><b>{money(f.soTien)}</b>
                    {f.trangThai === 'Chưa xác nhận' && <button type="button" className="hdk-ok-btn" disabled={busy} onClick={() => confirmFee(f.maPhi)}>Xác nhận</button>}
                    <button type="button" className="hdk-icon-btn" aria-label={`Xóa ${f.tenPhi}`} disabled={busy} onClick={() => deleteFee(f.maPhi)}><Icon name="delete" /></button></div>
                </div>)}
                {!fees.length && <p className="hdk-empty-line">Không có khoản phí phát sinh nào.</p>}
              </div>
            </section>

            <section className="hdk-box is-soft">
              <h4 className="hdk-box-title">Tổng hợp hóa đơn định kỳ</h4>
              <div className="hdk-lines is-summary">
                <div><span>Tiền phòng:</span><b>{money(rent)}</b></div>
                <div><span>Tiền điện nước:</span><b>{money(elecCost + waterCost)}</b></div>
                <div><span>Tiền dịch vụ đã đăng ký:</span><b>{money(servicesCost)}</b></div>
                {feesCost > 0 && <div><span>Phí phát sinh trong kỳ:</span><b className="is-danger">+{money(feesCost)}</b></div>}
                <div className="is-grand"><span>Tổng tiền cần thanh toán:</span><b>{money(total)}</b></div>
              </div>
              <div className="hdk-actions">
                <button type="button" className="hdk-btn-outline" onClick={() => setSelectedId('')}>Bỏ chọn</button>
                <button type="submit" className="hdk-btn" disabled={busy}><Icon name="receipt_long" /> {busy ? 'Đang lập...' : 'Lập hóa đơn định kỳ'}</button>
              </div>
            </section>
          </form>}
        </div>
      </div>}

      {activeTab === 'list' && <div className="hdk-list">
        <div className="hdk-list-head"><h3>Danh sách hóa đơn tháng {showPeriod(period)}</h3>
          <label className="hdk-search is-small"><Icon name="search" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm khách hàng, phòng..." aria-label="Tìm hóa đơn" /></label></div>
        <div className="hdk-table-wrap"><table className="hdk-table">
          <thead><tr><th>Mã HĐ</th><th>Khách hàng</th><th>Phòng</th><th className="num">Tiền phòng</th><th className="num">Điện (VND)</th><th className="num">Nước (VND)</th><th className="num">Tổng (VND)</th><th className="center">Trạng thái</th><th className="num">Thao tác</th></tr></thead>
          <tbody>
            {filteredInvoices.map((inv) => <tr key={inv.maHoaDon} onClick={() => openDrawer(inv)}>
              <td className="is-code">{inv.maHoaDon}{inv.loai === 'Kỳ đầu' && <small>Kỳ đầu</small>}</td><td>{inv.hoTen}</td><td>{inv.tenPhong}</td>
              <td className="num">{plain(inv.tienPhong)}</td><td className="num">{plain(inv.tienDien)}</td><td className="num">{plain(inv.tienNuoc)}</td>
              <td className="num is-bold">{plain(inv.tongTien)}</td>
              <td className="center"><span className={`hdk-status is-${inv.nhom}`}>{STATUS_LABEL[inv.nhom]}</span></td>
              <td className="num" onClick={(e) => e.stopPropagation()}><div className="hdk-row-actions">
                {inv.nhom !== 'paid' && <button type="button" className="hdk-pay-btn" disabled={busy} onClick={() => collect(inv, 'Chuyển khoản')}>Thu tiền</button>}
                <button type="button" className="hdk-icon-btn" aria-label={`Xem ${inv.maHoaDon}`} onClick={() => openDrawer(inv)}><Icon name="visibility" /></button></div></td>
            </tr>)}
            {!filteredInvoices.length && <tr><td colSpan={9} className="hdk-empty-cell">Không tìm thấy hóa đơn định kỳ nào trong kỳ này.</td></tr>}
          </tbody>
        </table></div>
      </div>}
    </section>

    {drawer && <>
      <div className="hdk-backdrop" onClick={() => setDrawer(null)} />
      <aside className="hdk-drawer" role="dialog" aria-modal="true" aria-label="Chi tiết hóa đơn">
        <div className="hdk-drawer-head"><div><h3>Chi tiết Hóa đơn</h3><p>#{drawer.maHoaDon}</p></div>
          <button type="button" className="hdk-icon-btn" aria-label="Đóng" onClick={() => setDrawer(null)}><Icon name="close" /></button></div>
        <div className="hdk-drawer-body">
          <div className="hdk-drawer-row"><span className="hdk-label">Trạng thái</span><span className={`hdk-status is-${drawer.nhom}`}>{STATUS_FULL[drawer.nhom]}</span></div>
          <div className="hdk-drawer-section"><h4 className="hdk-label">Thông tin phòng</h4>
            <dl className="hdk-kv"><dt>Phòng:</dt><dd><b>{drawer.tenPhong}</b></dd><dt>Khách thuê:</dt><dd>{drawer.hoTen}</dd><dt>Kỳ thanh toán:</dt><dd>Tháng {showPeriod(drawer.kyThanhToan)}</dd><dt>Hạn thanh toán:</dt><dd>{day(drawer.ngayHanTT)}</dd></dl></div>
          <div className="hdk-drawer-section"><h4 className="hdk-label">Chi tiết phí</h4>
            <div className="hdk-lines"><div className="is-strong"><span>Tiền phòng:</span><b>{money(drawer.tienPhong)}</b></div></div>
            {drawer.loading && <p role="status">Đang tải chi tiết...</p>}
            <div className="hdk-sublines">
              {(drawer.chiTiet || []).map((l) => <div key={l.maChiTietHD}><span>{l.tenDichVu}{l.donViTinh === 'kWh' || l.donViTinh === 'm3' ? ` (${l.soLuong} ${l.donViTinh === 'm3' ? 'm³' : 'kWh'} x ${plain(l.donGia)})` : l.soLuong > 1 ? ` × ${l.soLuong}` : ''}:</span><span>{money(l.thanhTien)}</span></div>)}
              {(drawer.phiPhatSinh || []).length > 0 && <div className="hdk-fee-lines"><p>Phí phát sinh trong kỳ:</p>
                {drawer.phiPhatSinh.map((f) => <div key={f.maPhi}><span>• {f.tenPhi}:</span><span>+{money(f.soTien)}</span></div>)}</div>}
            </div>
          </div>
          <div className="hdk-drawer-total"><span>Tổng cộng:</span><b>{plain(drawer.tongTien)} VND</b></div>
          {drawer.nhom !== 'paid' && <label className="hdk-pay-method"><span>Phương thức thu</span>
            <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}><option>Chuyển khoản</option><option>Tiền mặt</option></select></label>}
        </div>
        <div className="hdk-drawer-foot">
          <button type="button" className="hdk-btn-outline" disabled={drawer.loading} onClick={() => printInvoice(drawer)}><Icon name="print" /> In PDF</button>
          {drawer.nhom !== 'paid' && <button type="button" className="hdk-btn" disabled={busy} onClick={() => collect(drawer, payMethod)}><Icon name="check" /> Ghi nhận TT</button>}
        </div>
      </aside>
    </>}

    {feeModal && <>
      <div className="hdk-backdrop is-dark" onClick={() => setFeeModal(null)} />
      <div className="hdk-modal" role="dialog" aria-modal="true" aria-labelledby="hdk-fee-title">
        <div className="hdk-modal-head"><div><h3 id="hdk-fee-title"><Icon name="receipt_long" /> Chi phí phát sinh</h3><p>Thêm mới khoản chi phí phát sinh / phạt trong kỳ</p></div>
          <button type="button" className="hdk-icon-btn" aria-label="Đóng" onClick={() => setFeeModal(null)}><Icon name="close" /></button></div>
        <form className="hdk-modal-body" onSubmit={submitFee}>
          <label><span>Loại chi phí phát sinh <i>*</i></span><select value={feeModal.type} onChange={(e) => changeFeeType(e.target.value)}>{STANDARD_FEES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}</select></label>
          {feeModal.type === 'other' && <label><span>Tên chi phí khác <i>*</i></span><input required value={feeModal.name} onChange={(e) => setFeeModal((m) => ({ ...m, name: e.target.value }))} placeholder="Nhập mô tả chi tiết chi phí..." /></label>}
          <label><span>Mã chi phí <i>*</i></span><input required value={feeModal.code} onChange={(e) => setFeeModal((m) => ({ ...m, code: e.target.value }))} placeholder="Ví dụ: CPPS-1021" /></label>
          <label><span>Số tiền phạt (đ) <i>*</i></span><input type="number" required min="1" value={feeModal.amount || ''} onChange={(e) => setFeeModal((m) => ({ ...m, amount: parseInt(e.target.value, 10) || 0 }))} placeholder="Nhập số tiền..." /></label>
          <div className="hdk-modal-grid">
            <label><span>Trạng thái <i>*</i></span><select value={feeModal.status} onChange={(e) => setFeeModal((m) => ({ ...m, status: e.target.value }))}><option>Chưa xác nhận</option><option>Đã xác nhận</option></select></label>
            <label><span>Ngày ghi nhận sự cố <i>*</i></span><input type="date" required value={feeModal.date} onChange={(e) => setFeeModal((m) => ({ ...m, date: e.target.value }))} /></label>
          </div>
          <div className="hdk-modal-actions"><button type="button" className="hdk-btn-outline" onClick={() => setFeeModal(null)}>Hủy bỏ</button>
            <button type="submit" className="hdk-btn" disabled={busy}>{busy ? 'Đang xử lý...' : 'Xác nhận thêm'}</button></div>
        </form>
      </div>
    </>}
  </div>;
}
