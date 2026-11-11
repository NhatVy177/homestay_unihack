import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Icon } from '../../components/common/Icon.jsx';
import OverviewCards from '../../components/common/OverviewCards.jsx';
import StatusFilterTabs from '../../components/common/StatusFilterTabs.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import ListSearch from '../../components/common/ListSearch.jsx';
import TableState from '../../components/common/TableState.jsx';
import { kiemTraTraPhongApi } from './kiemTraTraPhong.api.js';
import './kiemTraTraPhong.css';

const MAX_ANH = 10;

function fmtDate(d) {
  if (!d) return '';
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('vi-VN') : '');
const fmtTien = (v) => `${v != null ? Number(v).toLocaleString() : 0}đ`;

// C2: tìm dòng biên bản lúc nhận phòng tương ứng một tài sản đang kiểm tra.
// Biên bản đã khóa chỉ có tên tài sản; backend gắn thêm mã khi tra được, còn lại so theo tên dài nhất khớp đầu.
function timLucNhanPhong(asset, moveIn) {
  const ds = moveIn?.taiSan || [];
  if (!ds.length) return null;
  const goc = asset.maTaiSanGoc || asset.maTaiSan;
  return ds.find(t => t.maTaiSan && t.maTaiSan === goc)
    || ds.filter(t => t.ten && String(asset.tenTaiSan || '').startsWith(t.ten)).sort((a, b) => b.ten.length - a.ten.length)[0]
    || null;
}

const AssetRow = ({ asset, onChange, readOnly, lucVao, coBienBanVao }) => {
  const [status, setStatus] = useState(asset.mucDoHuHong || 'Bình thường');
  const [soLuongLoi, setSoLuongLoi] = useState(asset.soLuongHuMat || 0);
  const [note, setNote] = useState(asset.moTaHuHong || '');
  const [cost, setCost] = useState(asset.chiPhiSuaChua || 0);

  const isNormal = status === 'Bình thường';

  const updateCost = (newStatus, newSl) => {
    if (newStatus === 'Bình thường') {
      setCost(0);
      return;
    }
    let tyLe = 0;
    if (newStatus === 'Hư hỏng nhẹ') tyLe = 0.2;
    else if (newStatus === 'Hư hỏng nặng') tyLe = 0.6;
    else if (newStatus === 'Mất mát') tyLe = 1.0;

    setCost(newSl * (asset.donGiaBoiThuong || 0) * tyLe);
  };

  useEffect(() => {
    onChange({
      keyTaiSan: asset.maTaiSan,
      maTaiSan: asset.maTaiSanGoc || asset.maTaiSan,
      thuTuTaiSan: asset.thuTuTaiSan || null,
      status,
      soLuongLoi: isNormal ? 0 : soLuongLoi,
      note,
      cost,
      donGiaBoiThuong: asset.donGiaBoiThuong
    });
  }, [status, soLuongLoi, note, cost]);

  let tyLeStr = '0%';
  if (status === 'Hư hỏng nhẹ') tyLeStr = '20%';
  else if (status === 'Hư hỏng nặng') tyLeStr = '60%';
  else if (status === 'Mất mát') tyLeStr = '100%';

  // D-030 (1): hư hỏng đã ghi lúc nhận phòng không được tính cho khách; chỉ cảnh báo vì món đó có thể hư thêm.
  const canhBaoHuCu = !isNormal && lucVao?.coHuHongLucVao;

  return (
    <tr data-status={status}>
      <td>
        <div className="kttp-asset-name">{asset.tenTaiSan}</div>
        {asset.donGiaBoiThuong > 0 && (
          <div className="kttp-asset-price">Đơn giá: {Number(asset.donGiaBoiThuong).toLocaleString()}đ</div>
        )}
      </td>
      <td>
        {lucVao ? (
          <div className={`kttp-movein-cell${lucVao.coHuHongLucVao ? ' is-defect' : ''}`}>{lucVao.tinhTrang}</div>
        ) : (
          <div className="kttp-movein-cell is-missing">{coBienBanVao ? 'Không có trong biên bản' : '—'}</div>
        )}
      </td>
      <td className="is-center">{asset.soLuongBanGiao}</td>
      <td>
        <select
          className="kttp-control kttp-control--status"
          aria-label={`Hiện trạng ${asset.tenTaiSan}`}
          value={status}
          onChange={(e) => {
            const newStatus = e.target.value;
            setStatus(newStatus);
            if (newStatus === 'Bình thường') {
              setNote('');
              setSoLuongLoi(0);
              setCost(0);
            } else {
              const newSl = soLuongLoi === 0 ? 1 : soLuongLoi;
              setSoLuongLoi(newSl);
              updateCost(newStatus, newSl);
            }
          }}
          disabled={readOnly}
        >
          <option value="Bình thường">Bình thường</option>
          <option value="Hư hỏng nhẹ">Hư hỏng nhẹ</option>
          <option value="Hư hỏng nặng">Hư hỏng nặng</option>
          <option value="Mất mát">Mất mát</option>
        </select>
        {canhBaoHuCu && (
          <p className="kttp-warning" role="note">
            <Icon name="warning" />
            <span>Lúc nhận phòng đã ghi: “{lucVao.tinhTrang}”. Hư hỏng có từ trước không tính cho khách; chỉ tính phần hư thêm.</span>
          </p>
        )}
      </td>
      <td>
        <input
          type="text"
          className="kttp-control is-center"
          aria-label={`Số lượng hư/mất ${asset.tenTaiSan}`}
          value={isNormal ? '-' : soLuongLoi}
          onChange={(e) => {
            const valStr = e.target.value.replace(/[^0-9]/g, '');
            if (valStr === '') {
              setSoLuongLoi('');
              updateCost(status, 0);
              return;
            }
            let val = parseInt(valStr);
            if (val > asset.soLuongBanGiao) val = asset.soLuongBanGiao;
            setSoLuongLoi(val);
            updateCost(status, val);
          }}
          disabled={isNormal || readOnly}
        />
      </td>
      <td className="is-center">{tyLeStr}</td>
      <td><div className="kttp-cost">{Number(cost).toLocaleString()}đ</div></td>
      <td>
        <textarea
          rows="2"
          className="kttp-control"
          aria-label={`Mô tả hư/mất ${asset.tenTaiSan}`}
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={isNormal ? "Không có hư hỏng" : "Mô tả..."}
          disabled={isNormal}
          spellCheck={false}
        />
      </td>
    </tr>
  );
};

