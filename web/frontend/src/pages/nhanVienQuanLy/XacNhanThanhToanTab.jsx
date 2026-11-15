import OverviewCards from '../../components/common/OverviewCards.jsx';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Icon } from '../../components/common/Icon.jsx';
import { datCocApi } from '../datCoc/datCoc.api.js';
import ResultModal from '../../components/common/ResultModal.jsx';
import StatusFilterTabs from '../../components/common/StatusFilterTabs.jsx';
import SharedStatusBadge from '../../components/common/StatusBadge.jsx';
import ListSearch from '../../components/common/ListSearch.jsx';
import ListPagination from '../../components/common/ListPagination.jsx';
import TableState from '../../components/common/TableState.jsx';

// Cấu hình trạng thái thanh toán (DC05)
const STATUS_CONFIG = {
  'Chờ TT':  { chip: 'Chờ xác nhận', badgeLabel: 'Chờ xác nhận', tone: 'warning' },
  'Đã TT':   { chip: 'Đã xác nhận',  badgeLabel: 'Đã xác nhận',  tone: 'success' },
  'Hết hạn': { chip: 'Hết hạn',      badgeLabel: 'Hết hạn',      tone: 'danger' },
};
const STATUS_ORDER = ['Chờ TT', 'Đã TT', 'Hết hạn'];
const StatusBadge = ({ trangThai }) => {
  const cfg = STATUS_CONFIG[trangThai];
  return <SharedStatusBadge status={cfg ? cfg.badgeLabel : (trangThai || '—')} tone={cfg?.tone || 'neutral'} />;
};
const PAGE_SIZE = 10;

// Kế toán đối chiếu chứng từ chuyển khoản trước khi xác nhận tiền về.
// GUI: HienThi() = loadDanhSach() -> getDanhSachChoXacNhanThanhToan() -> SP_DanhSachChoXacNhanThanhToan.
// GUI: btnXacNhan_Click() -> xacNhanThanhToan() -> SP_XacNhanThanhToanCoc.

const formatTien = (v) => (v == null || v === '' || isNaN(Number(v)) ? '0' : Number(v).toLocaleString('vi-VN'));
const formatHan = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN');
};
// 1 phiếu = 1 phòng -> bảng chỉ cần tên phòng; mã giường là chi tiết, xem trong modal.
const moTaPhong = (item) => item.tenPhong || item.maPhong || '—';
// ChungTuThanhToan giờ chỉ là ĐƯỜNG DẪN file (ảnh/PDF). Gốc backend để tải file:
const FILE_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
const anhUrl = (path) => (path ? `${FILE_BASE}${path}` : null);

