import OverviewCards from '../../components/common/OverviewCards.jsx';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Icon } from '../../components/common/Icon.jsx';
import { datCocApi } from '../datCoc/datCoc.api.js';
import { moTaCachTinhCoc } from '../../utils/tienCoc.js';
import ResultModal from '../../components/common/ResultModal.jsx';
import StatusFilterTabs from '../../components/common/StatusFilterTabs.jsx';
import SharedStatusBadge from '../../components/common/StatusBadge.jsx';
import ListSearch from '../../components/common/ListSearch.jsx';
import ListPagination from '../../components/common/ListPagination.jsx';
import TableState from '../../components/common/TableState.jsx';

// DC02 - Xác nhận khả năng nhận cọc (tác nhân: Nhân viên quản lý).
// GUI: HienThi() = loadDanhSach() -> getDanhSachChoXacNhan() -> SP_DanhSachChoXacNhanCoc.
// GUI: btnXacNhan_Click() -> xacNhanKhaNangNhanCoc() -> SP_XacNhanKhaNangNhanCoc.

const moTaPhong = (item) => {
  const phong = item.tenPhong || item.maPhong;
  if (!phong) return '—';
  return item.maGiuong ? `${phong} - ${item.maGiuong}` : phong;
};

const formatNgay = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
};
const thoiGianCho = (item) => item.phutDaCho == null ? null
  : `Đã chờ ${Math.max(0, Math.floor(Number(item.phutDaCho) / 60))} giờ ${Math.max(0, Number(item.phutDaCho) % 60)} phút`;

// Nguồn cấu hình DUY NHẤT cho trạng thái phiếu ở màn Quản lý duyệt.
const STATUS_CONFIG = {
  'Chờ xác nhận cọc': { chip: 'Chờ duyệt',  badgeLabel: 'Chờ duyệt',  tone: 'warning', action: 'xu-ly' },
  'Xác nhận cọc':     { chip: 'Đã duyệt',   badgeLabel: 'Đã duyệt',   tone: 'success', action: 'chi-tiet' },
  'Từ chối':          { chip: 'Bị từ chối', badgeLabel: 'Bị từ chối', tone: 'danger', action: 'ly-do' },
};
const STATUS_ORDER = ['Chờ xác nhận cọc', 'Xác nhận cọc', 'Từ chối'];

const StatusBadge = ({ trangThai }) => {
  const cfg = STATUS_CONFIG[trangThai];
  return <SharedStatusBadge status={cfg ? cfg.badgeLabel : trangThai} tone={cfg?.tone || 'neutral'} />;
};

const PAGE_SIZE = 10;