function MoveInCard({ moveIn, loading, error }) {
  let status;
  if (loading) status = <span>Đang tải biên bản lúc nhận phòng...</span>;
  else if (error) status = <span>{error}</span>;
  else if (!moveIn || moveIn.nguon === 'khong-co') status = <span>Không tìm thấy biên bản lúc nhận phòng của hợp đồng này.</span>;
  else if (moveIn.nguon === 'web2') status = <><StatusBadge status="Chỉ có biên bản Web2" tone="neutral" /><span>Khách chưa xác nhận điện tử biên bản này.</span></>;
  else if (moveIn.khachDaXacNhan) status = <><StatusBadge status="Khách đã xác nhận" tone="success" /><span>Bản {moveIn.phienBan}{moveIn.xacNhanLuc ? `, xác nhận lúc ${fmtDateTime(moveIn.xacNhanLuc)}` : ''}</span></>;
  else status = <><StatusBadge status="Khách chưa xác nhận" tone="warning" /><span>Đang dùng bản {moveIn.phienBan} mới nhất đã phát hành.</span></>;

  return (
    <section className="kttp-card" aria-label="Biên bản lúc nhận phòng">
      <h4 className="kttp-card-title"><Icon name="verified_user" /> Biên bản lúc nhận phòng</h4>
      <div className="kttp-movein-status">{status}</div>
      {moveIn?.ghiChu && <p className="kttp-movein-note">Ghi chú lúc nhận phòng: {moveIn.ghiChu}</p>}
      {moveIn?.anh?.length > 0 && (
        <div className="kttp-photos">
          {moveIn.anh.map((a, i) => (
            <figure className="kttp-photo" key={`${a.ten}-${i}`}>
              <img src={`data:${a.mediaType};base64,${a.dataBase64}`} alt={`Ảnh lúc nhận phòng: ${a.ten}`} />
              <figcaption>{a.ten}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}

function CheckoutPhotos({ maPhieuTra, taiSan, readOnly, onToast }) {
  const [photos, setPhotos] = useState([]);
  const [urls, setUrls] = useState({});
  const [keyTaiSan, setKeyTaiSan] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const urlsRef = useRef({});

  const load = useCallback(async () => {
    try {
      const { data } = await kiemTraTraPhongApi.quanLyDanhSachAnh(maPhieuTra);
      setPhotos(data || []);
      setError('');
      const next = {};
      for (const p of data || []) {
        if (urlsRef.current[p.maAnh]) { next[p.maAnh] = urlsRef.current[p.maAnh]; continue; }
        try {
          const res = await kiemTraTraPhongApi.quanLyFileAnh(maPhieuTra, p.maAnh);
          next[p.maAnh] = URL.createObjectURL(res.data);
        } catch { /* thumbnail missing: the caption still shows */ }
      }
      Object.entries(urlsRef.current).forEach(([id, url]) => { if (!next[id]) URL.revokeObjectURL(url); });
      urlsRef.current = next;
      setUrls(next);
    } catch (err) {
      setError(err.response?.data?.message || 'Không tải được ảnh lúc trả phòng.');
    }
  }, [maPhieuTra]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => Object.values(urlsRef.current).forEach(url => URL.revokeObjectURL(url)), []);

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      await kiemTraTraPhongApi.quanLyTaiAnh(maPhieuTra, file, keyTaiSan);
      await load();
    } catch (err) {
      onToast(err.response?.data?.message || 'Không tải ảnh lên được.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };
  const remove = async (maAnh) => {
    setBusy(true);
    try {
      await kiemTraTraPhongApi.quanLyXoaAnh(maPhieuTra, maAnh);
      await load();
    } catch (err) {
      onToast(err.response?.data?.message || 'Không xóa được ảnh.');
    } finally {
      setBusy(false);
    }
  };
  const tenTaiSan = Object.fromEntries((taiSan || []).map(t => [t.maTaiSan, t.tenTaiSan]));

  return (
    <section className="kttp-card" aria-label="Ảnh lúc trả phòng">
      <h4 className="kttp-card-title"><Icon name="image" /> Ảnh lúc trả phòng <span className="kttp-card-aside">{photos.length}/{MAX_ANH}</span></h4>
      {error && <p className="kttp-field-error">{error}</p>}
      {photos.length > 0 ? (
        <div className="kttp-photos">
          {photos.map(p => (
            <figure className="kttp-photo" key={p.maAnh}>
              {urls[p.maAnh] ? <img src={urls[p.maAnh]} alt={`Ảnh lúc trả phòng: ${p.tenGoc}`} /> : <span className="kttp-photo-placeholder" aria-hidden="true" />}
              <figcaption>{p.keyTaiSan ? (tenTaiSan[p.keyTaiSan] || p.keyTaiSan) : 'Cả phòng'}</figcaption>
              {!readOnly && (
                <button type="button" className="kttp-photo-remove" onClick={() => remove(p.maAnh)} disabled={busy} aria-label={`Xóa ảnh ${p.tenGoc}`}>
                  <Icon name="close" />
                </button>
              )}
            </figure>
          ))}
        </div>
      ) : (
        <p className="kttp-empty-note">{readOnly ? 'Không có ảnh lúc trả phòng.' : 'Chưa có ảnh. Chụp những món khác lúc nhận phòng để kế toán và khách đối chiếu.'}</p>
      )}
      {!readOnly && photos.length < MAX_ANH && (
        <div className="kttp-photo-add">
          <select value={keyTaiSan} onChange={e => setKeyTaiSan(e.target.value)} aria-label="Ảnh này chụp món nào">
            <option value="">Cả phòng</option>
            {(taiSan || []).map(t => <option key={t.maTaiSan} value={t.maTaiSan}>{t.tenTaiSan}</option>)}
          </select>
          <input ref={inputRef} id={`kttp-photo-${maPhieuTra}`} className="kttp-file-input" type="file" accept="image/png,image/jpeg,image/webp"
            onChange={e => upload(e.target.files?.[0])} disabled={busy} />
          <label htmlFor={`kttp-photo-${maPhieuTra}`} className="ui-btn ui-btn--secondary ui-btn--sm">
            <Icon name="upload" /> {busy ? 'Đang tải...' : 'Thêm ảnh'}
          </label>
        </div>
      )}
    </section>
  );
}

export default function KiemTraTraPhong() {
  const [dsPhieu, setDsPhieu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('Chờ xử lý');
  const [toast, setToast] = useState('');
  const [successToast, setSuccessToast] = useState('');

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!successToast) return;
    const timer = setTimeout(() => setSuccessToast(''), 3000);
    return () => clearTimeout(timer);
  }, [successToast]);

  // Modal State
  const [modalType, setModalType] = useState(null); // 'kiem-tra-hd' or 'xac-nhan-pdc'
  const [selectedPhieu, setSelectedPhieu] = useState(null);
  const [chiTiet, setChiTiet] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [moveIn, setMoveIn] = useState(null);
  const [moveInLoading, setMoveInLoading] = useState(false);
  const [moveInError, setMoveInError] = useState('');

  // Form State
  const [ngayTraThucTe, setNgayTraThucTe] = useState(new Date().toISOString().split('T')[0]);
  const [tinhTrangPhong, setTinhTrangPhong] = useState('');
  const [dsHuHong, setDsHuHong] = useState({});
  const [errors, setErrors] = useState({});

  const loadDanhSach = useCallback(async () => {
    setLoading(true);
    try {
      const res = await kiemTraTraPhongApi.quanLyDanhSachChoXuLy('Tất cả');
      setDsPhieu(res.data.danhSach || []);
      setLoadError('');
    } catch (err) {
      setLoadError(err?.response?.data?.message || 'Lỗi tải danh sách');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDanhSach();
  }, [loadDanhSach]);

  const loadMoveIn = async (maPhieuTra) => {
    setMoveIn(null);
    setMoveInError('');
    setMoveInLoading(true);
    try {
      const { data } = await kiemTraTraPhongApi.quanLyBanGiaoVao(maPhieuTra);
      setMoveIn(data);
    } catch (err) {
      setMoveInError(err?.response?.data?.message || 'Không tải được biên bản lúc nhận phòng.');
    } finally {
      setMoveInLoading(false);
    }
  };

  const openModal = async (phieu) => {
    setSelectedPhieu(phieu);
    setModalType(phieu.loaiNguon === 'HopDong' ? 'kiem-tra-hd' : 'xac-nhan-pdc');
    setLoadingDetail(true);
    setTinhTrangPhong('');
    setDsHuHong({});
    setIsSubmitted(false);
    setErrors({});
    if (phieu.loaiNguon === 'HopDong') loadMoveIn(phieu.maPhieuTra);

    try {
      const res = await kiemTraTraPhongApi.quanLyChiTietPhieu(phieu.maPhieuTra);
      const data = res.data;
      setChiTiet(data);
      // Nếu phiếu đã có ngày trả thực tế (đã xử lý) thì hiển thị đúng ngày đó
      if (data.ngayTraThucTe) {
        setNgayTraThucTe(data.ngayTraThucTe.split('T')[0]);
      } else {
        setNgayTraThucTe(new Date().toISOString().split('T')[0]);
      }
      if (data.tinhTrangPhongThucTe) {
        setTinhTrangPhong(data.tinhTrangPhongThucTe);
      }
    } catch (err) {
      setToast(err?.response?.data?.message || 'Không thể tải chi tiết phiếu');
      setModalType(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleAssetChange = (assetData) => {
    setDsHuHong(prev => ({
      ...prev,
      [assetData.keyTaiSan]: assetData
    }));
  };

  const submitXacNhanHuyCoc = async () => {
    try {
      await kiemTraTraPhongApi.quanLyXacNhanHuyCoc({ maPhieuTra: selectedPhieu.maPhieuTra });
      loadDanhSach();
      setModalType(null);
      setSuccessToast('Hồ sơ đặt cọc đã được xác nhận thành công.');
    } catch (err) {
      console.error(err);
      setToast(err.response?.data?.message || 'Lỗi khi xác nhận hồ sơ.');
    }
  };

  const submitKiemTra = async () => {
    setErrors({});

    const huHongArr = Object.values(dsHuHong)
      .filter(item => item.status !== 'Bình thường')
      .map(item => ({
        maTaiSan: item.maTaiSan,
        thuTuTaiSan: item.thuTuTaiSan,
        soLuong: item.soLuongLoi,
        mucDoHuHong: item.status,
        donGiaBoiThuong: item.donGiaBoiThuong,
        moTa: item.note
      }));

    try {
      await kiemTraTraPhongApi.quanLyLapBienBanKiemTra({
        maPhieuTra: selectedPhieu.maPhieuTra,
        ngayTraThucTe,
        tinhTrangPhong,
        dsHuHong: huHongArr
      });
      loadDanhSach();
      setModalType(null);
      setSuccessToast('Biên bản kiểm tra trả phòng đã được lưu vào hệ thống.');
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message;
      if (msg) {
        if (msg.includes('Ngày trả thực tế') || msg.includes('chọn ngày')) {
          setErrors(prev => ({ ...prev, ngayTra: msg }));
        } else if (msg.includes('tình trạng phòng')) {
          setErrors(prev => ({ ...prev, tinhTrang: msg }));
        } else {
          setToast(msg);
        }
      } else {
        setToast('Lỗi khi lập biên bản.');
      }
    }
  };

  const countTatCa = dsPhieu.length;
  const countChoXuLy = dsPhieu.filter(p => p.trangThai === 'Chờ xử lý').length;
  const countDaXuLy = dsPhieu.filter(p => p.trangThai !== 'Chờ xử lý').length;
  const filterItems = [
    { key: 'Tất cả', label: 'Tất cả' },
    { key: 'Chờ xử lý', label: 'Chờ xử lý' },
    { key: 'Đã xử lý', label: 'Đã xử lý' }
  ];
  const filterCounts = { 'Tất cả': countTatCa, 'Chờ xử lý': countChoXuLy, 'Đã xử lý': countDaXuLy };

  const filteredItems = dsPhieu.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || p.hoTenKhach?.toLowerCase().includes(q) || p.sdtKhach?.includes(q) || p.maPhieuTra?.toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (filterStatus === 'Chờ xử lý') return p.trangThai === 'Chờ xử lý';
    if (filterStatus === 'Đã xử lý') return p.trangThai !== 'Chờ xử lý';
    return true;
  });

  const readOnly = selectedPhieu?.trangThai !== 'Chờ xử lý';
  const hoaDonNo = chiTiet?.nghiaVu?.filter(nv => nv.LoaiNghiaVu === 'HoaDon') || [];
  const viPham = chiTiet?.nghiaVu?.filter(nv => nv.LoaiNghiaVu === 'ViPham') || [];
  const trangThaiHoSo = chiTiet ? (chiTiet.maHopDong ? chiTiet.trangThaiHopDong : chiTiet.trangThaiCoc) : '';
  const coBienBanVao = Boolean(moveIn?.taiSan?.length);

  return (
    <div>
      <OverviewCards items={filterItems} counts={filterCounts} activeKey={filterStatus} onSelect={setFilterStatus} />
      <div className="ui-list-toolbar">
        <ListSearch value={searchQuery} onChange={setSearchQuery} placeholder="Tên khách hàng, SĐT hoặc mã phiếu..." />
        <StatusFilterTabs items={filterItems} activeKey={filterStatus} counts={filterCounts} onChange={setFilterStatus} />
      </div>
      <section className="ktp-table-section ui-list-table-card">
        <table className="ktp-table">
          <thead>
            <tr>
              <th>Mã phiếu</th>
              <th>Khách hàng</th>
              <th>Phòng/Giường</th>
              <th>Hồ sơ</th>
              <th>Dự kiến trả</th>
              <th>Trạng thái</th>
              <th className="ui-num">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableState kind="loading" colSpan={7} />
            ) : loadError ? (
              <TableState kind="error" colSpan={7} message={loadError} />
            ) : filteredItems.length === 0 ? (
              <TableState kind="empty" colSpan={7} message="Không có phiếu trả phòng nào phù hợp." />
            ) : filteredItems.map((row) => (
              <tr key={row.maPhieuTra}>
                <td className="ui-cell-code">{row.maPhieuTra}</td>
                <td>
                  <p className="ui-cell-main">{row.hoTenKhach}</p>
                  <span className="ui-cell-sub">{row.sdtKhach}</span>
                </td>
                <td>{row.tenPhong}</td>
                <td>
                  <StatusBadge status={row.loaiNguon === 'HopDong' ? 'Hợp đồng' : 'Phiếu đặt cọc'} tone={row.loaiNguon === 'HopDong' ? 'info' : 'neutral'} />
                  <span className="ui-cell-sub">{row.maNguon}</span>
                </td>
                <td>{fmtDate(row.ngayDuKienTra)}</td>
                <td><StatusBadge status={row.trangThai || 'Chờ xử lý'} tone={row.trangThai === 'Chờ xử lý' || !row.trangThai ? 'warning' : 'success'} /></td>
                <td className="ui-num">
                  {row.trangThai === 'Chờ xử lý' ? (
                    <button type="button" className="ui-btn ui-btn--primary ui-btn--sm" onClick={() => openModal(row)}>
                      {row.loaiNguon === 'HopDong' ? 'Lập biên bản' : 'Xác nhận'}
                    </button>
                  ) : (
                    <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={() => openModal(row)}>
                      Xem chi tiết
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Modal Overlay */}
      {modalType && (
        <div className="ktp-modal-overlay" onClick={() => setModalType(null)}>
          <div className="ktp-modal kttp-modal" role="dialog" aria-modal="true" aria-labelledby="kttp-title" onClick={(e) => e.stopPropagation()}>
            <div className="ktp-modal-header">
              <div className="ui-dialog-heading">
                <span className="ui-heading-symbol"><Icon name="fact_check" /></span>
                <h3 id="kttp-title">
                  {modalType === 'kiem-tra-hd' ? (selectedPhieu?.trangThai === 'Chờ xử lý' ? 'Lập biên bản kiểm tra trả phòng' : 'Chi tiết biên bản kiểm tra trả phòng') : (selectedPhieu?.trangThai === 'Chờ xử lý' ? 'Xác nhận hồ sơ trả phòng' : 'Chi tiết xác nhận hồ sơ trả phòng')}
                </h3>
              </div>
              <button type="button" className="ktp-modal-close" onClick={() => setModalType(null)} aria-label="Đóng"><Icon name="close" /></button>
            </div>

            <div className="ktp-modal-body">
              {loadingDetail ? (
                <p className="kttp-empty-note">Đang tải dữ liệu...</p>
              ) : chiTiet ? (
                <>
                  <section className="kttp-card">
                    <h4 className="kttp-card-title"><Icon name="info" /> Thông tin phiếu trả phòng</h4>
                    <dl className="kttp-facts">
                      <div><dt>Mã phiếu trả phòng</dt><dd>{chiTiet.maPhieuTra}</dd></div>
                      <div><dt>Ngày đăng ký</dt><dd>{fmtDate(chiTiet.ngayDangKyTra)}</dd></div>
                      <div><dt>Ngày dự kiến trả</dt><dd>{fmtDate(chiTiet.ngayDuKienTra)}</dd></div>
                      <div><dt>Trạng thái hiện tại</dt><dd><StatusBadge status={chiTiet.trangThai} tone={chiTiet.trangThai === 'Chờ xử lý' ? 'warning' : 'success'} /></dd></div>
                    </dl>
                  </section>

                  <div className="kttp-grid-3">
                    <section className="kttp-card">
                      <h4 className="kttp-card-title"><Icon name="person" /> Khách hàng</h4>
                      <dl className="kttp-rows">
                        <div><dt>Họ tên:</dt><dd>{chiTiet.hoTenKhach}</dd></div>
                        <div><dt>SĐT:</dt><dd>{chiTiet.sdtKhach || '—'}</dd></div>
                        <div><dt>CMND/CCCD:</dt><dd>{chiTiet.cccdKhach || '—'}</dd></div>
                      </dl>
                    </section>
                    <section className="kttp-card">
                      <h4 className="kttp-card-title"><Icon name="description" /> Hồ sơ</h4>
                      <dl className="kttp-rows">
                        <div><dt>Loại hồ sơ:</dt><dd>{chiTiet.maHopDong ? 'Hợp đồng thuê' : 'Phiếu đặt cọc'}</dd></div>
                        <div><dt>Mã hồ sơ:</dt><dd>{chiTiet.maHopDong ? chiTiet.maHopDong : chiTiet.maPhieuDatCoc}</dd></div>
                        <div><dt>Trạng thái hồ sơ:</dt><dd><StatusBadge status={trangThaiHoSo} tone={trangThaiHoSo?.includes('Đã') ? 'neutral' : 'success'} /></dd></div>
                      </dl>
                    </section>
                    <section className="kttp-card">
                      <h4 className="kttp-card-title"><Icon name="bed" /> Phòng/Giường</h4>
                      <dl className="kttp-rows">
                        <div><dt>Khu vực:</dt><dd>{chiTiet.tenChiNhanh || '—'}</dd></div>
                        <div><dt>Phòng/Giường:</dt><dd>
                          {chiTiet.hinhThucThue === 'Nguyên phòng'
                            ? chiTiet.tenPhong
                            : (chiTiet.maGiuong
                                ? `${chiTiet.tenPhong}-G${String(chiTiet.maGiuong).replace(/giường/i, '').trim().replace(/^G/i, '').padStart(2, '0')}`
                                : chiTiet.tenPhong)}
                        </dd></div>
                        <div><dt>Hình thức thuê:</dt><dd>{chiTiet.hinhThucThue || '—'}</dd></div>
                      </dl>
                    </section>
                  </div>

                  {modalType === 'kiem-tra-hd' && (
                    <>
                      {chiTiet.nghiaVu?.length > 0 && (
                        <div className="kttp-grid-2">
                          <section className="kttp-card">
                            <h4 className="kttp-card-title"><Icon name="receipt_long" /> Hóa đơn chưa thanh toán/nợ</h4>
                            {hoaDonNo.length > 0 ? (
                              <table className="kttp-mini-table">
                                <thead><tr><th>Kỳ hóa đơn</th><th>Trạng thái</th><th className="ui-num">Số tiền</th></tr></thead>
                                <tbody>
                                  {hoaDonNo.map((nv, i) => (
                                    <tr key={i}><td>{nv.Ten.replace('Hóa đơn kỳ ', '')}</td><td>{nv.TrangThai}</td><td className="ui-num">{fmtTien(nv.SoTien)}</td></tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : <p className="kttp-empty-note">Không có hóa đơn nợ</p>}
                          </section>
                          <section className="kttp-card">
                            <h4 className="kttp-card-title"><Icon name="warning" /> Biên bản vi phạm</h4>
                            {viPham.length > 0 ? (
                              <table className="kttp-mini-table">
                                <thead><tr><th>Nội dung vi phạm</th><th>Thời gian</th><th className="ui-num">Mức phạt</th></tr></thead>
                                <tbody>
                                  {viPham.map((nv, i) => (
                                    <tr key={i}><td>{nv.Ten}</td><td>{nv.ThoiGian || '—'}</td><td className="ui-num">{fmtTien(nv.SoTien)}</td></tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : <p className="kttp-empty-note">Không có lỗi vi phạm chưa xử lý</p>}
                          </section>
                        </div>
                      )}

                      <MoveInCard moveIn={moveIn} loading={moveInLoading} error={moveInError} />

                      <section className="kttp-card">
                        <label className="ui-form-field kttp-date">
                          <span>Ngày kiểm tra</span>
                          <input type="date" className="ui-input" value={ngayTraThucTe} onChange={(e) => setNgayTraThucTe(e.target.value)} disabled={readOnly} />
                        </label>
                        {errors.ngayTra && <p className="kttp-field-error">{errors.ngayTra}</p>}
                        <label className="ui-form-field">
                          <span>Tình trạng thực tế của phòng/giường <span className="ui-required">*</span></span>
                          <textarea rows="3" className="ui-input" value={tinhTrangPhong} aria-invalid={Boolean(errors.tinhTrang)}
                            onChange={(e) => { setTinhTrangPhong(e.target.value); setErrors(prev => ({ ...prev, tinhTrang: null })); }}
                            placeholder="Nhập đánh giá" disabled={readOnly} spellCheck={false} />
                        </label>
                        {errors.tinhTrang && <p className="kttp-field-error">{errors.tinhTrang}</p>}
                      </section>

                      {chiTiet.taiSan?.length > 0 && (
                        <section aria-label="Danh mục tài sản kiểm tra">
                          <h4 className="kttp-card-title">Danh mục tài sản kiểm tra</h4>
                          <div className="kttp-table-wrap">
                            <table className="kttp-assets">
                              <thead>
                                <tr>
                                  <th>Tài sản</th>
                                  <th>Lúc nhận phòng</th>
                                  <th className="is-center">SL bàn giao</th>
                                  <th className="is-center">Hiện trạng</th>
                                  <th className="is-center">SL hư/mất</th>
                                  <th className="is-center">Tỷ lệ</th>
                                  <th>Phí tạm tính</th>
                                  <th>Mô tả hư/mất</th>
                                </tr>
                              </thead>
                              <tbody>
                                {chiTiet.taiSan.map((asset) => (
                                  <AssetRow
                                    key={asset.maTaiSan}
                                    asset={asset}
                                    onChange={handleAssetChange}
                                    readOnly={readOnly}
                                    lucVao={timLucNhanPhong(asset, moveIn)}
                                    coBienBanVao={coBienBanVao}
                                  />
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </section>
                      )}

                      <CheckoutPhotos maPhieuTra={chiTiet.maPhieuTra} taiSan={chiTiet.taiSan} readOnly={readOnly} onToast={setToast} />
                    </>
                  )}
                </>
              ) : null}
            </div>

            <div className={`ktp-modal-footer${modalType === 'kiem-tra-hd' ? '' : ' is-end'}`}>
              {modalType === 'kiem-tra-hd' && (
                <p className="kttp-footer-note">
                  <Icon name="info" />
                  <span><strong>Lưu ý:</strong> Vui lòng kiểm tra, đối chiếu đầy đủ thông tin với hồ sơ, chứng từ và tình trạng thực tế trước khi xác nhận lưu biên bản.</span>
                </p>
              )}
              <div className="kttp-actions">
                <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setModalType(null)}>Hủy</button>
                {!isSubmitted && modalType === 'kiem-tra-hd' && selectedPhieu?.trangThai === 'Chờ xử lý' && (
                  <button type="button" className="ui-btn ui-btn--primary" onClick={submitKiemTra}>Xác nhận lưu biên bản</button>
                )}
                {!isSubmitted && modalType === 'xac-nhan-pdc' && selectedPhieu?.trangThai === 'Chờ xử lý' && (
                  <button type="button" className="ui-btn ui-btn--primary" onClick={submitXacNhanHuyCoc}>Xác nhận hồ sơ</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="ui-toast ui-toast--error" role="alert"><Icon name="error_outline" />{toast}</div>}
      {successToast && <div className="ui-toast ui-toast--success" role="status"><Icon name="check_circle" />{successToast}</div>}
    </div>
  );
}