export default function XacNhanThanhToanTab() {

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [selected, setSelected] = useState(null);
  const [decision, setDecision] = useState('xac-nhan'); // 'xac-nhan' | 'tu-choi'
  const [lyDo, setLyDo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  // Tìm kiếm + chip trạng thái + phân trang (đã bỏ bộ chọn sắp xếp)
  const [statusFilter, setStatusFilter] = useState('Chờ TT'); // mặc định nhóm cần xử lý
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const loadDanhSach = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await datCocApi.getDanhSachChoXacNhanThanhToan();
      setList(data || []);
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Không tải được danh sách chờ xác nhận thanh toán');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDanhSach(); }, [loadDanhSach]);

  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((it) => !q
      || (it.hoTen || '').toLowerCase().includes(q)
      || String(it.soDienThoai || '').toLowerCase().includes(q)
      || (it.maPhieuDatCoc || '').toLowerCase().includes(q));
  }, [list, search]);

  const counts = useMemo(() => {
    const c = { all: baseFiltered.length };
    STATUS_ORDER.forEach((s) => { c[s] = 0; });
    baseFiltered.forEach((it) => { if (c[it.trangThaiThanhToan] != null) c[it.trangThaiThanhToan] += 1; });
    return c;
  }, [baseFiltered]);

  // Thứ tự CỐ ĐỊNH: "Chờ TT" -> hạn gần nhất trước (sắp hết hạn xử lý trước);
  // các nhóm khác -> hạn xa nhất trước.
  const filteredList = useMemo(() => {
    const arr = statusFilter === 'all' ? baseFiltered : baseFiltered.filter((it) => it.trangThaiThanhToan === statusFilter);
    const gapNhatTruoc = statusFilter === 'Chờ TT';
    return [...arr].sort((a, b) => {
      const da = a.thoiHanThanhToan ? new Date(a.thoiHanThanhToan).getTime() : 0;
      const db = b.thoiHanThanhToan ? new Date(b.thoiHanThanhToan).getTime() : 0;
      return gapNhatTruoc ? da - db : db - da;
    });
  }, [baseFiltered, statusFilter]);

  const chonChip = (key) => setStatusFilter(key);

  useEffect(() => { setPage(1); }, [statusFilter, search]);
  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pagedList = useMemo(
    () => filteredList.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE),
    [filteredList, pageSafe]
  );

  // Chỉ phiếu 'Chờ TT' còn hạn mới cho xác nhận
  const canXuLy = (it) => it.trangThaiThanhToan === 'Chờ TT'
    && (!it.thoiHanThanhToan || new Date(it.thoiHanThanhToan).getTime() >= Date.now());

  const openXuLy = (item) => {
    setSelected(item);
    setDecision('xac-nhan');
    setLyDo('');
  };
  const readOnly = !!(selected && !canXuLy(selected));

  const handleSubmit = async () => {
    if (!selected) return;
    const hopLe = decision === 'xac-nhan';
    if (!hopLe && !lyDo.trim()) {
      setResult({ type: 'error', title: 'Chưa nhập lý do từ chối.' });
      return;
    }
    setSubmitting(true);
    try {
      await datCocApi.xacNhanThanhToan(selected.maPhieuDatCoc, {
        hopLe,
        ghiChu: hopLe ? null : lyDo.trim(),
      });
      setSelected(null);
      await loadDanhSach();
      setResult({ type: 'success', title: hopLe ? 'Đã xác nhận!' : 'Đã từ chối.' });
    } catch {
      setResult({ type: 'error', title: 'Thao tác thất bại.' });
    } finally {
      setSubmitting(false);
    }
  };

  const imgUrl = anhUrl(selected?.chungTuThanhToan);
  const isPdf = selected?.chungTuThanhToan && /\.pdf$/i.test(selected.chungTuThanhToan);

  return (
    <div className="ktp-container">
      {/* Table Section */}
      <>
{/* Phiếu sắp hết hạn luôn lên đầu, nên không có bộ chọn sắp xếp. */}
<OverviewCards items={[{ key: 'all', label: 'Tất cả' }, ...STATUS_ORDER.map((s) => ({ key: s, label: STATUS_CONFIG[s].chip }))]} counts={counts} activeKey={statusFilter} onSelect={chonChip} />
<div className="ui-list-toolbar">
          <ListSearch value={search} onChange={setSearch} placeholder="Tên khách hàng, SĐT hoặc mã phiếu cọc..." />
<StatusFilterTabs
          items={[{ key: 'all', label: 'Tất cả' }, ...STATUS_ORDER.map((s) => ({ key: s, label: STATUS_CONFIG[s].chip }))]}
          activeKey={statusFilter}
          counts={counts}
          onChange={chonChip}
        />
</div>
<section className="ktp-table-section ui-list-table-card">
        <table className="ktp-table">
          <thead>
            <tr>
              <th>Mã phiếu</th>
              <th>Khách hàng</th>
              <th>Phòng</th>
              <th className="ui-num">Số tiền đặt cọc</th>
              <th>Hạn thanh toán</th>
              <th>Trạng thái</th>
              <th className="ui-num">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableState kind="loading" colSpan={7} />
            ) : loadError ? (
              <TableState kind="error" colSpan={7} message={loadError} />
            ) : filteredList.length === 0 ? (
              <TableState kind="empty" colSpan={7} message="Không có chứng từ nào ở nhóm này" />
            ) : pagedList.map((item) => (
              <tr key={item.maPhieuDatCoc}>
                <td className="ui-cell-code">{item.maPhieuDatCoc}</td>
                <td><p className="ui-cell-main">{item.hoTen}</p></td>
                <td>{moTaPhong(item)}</td>
                <td className="ui-num">{formatTien(item.soTienCoc)}đ</td>
                <td>{formatHan(item.thoiHanThanhToan)}</td>
                <td><StatusBadge trangThai={item.trangThaiThanhToan} /></td>
                <td className="ui-num">
                  {canXuLy(item) ? (
                    <button type="button" className="ui-btn ui-btn--primary ui-btn--sm" onClick={() => openXuLy(item)}>Xử lý</button>
                  ) : (
                    <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={() => openXuLy(item)}>Xem chi tiết</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <ListPagination page={pageSafe} pageSize={PAGE_SIZE} total={filteredList.length} noun="chứng từ" onChange={setPage} />
      </section>
</>

      {/* Modal xử lý */}
      {selected && (
        <div className="ktp-modal-overlay" onClick={() => !submitting && setSelected(null)}>
          <div className="ktp-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px', width: '100%', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#ffffff', borderRadius: '12px' }}>

            <div className="ktp-modal-header" style={{ alignItems: 'center', backgroundColor: '#4A6549', color: '#ffffff', borderBottom: 'none', padding: '24px 32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h3 style={{ fontSize: '20px', margin: 0, color: '#ffffff', fontWeight: '700' }}>Chi tiết thanh toán cọc</h3>
              </div>
              <button className="ktp-modal-close" onClick={() => setSelected(null)} style={{ color: '#ffffff' }}><Icon name="close" /></button>
            </div>

            <div className="ktp-modal-body" style={{ padding: '32px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '24px' }}>
                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div className="ktp-section" style={{ padding: '20px', marginBottom: 0 }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', color: '#4A6549', margin: '0 0 16px 0' }}>
                      <Icon name="person" /> Thông tin khách hàng
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6f797a', fontSize: '14px' }}>Họ tên:</span> <span style={{ fontWeight: '600', fontSize: '14px', color: '#191c1d' }}>{selected.hoTen}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6f797a', fontSize: '14px' }}>SĐT:</span> <span style={{ fontWeight: '600', fontSize: '14px', color: '#191c1d' }}>{selected.soDienThoai || '—'}</span></div>
                    </div>
                  </div>

                  <div className="ktp-section" style={{ padding: '20px', marginBottom: 0 }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', color: '#4A6549', margin: '0 0 16px 0' }}>
                      <Icon name="receipt_long" /> Thông tin phiếu đặt cọc
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6f797a', fontSize: '14px' }}>Mã phiếu:</span> <span style={{ fontWeight: '600', fontSize: '14px', color: '#191c1d' }}>{selected.maPhieuDatCoc}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6f797a', fontSize: '14px' }}>Phòng:</span> <span style={{ fontWeight: '600', fontSize: '14px', color: '#191c1d' }}>{selected.tenPhong || selected.maPhong || '—'}</span></div>
                      {/* Ghép giường -> liệt kê mã giường; nguyên phòng -> không có giường nào */}
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6f797a', fontSize: '14px' }}>Giường:</span> <span style={{ fontWeight: '600', fontSize: '14px', color: '#191c1d' }}>{selected.danhSachGiuong || 'Trọn phòng'}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6f797a', fontSize: '14px' }}>Số tiền cọc:</span> <span style={{ fontWeight: '600', fontSize: '14px', color: '#fe7e50' }}>{formatTien(selected.soTienCoc)}đ</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6f797a', fontSize: '14px' }}>Hạn thanh toán:</span> <span style={{ fontWeight: '600', fontSize: '14px', color: '#191c1d' }}>{formatHan(selected.thoiHanThanhToan)}</span></div>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div className="ktp-section" style={{ padding: '20px', marginBottom: 0, border: '1px solid #E0E3DF', backgroundColor: '#F1F4F0' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', color: '#4A6549', margin: '0 0 16px 0' }}>
                      <Icon name="image" /> Chứng từ thanh toán khách đã gửi
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {imgUrl ? (
                        isPdf ? (
                          <a href={imgUrl} target="_blank" rel="noreferrer" style={{ color: '#4A6549', fontWeight: 600, fontSize: '14px' }}>📄 Mở file PDF chứng từ</a>
                        ) : (
                          <a href={imgUrl} target="_blank" rel="noreferrer">
                            <img src={imgUrl} alt="Chứng từ thanh toán" style={{ width: '100%', maxHeight: '260px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #E0E3DF', backgroundColor: '#fff' }} />
                          </a>
                        )
                      ) : (
                        <span style={{ fontSize: '13px', color: '#9b4922' }}>Khách chưa đính kèm chứng từ.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Khối quyết định: TRẢI HẾT chiều ngang lưới (gridColumn 1 / -1),
                    không nằm gọn trong cột phải nữa */}
                {readOnly && (
                  <div className="ktp-section" style={{ gridColumn: '1 / -1', padding: '20px', marginBottom: 0 }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', color: '#4A6549', margin: '0 0 12px 0' }}>
                      <Icon name="fact_check" /> Kết quả xử lý
                    </h4>
                    <StatusBadge trangThai={selected.trangThaiThanhToan} />
                  </div>
                )}
                {!readOnly && (
                  <div className="ktp-section" style={{ gridColumn: '1 / -1', padding: '20px', marginBottom: 0 }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', color: '#4A6549', margin: '0 0 16px 0' }}>
                      <Icon name="fact_check" /> Kết quả đối chiếu & Quyết định
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Hai lựa chọn xếp NGANG: cùng cấp, cùng độ dài -> không lệch như xếp dọc */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div
                          onClick={() => setDecision('xac-nhan')}
                          style={{ padding: '16px', borderRadius: '8px', border: decision === 'xac-nhan' ? '2px solid #4A6549' : '1px solid #bec8c9', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', backgroundColor: decision === 'xac-nhan' ? '#F1F4F0' : '#ffffff' }}
                        >
                          {/* Giống hệt radio ở màn Duyệt nhận cọc (DC02) — xem chú thích ở file đó */}
                          <div style={{ width: '20px', height: '20px', boxSizing: 'border-box', borderRadius: '50%', border: decision === 'xac-nhan' ? '2px solid #4A6549' : '2px solid #bec8c9', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {decision === 'xac-nhan' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#4A6549' }}></div>}
                          </div>
                          <span style={{ fontWeight: '600', color: '#191c1d', fontSize: '14px' }}>Xác nhận hợp lệ</span>
                        </div>

                        <div
                          onClick={() => setDecision('tu-choi')}
                          style={{ padding: '16px', borderRadius: '8px', border: decision === 'tu-choi' ? '2px solid #4A6549' : '1px solid #bec8c9', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', backgroundColor: decision === 'tu-choi' ? '#F1F4F0' : '#ffffff' }}
                        >
                          <div style={{ width: '20px', height: '20px', boxSizing: 'border-box', borderRadius: '50%', border: decision === 'tu-choi' ? '2px solid #4A6549' : '2px solid #bec8c9', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {decision === 'tu-choi' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#4A6549' }}></div>}
                          </div>
                          <span style={{ fontWeight: '600', color: '#191c1d', fontSize: '14px' }}>Từ chối xác nhận</span>
                        </div>
                      </div>

                      {decision === 'tu-choi' && (
                        <div>
                          <label style={{ display: 'block', fontWeight: '700', color: '#191c1d', marginBottom: '8px', fontSize: '13px' }}>Lý do từ chối <span style={{ color: '#ba1a1a' }}>*</span></label>
                          <textarea
                            value={lyDo}
                            onChange={(e) => setLyDo(e.target.value)}
                            style={{ width: '100%', border: '1px solid #bec8c9', borderRadius: '8px', padding: '12px', fontSize: '14px', boxSizing: 'border-box', minHeight: '80px', resize: 'vertical' }}
                            placeholder="VD: Số tiền chuyển không khớp, chứng từ không rõ ràng..."
                          ></textarea>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="ktp-modal-footer" style={{ borderTop: '1px solid #e1e3e4', backgroundColor: '#ffffff', padding: '16px 32px', display: 'flex', gap: '16px', justifyContent: 'flex-end', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
              <button className="ktp-btn-cancel" onClick={() => setSelected(null)} disabled={submitting} style={{ border: '1px solid #bec8c9', padding: '10px 24px', borderRadius: '8px', backgroundColor: '#ffffff', color: '#191c1d', fontWeight: '600', cursor: 'pointer' }}>Đóng</button>
              {!readOnly && (
                <button className="ktp-btn-submit" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Đang xử lý...' : 'Xác nhận'}</button>
              )}
            </div>
          </div>
        </div>
      )}

      <ResultModal
        open={!!result}
        type={result?.type}
        title={result?.title}
        message={result?.message}
        onClose={() => setResult(null)}
      />
    </div>
  );
}