export default function XacNhanNhanPhongTab() {

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [selected, setSelected] = useState(null);      // hồ sơ đang xử lý / xem
  const [decision, setDecision] = useState('xac-nhan'); // 'xac-nhan' | 'tu-choi'
  const [lyDo, setLyDo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  // Tìm kiếm + chip trạng thái (client-side). Bỏ lọc ngày & bộ chọn sắp xếp:
  // luồng đặt cọc xử lý theo hàng đợi, không cần người dùng tự sắp xếp.
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const loadDanhSach = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await datCocApi.getDanhSachChoXacNhan();
      setList(data || []);
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Không tải được danh sách chờ xác nhận');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDanhSach(); }, [loadDanhSach]);

  // Lọc theo tìm kiếm (chưa áp chip) — dùng để đếm chip
  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((it) => (it.hoTen || '').toLowerCase().includes(q)
      || String(it.soDienThoai || '').toLowerCase().includes(q)
      || (it.maDangKy || '').toLowerCase().includes(q));
  }, [list, search]);

  const counts = useMemo(() => {
    const c = { all: baseFiltered.length };
    STATUS_ORDER.forEach((s) => { c[s] = 0; });
    baseFiltered.forEach((it) => { if (c[it.trangThai] != null) c[it.trangThai] += 1; });
    return c;
  }, [baseFiltered]);

  // Thứ tự CỐ ĐỊNH (người dùng không đổi được nữa):
  // "Chờ duyệt" -> cũ nhất trước (FIFO, hồ sơ chờ lâu xử lý trước); các nhóm khác -> mới nhất trước.
  const filteredList = useMemo(() => {
    const arr = statusFilter === 'all' ? baseFiltered : baseFiltered.filter((it) => it.trangThai === statusFilter);
    return [...arr].sort((a, b) => {
      const pa = a.trangThai === 'Chờ xác nhận cọc';
      const pb = b.trangThai === 'Chờ xác nhận cọc';
      if (pa !== pb) return pa ? -1 : 1;
      const da = a.guiLuc ? new Date(a.guiLuc).getTime() : (a.ngayDangKy ? new Date(a.ngayDangKy).getTime() : 0);
      const db = b.guiLuc ? new Date(b.guiLuc).getTime() : (b.ngayDangKy ? new Date(b.ngayDangKy).getTime() : 0);
      return pa ? da - db : db - da;
    });
  }, [baseFiltered, statusFilter]);

  const chonChip = (key) => setStatusFilter(key);

  // Phân trang (client-side)
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [statusFilter, search]);
  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pagedList = useMemo(
    () => filteredList.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE),
    [filteredList, pageSafe]
  );

  const openXuLy = (item) => {
    setSelected(item);
    if (item.trangThai === 'Chờ xác nhận cọc' && !item.coTheNhanCoc) {
      setDecision('tu-choi');
      setLyDo(item.lyDoKhongKhaDung || '');
    } else {
      setDecision('xac-nhan');
      setLyDo('');
    }
  };
  const readOnly = !!(selected && selected.trangThai && selected.trangThai !== 'Chờ xác nhận cọc');
  const canApproveLater = selected?.trangThai === 'Chờ xác nhận cọc'
    && selected.yeuCauCungPhong >= 2 && selected.laYeuCauDau === false;

  const handleSubmit = async () => {
    if (!selected) return;
    const duocNhanCoc = decision === 'xac-nhan';
    if (!duocNhanCoc && !lyDo.trim()) {
      setResult({ type: 'error', title: 'Chưa nhập lý do từ chối.' });
      return;
    }
    if (duocNhanCoc && canApproveLater && !lyDo.trim()) {
      setResult({ type: 'error', title: 'Cần nhập lý do duyệt yêu cầu gửi sau.' });
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await datCocApi.xacNhanKhaNang(selected.maDangKy, {
        duocNhanCoc,
        lyDo: duocNhanCoc ? null : lyDo.trim(),
        lyDoVuotLuot: duocNhanCoc && canApproveLater ? lyDo.trim() : null
      });
      setSelected(null);
      await loadDanhSach();

      // Từ chối KHÔNG đóng hồ sơ: phòng bị loại, hồ sơ quay lại DC01 để Sale chọn phòng khác
      // trong các phòng khách đã xem còn lại. Chỉ khi hết phòng thì hồ sơ mới bị từ chối hẳn.
      const conPhongKhac = data?.conPhongKhac === 1 || data?.conPhongKhac === true;
      setResult({
        type: 'success',
        title: duocNhanCoc
          ? `Đã duyệt và phát hành phiếu ${data?.maPhieuDatCoc || ''}.`
          : (conPhongKhac ? 'Đã trả hồ sơ về Sale chọn phòng khác.' : 'Đã từ chối hồ sơ.'),
        message: duocNhanCoc && data?.email?.khachThieuEmail
          ? 'Khách chưa có email, hãy báo khách trực tiếp.' : undefined
      });
    } catch (error) {
      setResult({ type: 'error', title: 'Thao tác thất bại.', message: error.response?.data?.message || error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ktp-container">
      {/* Table Section */}
      <>
{/* Hồ sơ xử lý theo hàng đợi, nên không có lọc ngày hay bộ chọn sắp xếp. */}
<OverviewCards items={[{ key: 'all', label: 'Tất cả' }, ...STATUS_ORDER.map((s) => ({ key: s, label: STATUS_CONFIG[s].chip }))]} counts={counts} activeKey={statusFilter} onSelect={chonChip} />
<div className="ui-list-toolbar">
          <ListSearch value={search} onChange={setSearch} placeholder="Tên khách hàng, SĐT hoặc mã phiếu..." />
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
              <th>SĐT</th>
              <th>Phòng/Giường</th>
              <th>Ngày đăng ký</th>
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
              <TableState kind="empty" colSpan={7} message="Không có phiếu nào ở nhóm này" />
            ) : pagedList.map((item) => {
              const action = STATUS_CONFIG[item.trangThai]?.action;
              return (
                <tr key={item.maDangKy}>
                  <td className="ui-cell-code">{item.maDangKy}</td>
                  <td><p className="ui-cell-main">{item.hoTen}</p></td>
                  <td>{item.soDienThoai || '—'}</td>
                  <td>{moTaPhong(item)}
                    {item.trangThai === 'Chờ xác nhận cọc' && item.yeuCauCungPhong >= 2 &&
                      <small className="ui-cell-sub ui-cell-sub--warning">Phòng {item.maPhong} có {item.yeuCauCungPhong} yêu cầu</small>}
                    {item.trangThai === 'Chờ xác nhận cọc' && item.yeuCauCungPhong >= 2 && item.laYeuCauDau &&
                      <small className="ui-cell-sub ui-cell-sub--strong">Yêu cầu gửi trước</small>}
                  </td>
                  <td>{formatNgay(item.ngayDangKy)}
                    {item.trangThai === 'Chờ xác nhận cọc' && <small className="ui-cell-sub">{thoiGianCho(item)}</small>}
                  </td>
                  <td><StatusBadge trangThai={item.trangThai} /></td>
                  <td className="ui-num">
                    {action === 'xu-ly' ? (
                      <button type="button" className="ui-btn ui-btn--primary ui-btn--sm" onClick={() => openXuLy(item)}>Xử lý</button>
                    ) : action === 'ly-do' ? (
                      <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm ui-btn--danger-text" onClick={() => openXuLy(item)}>Xem lý do</button>
                    ) : (
                      <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={() => openXuLy(item)}>Xem chi tiết</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <ListPagination page={pageSafe} pageSize={PAGE_SIZE} total={filteredList.length} noun="phiếu" onChange={setPage} />
      </section>
</>

      {/* Modal xử lý */}
      {selected && (
        <div className="ktp-modal-overlay" onClick={() => !submitting && setSelected(null)}>
          <div className="ktp-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>

            <div className="ktp-modal-header" style={{ alignItems: 'center', backgroundColor: '#ffffff', borderBottom: '1px solid #e1e3e4', padding: '20px 24px', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#F1F4F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4A6549' }}>
                  <Icon name="description" />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', margin: 0, color: '#191c1d', fontWeight: '700' }}>Chi tiết phiếu đăng ký #{selected.maDangKy}</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#6f797a' }}>Ngày đăng ký: {formatNgay(selected.ngayDangKy)}</p>
                </div>
              </div>
              <button className="ktp-modal-close" onClick={() => setSelected(null)} style={{ color: '#6f797a', background: 'transparent', border: 'none', cursor: 'pointer' }}><Icon name="close" /></button>
            </div>

            <div className="ktp-modal-body" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Dòng tóm tắt */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '13px', color: '#6f797a', borderBottom: '1px solid #e1e3e4', paddingBottom: '16px' }}>
                  <span>Ngày đăng ký: <strong style={{ color: '#191c1d' }}>{formatNgay(selected.ngayDangKy)}</strong></span>
                  {selected.trangThai === 'Chờ xác nhận cọc' && <span>{thoiGianCho(selected)}</span>}
                  <span>Sale phụ trách: <strong style={{ color: '#191c1d' }}>{selected.tenNhanVienSale || selected.maNhanVienSale || '—'}</strong>{selected.tenNhanVienSale && selected.maNhanVienSale ? ` (${selected.maNhanVienSale})` : ''}</span>
                </div>

                {/* 2 Cột thông tin */}
                <div className="ktp-grid-2" style={{ gap: '24px' }}>
                  <div>
                    <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#8e9696', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Thông tin khách hàng</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div><p className="ktp-mini-label" style={{ color: '#6f797a', margin: '0 0 4px 0' }}>Họ và tên</p><p className="ktp-mini-value" style={{ fontWeight: '600', margin: 0 }}>{selected.hoTen}</p></div>
                      <div><p className="ktp-mini-label" style={{ color: '#6f797a', margin: '0 0 4px 0' }}>Số điện thoại</p><p className="ktp-mini-value" style={{ fontWeight: '600', margin: 0 }}>{selected.soDienThoai || '—'}</p></div>
                    </div>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#8e9696', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Yêu cầu thuê</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div><p className="ktp-mini-label" style={{ color: '#6f797a', margin: '0 0 4px 0' }}>Nhóm khách</p><p className="ktp-mini-value" style={{ fontWeight: '600', margin: 0 }}>{selected.soNam} Nam, {selected.soNu} Nữ</p></div>
                      <div><p className="ktp-mini-label" style={{ color: '#6f797a', margin: '0 0 4px 0' }}>Ngày đăng ký</p><p className="ktp-mini-value" style={{ fontWeight: '600', margin: 0 }}>{formatNgay(selected.ngayDangKy)}</p></div>
                    </div>
                  </div>
                </div>

                {/* Phân tích PHÒNG KHÁCH CHỐT: Sale đã chốt phòng ở DC01, nên Quản lý duyệt
                    đúng phòng đó (sức chứa, giới tính, tình trạng thật). */}
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ flex: 1, borderTop: '1px solid #e1e3e4' }}></div>
                    <span style={{ padding: '0 16px', fontSize: '14px', fontWeight: '700', color: '#191c1d' }}>Phòng khách chốt thuê</span>
                    <div style={{ flex: 1, borderTop: '1px solid #e1e3e4' }}></div>
                  </div>

                  <div style={{ borderRadius: '8px', border: `2px solid ${selected.coTheNhanCoc === true ? '#E0E3DF' : (selected.coTheNhanCoc === false ? '#f1b0b0' : '#e1e3e4')}`, backgroundColor: selected.coTheNhanCoc === true ? '#F1F4F0' : (selected.coTheNhanCoc === false ? '#fdecec' : '#f8f9fa'), padding: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <Icon name="meeting_room" style={{ color: '#6f797a' }} />
                          <span style={{ fontWeight: '700', color: '#191c1d', fontSize: '16px' }}>
                            {moTaPhong(selected)} {selected.tenLoaiPhong ? `(${selected.tenLoaiPhong})` : ''}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '24px', fontSize: '14px', color: '#6f797a', flexWrap: 'wrap' }}>
                          {/* 'Không phân biệt' là mặc định -> chỉ nêu khi phòng ĐÃ BỊ KHÓA giới */}
                          {(selected.gioiTinhChoPhep === 'Nam' || selected.gioiTinhChoPhep === 'Nữ') && (
                            <span>Giới tính: <strong style={{ color: '#191c1d' }}>{selected.gioiTinhChoPhep}</strong></span>
                          )}
                          <span>Sức chứa: <strong style={{ color: '#191c1d' }}>{selected.sucChuaToiDa ?? 0}</strong></span>
                          <span>Trống: <strong style={{ color: '#191c1d' }}>{selected.soChoTrong ?? 0}</strong> giường</span>
                          <span>Hình thức: <strong>{selected.hinhThucThue || '—'}</strong></span>
                          {selected.danhSachGiuong && <span>Giường đã chọn: <strong>{selected.danhSachGiuong}</strong></span>}
                          {selected.tienCocDuKien && <span>Tiền cọc dự kiến: <strong>{moTaCachTinhCoc(selected.tienCocDuKien)}</strong></span>}
                        </div>
                      </div>

                      {/* Không dùng icon: màu viền + chữ đã đủ phân biệt */}
                      {selected.coTheNhanCoc != null && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 20px', borderRadius: '8px', backgroundColor: '#ffffff', border: `1px solid ${selected.coTheNhanCoc === true ? '#E0E3DF' : '#f1b0b0'}`, color: selected.coTheNhanCoc === true ? '#4A6549' : '#b3261e' }}>
                          <span style={{ fontWeight: '700', textAlign: 'center', fontSize: '13px', whiteSpace: 'nowrap' }}>
                            {selected.coTheNhanCoc === true ? 'ĐỦ ĐIỀU KIỆN NHẬN CỌC' : 'KHÔNG ĐỦ ĐIỀU KIỆN'}
                          </span>
                        </div>
                      )}
                    </div>

                    {selected.coTheNhanCoc === false && selected.trangThai === 'Chờ xác nhận cọc' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b3261e', fontSize: '13px', marginTop: '16px', backgroundColor: 'rgba(179, 38, 30, 0.1)', padding: '12px', borderRadius: '4px' }}>
                        <Icon name="warning" style={{ fontSize: '18px' }} />
                        <span><strong>Lý do:</strong> {selected.lyDoKhongKhaDung}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Phiếu đã xử lý */}
                {readOnly && (
                  <div style={{ borderTop: '1px solid #e1e3e4', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: 700, color: '#191c1d', fontSize: '15px' }}>Trạng thái:</span>
                      <StatusBadge trangThai={selected.trangThai} />
                    </div>
                    {selected.trangThai === 'Từ chối' && (
                      <div style={{ background: '#fdecec', border: '1px solid #f5c2c2', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#b91c1c', marginBottom: '4px' }}>Lý do từ chối trước đó</div>
                        <div style={{ fontSize: '14px', color: '#7f1d1d', lineHeight: 1.5 }}>{selected.ghiChuSale || 'Không có ghi chú.'}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Quyết định của quản lý */}
                {!readOnly && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ flex: 1, borderTop: '1px solid #e1e3e4' }}></div>
                      <span style={{ padding: '0 16px', fontSize: '14px', fontWeight: '700', color: '#191c1d' }}>Quyết định của quản lý</span>
                      <div style={{ flex: 1, borderTop: '1px solid #e1e3e4' }}></div>
                    </div>

                    <div className="ktp-grid-2" style={{ gap: '12px', marginBottom: '16px' }}>
                      <div
                        onClick={() => { if (selected.coTheNhanCoc !== false) setDecision('xac-nhan'); }}
                        style={{ padding: '16px', borderRadius: '8px', border: decision === 'xac-nhan' ? '2px solid #4A6549' : '1px solid #bec8c9', display: 'flex', alignItems: 'center', gap: '12px', cursor: selected.coTheNhanCoc === false ? 'not-allowed' : 'pointer', backgroundColor: decision === 'xac-nhan' ? '#F1F4F0' : (selected.coTheNhanCoc === false ? '#F1F4F0' : '#ffffff'), opacity: selected.coTheNhanCoc === false ? 0.6 : 1 }}
                      >
                        {/* boxSizing tường minh: không có nó, 20px + border 6px cho ra kích thước
                            khác nhau tùy ngữ cảnh CSS -> hai màn hình ra hai kiểu radio khác nhau. */}
                        <div style={{ width: '20px', height: '20px', boxSizing: 'border-box', borderRadius: '50%', border: decision === 'xac-nhan' ? '2px solid #4A6549' : '2px solid #bec8c9', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {decision === 'xac-nhan' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#4A6549' }}></div>}
                        </div>
                        <span style={{ fontWeight: '700', color: '#191c1d', fontSize: '14px' }}>Xác nhận nhận cọc</span>
                      </div>
                      <div
                        onClick={() => setDecision('tu-choi')}
                        style={{ padding: '16px', borderRadius: '8px', border: decision === 'tu-choi' ? '2px solid #4A6549' : '1px solid #bec8c9', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', backgroundColor: decision === 'tu-choi' ? '#F1F4F0' : '#ffffff' }}
                      >
                        <div style={{ width: '20px', height: '20px', boxSizing: 'border-box', borderRadius: '50%', border: decision === 'tu-choi' ? '2px solid #4A6549' : '2px solid #bec8c9', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {decision === 'tu-choi' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#4A6549' }}></div>}
                        </div>
                        <span style={{ fontWeight: '700', color: '#191c1d', fontSize: '14px' }}>Từ chối phòng này</span>
                      </div>
                    </div>

                    {(decision === 'tu-choi' || (decision === 'xac-nhan' && canApproveLater)) && (
                      <div style={{ backgroundColor: '#f8f9fa', border: '1px solid #e1e3e4', borderRadius: '8px', padding: '16px' }}>
                        <label style={{ display: 'block', fontWeight: '700', color: '#191c1d', marginBottom: '8px', fontSize: '13px' }}>{decision === 'tu-choi' ? 'Lý do từ chối' : 'Lý do duyệt yêu cầu gửi sau'} <span style={{ color: '#ba1a1a' }}>*</span></label>
                        <textarea
                          value={lyDo}
                          onChange={(e) => setLyDo(e.target.value)}
                          style={{ width: '100%', border: '1px solid #bec8c9', borderRadius: '8px', padding: '12px', fontSize: '14px', boxSizing: 'border-box', minHeight: '80px', resize: 'vertical' }}
                          placeholder={decision === 'tu-choi' ? 'Ví dụ: Phòng đã được khách khác cọc trước đó.' : 'Ví dụ: Khách gửi trước đã đổi nhu cầu thuê.'}
                        ></textarea>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6f797a', fontSize: '12px', marginTop: '8px' }}>
                          <Icon name="info" style={{ fontSize: '16px' }} />
                          <span>{decision === 'tu-choi' ? 'Lý do từ chối sẽ được gửi cho Sale và khách.' : 'Nếu yêu cầu khác bị từ chối tự động, lý do này sẽ được gửi cho Sale và khách.'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="ktp-modal-footer" style={{ borderTop: '1px solid #e1e3e4', backgroundColor: '#f8f9fa', padding: '16px 24px', display: 'flex', gap: '12px', justifyContent: 'flex-end', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
              <button className="ktp-btn-cancel" onClick={() => setSelected(null)} disabled={submitting} style={{ border: '1px solid #bec8c9', padding: '10px 24px', backgroundColor: '#ffffff', borderRadius: '8px', fontWeight: '600' }}>Đóng</button>
              {!readOnly && (
                <button className="ktp-btn-submit" onClick={handleSubmit} disabled={submitting || ((decision === 'tu-choi' || canApproveLater) && !lyDo.trim())} style={{ padding: '10px 24px', backgroundColor: '#4A6549', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '600', opacity: (submitting || ((decision === 'tu-choi' || canApproveLater) && !lyDo.trim())) ? 0.6 : 1, cursor: (submitting || ((decision === 'tu-choi' || canApproveLater) && !lyDo.trim())) ? 'not-allowed' : 'pointer' }}>
                  {submitting ? 'Đang xử lý...' : 'Xác nhận'}
                </button>
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
