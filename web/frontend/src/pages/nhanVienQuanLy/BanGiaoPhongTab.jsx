import OverviewCards from '../../components/common/OverviewCards.jsx';
import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../components/common/Icon.jsx';
import { banGiaoPhongApi } from './banGiaoPhong.api.js';
import { httpClient } from '../../api/httpClient.js';
import { avalancheApi, errorMessage } from '../../lib/avalanche/api.js';
import StatusFilterTabs from '../../components/common/StatusFilterTabs.jsx';
import { ConfirmationNotice } from '../../components/xacNhan/ConfirmationFeedback.jsx';
import '../nhanPhong/cuTru.css';

const TINH_TRANG_TAI_SAN = ['Tốt', 'Dùng được', 'Hư hỏng'];
const conditionClass = (value) => (value === 'Hư hỏng' ? 'ui-condition--bad' : value === 'Dùng được' ? 'ui-condition--ok' : value === 'Tốt' ? 'ui-condition--good' : 'ui-condition--none');
const ConditionTag = ({ value }) => <span className={`ui-condition ${conditionClass(value)}`}>{value || 'Chưa ghi nhận'}</span>;

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('vi-VN');
}

function isFutureDate(value) {
  if (!value) return false;
  const inputDate = new Date(value);
  const today = new Date();
  inputDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return inputDate > today;
}

function getFutureStartMessage(value) {
  return `Chưa tới ngày hẹn bàn giao. Ngày bắt đầu hợp đồng là ${formatDate(value)}.`;
}

function isWholeRoomValue(value) {
  return !value || String(value).toLowerCase().includes('nguyên');
}

function getScopeLabel(value) {
  return isWholeRoomValue(value) ? 'Bàn giao nguyên phòng' : 'Bàn giao theo giường';
}

function formatRoomBedLabel(room, bed, wholeRoomText = 'Toàn phòng') {
  const roomLabel = room || '-';
  return isWholeRoomValue(bed) ? `${roomLabel} / ${wholeRoomText}` : `${roomLabel} / ${bed}`;
}

function InfoRow({ label, value, badge }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
      <span style={{ color: '#6f797a', fontSize: '13px' }}>{label}</span>
      {badge ? (
        <span style={{
          backgroundColor: badge === 'success' ? '#F1F4F0' : '#fff8e1',
          color: badge === 'success' ? '#3D553C' : '#6b4f00',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: '700',
          border: badge === 'success' ? '1px solid #E0E3DF' : '1px solid #f2d47c',
          whiteSpace: 'nowrap'
        }}>
          {value || '-'}
        </span>
      ) : (
        <span style={{ fontWeight: '600', fontSize: '14px', color: '#191c1d', textAlign: 'right' }}>{value || '-'}</span>
      )}
    </div>
  );
}

function SummaryCard({ icon, title, children, accentColor = '#4A6549' }) {
  return (
    <div className="ktp-section handover-summary-card" style={{ '--handover-accent': accentColor }}>
      <h4 style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#191c1d',
        borderBottom: '1px solid #e1e3e4',
        paddingBottom: '12px',
        marginBottom: '16px'
      }}>
        <Icon name={icon} /> {title}
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {children}
      </div>
    </div>
  );
}

export default function BanGiaoPhongTab({ onDieuPhoi }) {
  const [maHopDong, setMaHopDong] = useState('');
  const [hopDong, setHopDong] = useState(null);
  const [dieuKien, setDieuKien] = useState(null);
  const [danhSachTaiSan, setDanhSachTaiSan] = useState([]);
  const [quanLyXacNhan, setQuanLyXacNhan] = useState(true);
  const [khachCoMat, setKhachCoMat] = useState(true);
  // D-009/D-012: không còn ô "khách đã ký giấy"; khách xác nhận điện tử trên tài khoản sau khi lưu.
  const [ghiChuChung, setGhiChuChung] = useState('');
  const [notice, setNotice] = useState(null);
  const [successDialog, setSuccessDialog] = useState(null);
  const [thieuBanKy, setThieuBanKy] = useState(false), [guiLai, setGuiLai] = useState({ busy: false, message: '', error: '' });
  const [danhSachChoBanGiao, setDanhSachChoBanGiao] = useState([]);
  const [loadingDanhSach, setLoadingDanhSach] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterState, setFilterState] = useState('chua-ban-giao'); // 'chua-ban-giao' | 'da-thanh-toan' (chờ bàn giao) | 'cho-thu-tien' | 'da-ban-giao' | 'all'
  const [searchQuery, setSearchQuery] = useState('');

  const isReadOnlyHandover = Boolean(hopDong?.daCoBienBanBanGiaoVao || Number(dieuKien?.maLoi) === -5);

  const canSubmit = useMemo(() => {
    return Boolean(
      hopDong
      && !isReadOnlyHandover
      && dieuKien?.hopLe
      && danhSachTaiSan.length > 0
      && quanLyXacNhan
      && khachCoMat
      && !saving
    );
  }, [dieuKien, danhSachTaiSan.length, hopDong, isReadOnlyHandover, khachCoMat, quanLyXacNhan, saving]);

  const assetNoteCount = useMemo(() => {
    return danhSachTaiSan.filter((item) => (
      Number(item.soLuongThucTe) !== Number(item.soLuongHeThong)
    )).length;
  }, [danhSachTaiSan]);

  const counts = useMemo(() => {
    const all = danhSachChoBanGiao.length;
    const choThuTien = danhSachChoBanGiao.filter((item) => !item.daDongTienDauKy && !item.daBanGiao).length;
    const daThanhToan = danhSachChoBanGiao.filter((item) => item.daDongTienDauKy && !item.daBanGiao).length;
    const daBanGiao = danhSachChoBanGiao.filter((item) => item.daBanGiao).length;
    return { all, 'chua-ban-giao': choThuTien + daThanhToan, 'cho-thu-tien': choThuTien, 'da-thanh-toan': daThanhToan, 'da-ban-giao': daBanGiao };
  }, [danhSachChoBanGiao]);

  const filteredList = useMemo(() => {
    let list = danhSachChoBanGiao;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((item) => (
        String(item.maHopDong || '').toLowerCase().includes(q) ||
        String(item.hoTen || '').toLowerCase().includes(q) ||
        String(item.soDienThoai || '').toLowerCase().includes(q) ||
        String(item.tenPhong || item.maPhong || '').toLowerCase().includes(q)
      ));
    }
    if (filterState === 'chua-ban-giao') list = list.filter((item) => !item.daBanGiao);
    else if (filterState === 'cho-thu-tien') list = list.filter((item) => !item.daDongTienDauKy && !item.daBanGiao);
    else if (filterState === 'da-thanh-toan') list = list.filter((item) => item.daDongTienDauKy && !item.daBanGiao);
    else if (filterState === 'da-ban-giao') list = list.filter((item) => item.daBanGiao);
    // Ưu tiên: sẵn sàng bàn giao (đã thanh toán) trước, rồi chờ thanh toán, đã bàn giao xuống cuối.
    const rank = (item) => (item.daBanGiao ? 2 : item.daDongTienDauKy ? 0 : 1);
    return [...list].sort((a, b) => rank(a) - rank(b));
  }, [danhSachChoBanGiao, filterState, searchQuery]);

  const fetchDanhSachChoBanGiao = async () => {
    setLoadingDanhSach(true);
    try {
      const res = await banGiaoPhongApi.getDanhSachChoBanGiao();
      setDanhSachChoBanGiao((res.data || []).filter((item) => (
        Boolean(item.tinhTrangGiuongHopLe) && !isFutureDate(item.ngayBatDau)
      )));
    } catch (error) {
      setNotice({
        type: 'error',
        title: 'Không tải được danh sách',
        message: getErrorMessage(error, 'Không thể tải danh sách hợp đồng có thể bàn giao.')
      });
    } finally {
      setLoadingDanhSach(false);
    }
  };

  useEffect(() => {
    fetchDanhSachChoBanGiao();
  }, []);

  const handleSearch = async (selectedMaHopDong) => {
    const cleanMaHopDong = String(selectedMaHopDong || maHopDong).trim();
    if (!cleanMaHopDong) {
      setNotice({ type: 'error', title: 'Thiếu mã hợp đồng', message: 'Vui lòng nhập mã hợp đồng cần bàn giao.' });
      return;
    }

    setMaHopDong(cleanMaHopDong);
    setLoading(true);
    setNotice(null);
    setHopDong(null);
    setDanhSachTaiSan([]);
    setThieuBanKy(false);

    try {
      const res = await banGiaoPhongApi.traCuuHopDongBanGiao(cleanMaHopDong);
      // Bản xem gửi khách cần ảnh hợp đồng đã ký (Sale tải); báo trước để khỏi lập xong mới biết không gửi được.
      httpClient.get(`/hop-dong/${encodeURIComponent(cleanMaHopDong)}/ban-ky`).then((r) => setThieuBanKy(!r.data)).catch(() => setThieuBanKy(false));
      const futureStartMessage = isFutureDate(res.data.hopDong?.ngayBatDau)
        ? getFutureStartMessage(res.data.hopDong.ngayBatDau)
        : null;
      setHopDong(res.data.hopDong);
      setDieuKien(futureStartMessage
        ? { ...(res.data.dieuKien || {}), hopLe: false, maLoi: -16, thongBao: futureStartMessage }
        : res.data.dieuKien);
      if (res.data.hopDong?.daCoBienBanBanGiaoVao) {
        setKhachCoMat(res.data.hopDong.khachCoMat ?? true);
        setGhiChuChung(res.data.hopDong.ghiChuChung || '');
      } else {
        setKhachCoMat(true);
        setGhiChuChung('');
      }
      setDanhSachTaiSan((res.data.danhSachTaiSan || []).map((item) => ({
        ...item,
        soLuongThucTe: item.soLuongThucTe ?? item.soLuongHeThong ?? 0,
        ghiChu: item.ghiChu || '',
        tinhTrang: item.tinhTrang || 'Tốt'
      })));
      if (!res.data.hopDong?.daCoBienBanBanGiaoVao) {
        setNotice({
          type: !futureStartMessage && res.data.dieuKien?.hopLe ? 'success' : 'warning',
          title: !futureStartMessage && res.data.dieuKien?.hopLe ? 'Hợp đồng đủ điều kiện' : 'Chưa thể bàn giao',
          message: futureStartMessage || res.data.dieuKien?.thongBao || 'Đã tải thông tin hợp đồng.'
        });
      } else {
        setNotice(null);
      }
    } catch (error) {
      setNotice({ type: 'error', title: 'Không tra cứu được', message: getErrorMessage(error, 'Không tìm thấy hợp đồng cần bàn giao.') });
    } finally {
      setLoading(false);
    }
  };

  const updateAsset = (index, field, value) => {
    setDanhSachTaiSan((items) => items.map((item, currentIndex) => (
      currentIndex === index ? { ...item, [field]: value } : item
    )));
  };

  const validateBeforeSubmit = () => {
    if (isFutureDate(hopDong?.ngayBatDau)) return getFutureStartMessage(hopDong.ngayBatDau);
    if (!quanLyXacNhan) return 'Quản lý cần xác nhận đã kiểm kê tài sản bàn giao.';
    if (!khachCoMat) return 'Khách hàng không có mặt tại thời điểm bàn giao.';

    for (const item of danhSachTaiSan) {
      const actual = item.soLuongThucTe === '' ? null : Number(item.soLuongThucTe);
      const expected = Number(item.soLuongHeThong);
      if (actual == null || !Number.isFinite(actual) || actual < 0) {
        return `Vui lòng nhập số lượng thực tế hợp lệ cho tài sản ${item.tenTaiSan}.`;
      }
      if (Number.isFinite(expected) && actual !== expected && !String(item.ghiChu || '').trim()) {
        return `Tài sản ${item.tenTaiSan} chênh lệch số lượng, vui lòng nhập ghi chú.`;
      }
      if (item.tinhTrang === 'Hư hỏng' && !String(item.ghiChu || '').trim()) {
        return `Tài sản ${item.tenTaiSan} đang hư hỏng, vui lòng ghi chú tình trạng.`;
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationMessage = validateBeforeSubmit();
    if (validationMessage) {
      setNotice({ type: 'error', title: 'Chưa thể lưu biên bản', message: validationMessage });
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const res = await banGiaoPhongApi.lapBienBanBanGiao({
        maHopDong: hopDong.maHopDong,
        khachCoMat,
        ghiChuChung,
        danhSachTaiSan
      });
      const ketQua = res.data.ketQua;
      const xacNhan = res.data.xacNhanDienTu;
      setGuiLai({ busy: false, message: '', error: '' });
      setSuccessDialog({
        title: 'Lập biên bản thành công',
        canGuiLai: xacNhan?.status === 'failed',
        message: `${res.data.thongBao || 'Đã lập biên bản bàn giao.'}${ketQua?.maBienBan ? ` Mã biên bản: ${ketQua.maBienBan}.` : ''}`,
        maBienBan: ketQua?.maBienBan || res.data.maBienBan,
        xacNhan: xacNhan?.status === 'published'
          ? `${xacNhan.notification === 'sent' ? 'Đã gửi biên bản vào tài khoản và đã gửi email cho khách.' : 'Đã gửi biên bản vào tài khoản khách để xác nhận.'} Khách có thể xác nhận ngay trên điện thoại hoặc yêu cầu chỉnh sửa; theo dõi ở tab "Khách xác nhận biên bản".`
          : xacNhan?.status === 'failed'
            ? `Chưa gửi được bản xem cho khách: ${xacNhan.message} Bạn có thể bấm "Gửi lại cho khách" bên dưới sau khi xử lý (hoặc gửi ở tab "Khách xác nhận biên bản").`
            : null
      });
      setDanhSachChoBanGiao((items) => items.filter((item) => item.maHopDong !== hopDong.maHopDong));
      setMaHopDong('');
      setHopDong(null);
      setDieuKien(null);
      setDanhSachTaiSan([]);
      setGhiChuChung('');
      setQuanLyXacNhan(true);
      setKhachCoMat(true);
    } catch (error) {
      setNotice({ type: 'error', title: 'Không lưu được biên bản', message: getErrorMessage(error, 'Có lỗi khi lập biên bản bàn giao.') });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setMaHopDong('');
    setHopDong(null);
    setDieuKien(null);
    setDanhSachTaiSan([]);
    setGhiChuChung('');
    setQuanLyXacNhan(true);
    setKhachCoMat(true);
    setNotice(null);
    setSuccessDialog(null);
  };

  const FlatSummaryCard = ({ icon, title, children, accentColor }) => (
    <div style={{
      backgroundColor: '#F1F4F0',
      border: '1px solid #E8EDE7',
      borderRadius: '12px',
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px'
    }}>
      <h4 style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        fontWeight: '700',
        color: accentColor,
        margin: 0,
        borderBottom: '1px solid #E8EDE7',
        paddingBottom: '10px'
      }}>
        <Icon name={icon} /> {title}
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {children}
      </div>
    </div>
  );

  return (
    <div className="ktp-container handover-tab">
      {!hopDong && notice && (
        <div className={`ktp-inline-notice ktp-inline-notice-${notice.type}`} style={{ marginBottom: '16px' }}>
          <div>
            <strong>{notice.title}</strong>
            <p>{notice.message}</p>
          </div>
          <button type="button" onClick={() => setNotice(null)}>Đóng</button>
        </div>
      )}

      {successDialog && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(25, 28, 29, 0.42)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            width: 'min(520px, 100%)',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 18px 48px rgba(0, 0, 0, 0.22)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '20px 24px', backgroundColor: '#ffffff', color: '#191c1d', borderBottom: '1px solid #e1e3e4', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#F1F4F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4A6549' }}>
                <Icon name="check_circle" />
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#191c1d' }}>{successDialog.title}</h3>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ margin: 0, color: '#191c1d', fontSize: '15px', lineHeight: 1.6 }}>{successDialog.message}</p>
              {successDialog.maBienBan && (
                <div style={{ marginTop: '16px', padding: '12px 14px', backgroundColor: '#F1F4F0', border: '1px solid #E0E3DF', borderRadius: '6px', color: '#4A6549', fontWeight: 700 }}>
                  Mã biên bản: {successDialog.maBienBan}
                </div>
              )}
              {(successDialog.xacNhan || guiLai.message || guiLai.error) && <div className="xn-publish-feedback">
                {successDialog.xacNhan && !guiLai.message && <ConfirmationNotice tone={successDialog.canGuiLai ? 'warning' : 'success'}>{successDialog.xacNhan}</ConfirmationNotice>}
                {guiLai.message && <ConfirmationNotice tone="success">{guiLai.message}</ConfirmationNotice>}
                {guiLai.error && <ConfirmationNotice tone="danger">{guiLai.error}</ConfirmationNotice>}
              </div>}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e1e3e4', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              {successDialog.canGuiLai && !guiLai.message && (
                <button
                  type="button"
                  className="ktp-btn-outline"
                  style={{ padding: '10px 18px', whiteSpace: 'nowrap' }}
                  disabled={guiLai.busy}
                  onClick={async () => {
                    setGuiLai({ busy: true, message: '', error: '' });
                    try {
                      await avalancheApi.post('/cases', { sourceId: successDialog.maBienBan });
                      setGuiLai({ busy: false, message: 'Đã gửi biên bản cho khách xác nhận.', error: '' });
                    } catch (error) {
                      setGuiLai({ busy: false, message: '', error: errorMessage(error) });
                    }
                  }}
                >
                  {guiLai.busy ? 'Đang gửi...' : 'Gửi lại cho khách'}
                </button>
              )}
              <button
                type="button"
                className="ktp-btn-submit"
                style={{ padding: '10px 24px' }}
                onClick={() => { setSuccessDialog(null); setGuiLai({ busy: false, message: '', error: '' }); }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {!hopDong && (
        <>
<OverviewCards items={[
              { key: 'chua-ban-giao', label: 'Chưa bàn giao' },
              { key: 'da-thanh-toan', label: 'Chờ bàn giao' },
              { key: 'cho-thu-tien', label: 'Chờ thanh toán' },
              { key: 'da-ban-giao', label: 'Đã bàn giao' }
            ]} counts={counts} />
<div className="ui-list-toolbar">
              <label className="ui-list-search">
                <span className="ui-search-label">Tìm kiếm</span>
                <Icon name="search" />
<input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Mã hợp đồng, tên khách hàng, số điện thoại hoặc tên phòng..."
                  className="ktp-input"

                />
              </label>
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} className="ktp-btn-cancel" >Xóa lọc</button>
              )}

<StatusFilterTabs
            className="status-pill-tabs-offset"
            items={[
              { key: 'chua-ban-giao', label: 'Chưa bàn giao' },
              { key: 'da-thanh-toan', label: 'Chờ bàn giao' },
              { key: 'cho-thu-tien', label: 'Chờ thanh toán' },
              { key: 'da-ban-giao', label: 'Đã bàn giao' },
              { key: 'all', label: 'Tất cả' }
            ]}
            activeKey={filterState}
            counts={counts}
            onChange={setFilterState}
          />
</div>
<section className="ktp-table-section handover-queue-card ui-list-table-card">


          <div className="handover-queue-head">
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#191c1d' }}>Hợp đồng có thể bàn giao</h3>
              <p style={{ margin: '6px 0 0 0', color: '#6f797a', fontSize: '13px' }}>Danh sách hợp đồng chờ bàn giao vào phòng/giường.</p>
            </div>
            <button
              type="button"
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #bec8c9', backgroundColor: '#ffffff', color: '#4A6549', fontWeight: 700, cursor: 'pointer' }}
              onClick={fetchDanhSachChoBanGiao}
              disabled={loadingDanhSach}
            >
              {loadingDanhSach ? 'Đang tải...' : 'Làm mới'}
            </button>
          </div>

          {/* Segmented control: lọc theo trạng thái + số đếm */}


          <div className="handover-table-scroll">
            <table className="ktp-table">
              <thead>
                <tr>
                  <th>Mã hợp đồng</th>
                  <th>Khách thuê</th>
                  <th>Phòng / Giường</th>
                  <th>Ngày bắt đầu</th>
                  <th className="text-center">Trạng thái</th>
                  <th className="text-center" style={{ width: '150px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loadingDanhSach ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: '#6f797a', padding: '28px' }}>Đang tải danh sách hợp đồng...</td>
                  </tr>
                ) : filteredList.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: '#6f797a', padding: '28px' }}>Không có hợp đồng nào thuộc trạng thái này.</td>
                  </tr>
                ) : filteredList.map((item) => (
                  <tr key={`${item.maHopDong}-${item.maPhong}-${item.maGiuong || 'phong'}`}>
                    <td style={{ fontWeight: 700, color: '#4A6549' }}>{item.maHopDong}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#191c1d' }}>{item.hoTen}</div>
                      <div style={{ fontSize: '12px', color: '#6f797a' }}>{item.soDienThoai || item.cccd || '-'}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#191c1d' }}>{item.tenPhong || item.maPhong}</div>
                      <div style={{ fontSize: '12px', color: isWholeRoomValue(item.maGiuong) ? '#4A6549' : '#6f797a', fontWeight: isWholeRoomValue(item.maGiuong) ? 700 : 500 }}>
                        {isWholeRoomValue(item.maGiuong) ? 'Nguyên phòng' : `Giường ${item.maGiuong}`}
                      </div>
                    </td>
                    <td>{formatDate(item.ngayBatDau)}</td>
                    <td className="text-center">
                      {item.daBanGiao ? (
                        <span style={{
                          backgroundColor: '#E8EDE7',
                          color: '#4A6549',
                          padding: '4px 12px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          display: 'inline-block'
                        }}>
                          Đã bàn giao
                        </span>
                      ) : item.daDongTienDauKy ? (
                        <span style={{
                          backgroundColor: '#e6f6ec',
                          color: '#15803d',
                          padding: '4px 12px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          display: 'inline-block'
                        }}>
                          Chờ bàn giao
                        </span>
                      ) : (
                        <span style={{
                          backgroundColor: '#fff8e1',
                          color: '#f57f17',
                          padding: '4px 12px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          display: 'inline-block'
                        }}>
                          Chờ thanh toán
                        </span>
                      )}
                    </td>
                    <td className="text-center" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      {item.daBanGiao ? (
                        <button
                          type="button"
                          className="ktp-btn-outline"
                          style={{
                            padding: '8px 14px',
                            minWidth: '92px',
                            border: '1.5px solid #bec8c9',
                            color: '#3f494a',
                            backgroundColor: '#ffffff',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '13px',
                            whiteSpace: 'nowrap'
                          }}
                          onClick={() => handleSearch(item.maHopDong)}
                          disabled={loading}
                        >
                          Xem biên bản
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="ktp-btn-submit"
                          style={{ padding: '8px 14px', minWidth: '92px', whiteSpace: 'nowrap' }}
                          onClick={() => handleSearch(item.maHopDong)}
                          disabled={loading || !item.daDongTienDauKy}
                        >
                          Bàn giao
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
</>
      )}

      {/* POPUP XEM BIÊN BẢN (READ-ONLY) */}
      {hopDong && isReadOnlyHandover && (
        <div className="ktp-modal-overlay" onClick={resetForm} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(25, 28, 29, 0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}>
          <div className="ktp-modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '880px', maxWidth: '95%', maxHeight: '85vh', backgroundColor: '#ffffff', overflowY: 'auto', display: 'flex', flexDirection: 'column', borderRadius: '16px', boxShadow: '0 24px 64px rgba(0, 50, 54, 0.12)', border: '1px solid #E8EDE7', animation: 'fadeIn 0.2s forwards' }}>
            
            {/* Header */}
            <div style={{ padding: '20px 28px', backgroundColor: '#ffffff', color: '#4A6549', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid #eef2f2' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Biên bản bàn giao vào: {hopDong.maHopDong}</h3>
              </div>
              <button onClick={resetForm} style={{ background: 'none', border: 'none', color: '#6f797a', cursor: 'pointer', display: 'flex', fontSize: '24px', transition: 'color 0.15s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#4A6549'} onMouseLeave={(e) => e.currentTarget.style.color = '#6f797a'}>
                <Icon name="close" />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Flat cards grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                <FlatSummaryCard icon="description" title="Thông tin hợp đồng" accentColor="#4A6549">
                  <InfoRow label="Mã HĐ:" value={hopDong.maHopDong} />
                  <InfoRow label="Trạng thái:" value={hopDong.trangThaiHopDong} badge={hopDong.trangThaiHopDong === 'Hiệu lực' ? 'success' : 'warning'} />
                  <InfoRow label="Ngày bắt đầu:" value={formatDate(hopDong.ngayBatDau)} />
                  <InfoRow label="Thời hạn:" value={`${hopDong.thoiHanThue || 0} tháng`} />
                </FlatSummaryCard>

                <FlatSummaryCard icon="person" title="Thông tin khách thuê" accentColor="#4A6549">
                  <InfoRow label="Họ tên:" value={hopDong.hoTenKhachHang} />
                  <InfoRow label="SĐT:" value={hopDong.sdt} />
                  <InfoRow label="Số người ở:" value={`${Math.max(Number(hopDong.soNguoiO) || 0, 1)} người`} />
                  <InfoRow label="Hóa đơn kỳ đầu:" value={hopDong.trangThaiHoaDonKyDau} badge={hopDong.trangThaiHoaDonKyDau === 'Đã TT' ? 'success' : 'warning'} />
                </FlatSummaryCard>

                <FlatSummaryCard icon="bed" title="Thông tin phòng/giường" accentColor="#4A6549">
                  <InfoRow label="Chi nhánh:" value={hopDong.tenChiNhanh} />
                  <InfoRow label="Hình thức:" value={getScopeLabel(hopDong.danhSachGiuong)} badge="success" />
                  <InfoRow label="Phòng:" value={hopDong.tenPhong || hopDong.maPhong} />
                  <InfoRow label="Phạm vi:" value={isWholeRoomValue(hopDong.danhSachGiuong) ? 'Toàn bộ phòng' : `Giường ${hopDong.danhSachGiuong}`} />
                  <InfoRow label="Trạng thái:" value="Đã lập HĐ" badge={hopDong.coTheBanGiao ? 'success' : 'warning'} />
                </FlatSummaryCard>
              </div>

              {/* Workspace flat borderless container */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #4A6549', paddingBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#191c1d', margin: 0 }}>
                      Thông tin biên bản bàn giao
                    </h3>
                    <p style={{ fontSize: '13px', color: '#6f797a', margin: '4px 0 0 0' }}>
                      Danh sách tài sản và kết quả kiểm kê thực tế.
                    </p>
                  </div>
                  <div className="handover-pills">
                    <span className="handover-pill" style={{ backgroundColor: '#F1F4F0', color: '#4A6549' }}>
                      <Icon name={isWholeRoomValue(hopDong.danhSachGiuong) ? 'home' : 'bed'} />
                      {getScopeLabel(hopDong.danhSachGiuong)}
                    </span>
                    <span className={`handover-pill ${assetNoteCount > 0 ? 'is-warning' : ''}`} style={{ backgroundColor: assetNoteCount > 0 ? '#fff8e1' : '#F1F4F0', color: assetNoteCount > 0 ? '#b93c00' : '#4A6549' }}>
                      <Icon name="edit_note" />
                      {assetNoteCount > 0 ? `${assetNoteCount} tài sản cần ghi chú` : 'Chưa có chênh lệch'}
                    </span>
                  </div>
                </div>

                <div className="handover-table-scroll">
                  <table className="ktp-table" style={{ tableLayout: 'fixed', minWidth: '800px' }}>
                    <thead style={{ backgroundColor: '#F1F4F0' }}>
                      <tr>
                        <th style={{ width: '110px', color: '#4A6549' }}>Mã tài sản</th>
                        <th style={{ width: '240px', color: '#4A6549' }}>Tên tài sản</th>
                        <th style={{ width: '170px', color: '#4A6549' }}>Phạm vi</th>
                        <th style={{ width: '210px', color: '#4A6549' }}>Kiểm kê</th>
                        <th style={{ width: '140px', color: '#4A6549' }}>Tình trạng</th>
                        <th style={{ width: '320px', color: '#4A6549' }}>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {danhSachTaiSan.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', color: '#6f797a', padding: '28px' }}>
                            Chưa có tài sản bàn giao cho hợp đồng này.
                          </td>
                        </tr>
                      ) : danhSachTaiSan.map((item, index) => {
                        const hasDifference = Number(item.soLuongThucTe) !== Number(item.soLuongHeThong);
                        return (
                          <tr key={`${item.maPhong}-${item.maTaiSan}-${index}`} style={{ backgroundColor: hasDifference ? '#fffaf3' : '#ffffff' }}>
                            <td style={{ fontWeight: 700, color: '#4A6549', verticalAlign: 'middle' }}>{item.maTaiSan}</td>
                            <td style={{ fontWeight: 700, color: '#191c1d', verticalAlign: 'middle' }}>{item.tenTaiSan}</td>
                            <td style={{ verticalAlign: 'middle' }}>
                              <div style={{ fontWeight: 600, color: '#191c1d' }}>{item.tenPhong || item.maPhong}</div>
                              {!isWholeRoomValue(item.maGiuong) && (
                                <div style={{ fontSize: '12px', color: '#6f797a', fontWeight: 500 }}>
                                  Giường {item.maGiuong}
                                </div>
                              )}
                            </td>
                            <td style={{ verticalAlign: 'middle' }}>
                              {hasDifference ? (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                  <span style={{ color: '#6f797a' }}>Định mức:</span>
                                  <strong style={{ color: '#191c1d' }}>{item.soLuongHeThong}</strong>
                                  <span style={{ color: '#8a9495' }}>→</span>
                                  <span style={{ color: '#b93c00', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700, backgroundColor: '#fff0e6', padding: '4px 10px', borderRadius: '12px', fontSize: '12px' }}>
                                    <Icon name="warning" style={{ fontSize: '14px' }} /> {item.soLuongThucTe}
                                  </span>
                                </div>
                              ) : (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                  <span style={{ color: '#6f797a' }}>Định mức:</span>
                                  <strong style={{ color: '#191c1d' }}>{item.soLuongHeThong}</strong>
                                  <span style={{ color: '#8a9495' }}>|</span>
                                  <span style={{ color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700, backgroundColor: '#e6f6ec', padding: '4px 10px', borderRadius: '12px', fontSize: '12px' }}>
                                    <Icon name="check" style={{ fontSize: '14px' }} /> {item.soLuongThucTe}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td style={{ verticalAlign: 'middle' }}><ConditionTag value={item.tinhTrang} /></td>
                            <td style={{ verticalAlign: 'middle' }}>
                              <span style={{
                                color: item.ghiChu ? '#191c1d' : '#8a9495',
                                fontStyle: item.ghiChu ? 'normal' : 'italic',
                                fontSize: '13px',
                                fontWeight: item.ghiChu ? 600 : 400
                              }}>
                                {item.ghiChu || '—'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#191c1d', margin: 0 }}>Xác nhận & Chữ ký</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ border: '1px solid #E8EDE7', backgroundColor: '#F1F4F0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4A6549', fontWeight: 800, fontSize: '14px' }}>
                        <Icon name="check_circle" /> Xác nhận từ Quản lý
                      </div>
                      <span style={{ color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '13px', backgroundColor: '#e6f6ec', padding: '6px 12px', borderRadius: '8px', width: 'fit-content' }}>
                        <Icon name="check" style={{ fontSize: '16px' }} /> Đã kiểm kê tài sản & thông tin bàn giao
                      </span>
                    </div>

                    <div style={{ border: '1px solid #E8EDE7', backgroundColor: '#F1F4F0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4A6549', fontWeight: 800, fontSize: '14px' }}>
                        <Icon name="person" /> Xác nhận từ Khách thuê
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ color: khachCoMat ? '#15803d' : '#b93c00', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px', backgroundColor: khachCoMat ? '#e6f6ec' : '#fff0e6', padding: '6px 12px', borderRadius: '8px' }}>
                          <Icon name={khachCoMat ? "check" : "close"} style={{ fontSize: '16px' }} /> Khách hàng {khachCoMat ? "có mặt" : "vắng mặt"}
                        </span>
                        <span style={{ color: '#4A6549', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px', backgroundColor: '#F1F4F0', padding: '6px 12px', borderRadius: '8px' }}>
                          <Icon name="assignment_turned_in" style={{ fontSize: '16px' }} /> {hopDong?.daKyBienBan ? 'Đã ký giấy (biên bản trước khi có xác nhận điện tử)' : 'Khách xác nhận điện tử — xem tab "Khách xác nhận biên bản"'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="ktp-label" style={{ fontWeight: 800, color: '#191c1d', marginBottom: '8px', display: 'block' }}>Ghi chú chung của biên bản</label>
                    <div style={{
                      padding: '14px 18px',
                      borderLeft: '4px solid #4A6549',
                      backgroundColor: '#F1F4F0',
                      borderRadius: '0 12px 12px 0',
                      fontSize: '13px',
                      color: ghiChuChung ? '#191c1d' : '#6f797a',
                      fontStyle: ghiChuChung ? 'normal' : 'italic',
                      lineHeight: 1.6
                    }}>
                      {ghiChuChung || 'Không có ghi chú chung cho biên bản bàn giao này.'}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div style={{ padding: '16px 28px', backgroundColor: '#ffffff', borderTop: '1px solid #eef2f2', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="ktp-btn-submit"
                style={{ padding: '10px 28px', borderRadius: '8px', fontWeight: 700 }}
                onClick={resetForm}
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

      {/* LẬP BIÊN BẢN BÀN GIAO (INLINE FORM) */}
      {hopDong && !isReadOnlyHandover && (
        <>
          <div className="handover-current-banner">
            <div style={{ color: '#4A6549', fontWeight: 700 }}>
              Đang lập biên bản cho hợp đồng {hopDong.maHopDong}
            </div>
            <button
              type="button"
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #bec8c9', backgroundColor: '#ffffff', color: '#4A6549', fontWeight: 700, cursor: 'pointer' }}
              onClick={resetForm}
            >
              Chọn hợp đồng khác
            </button>
          </div>

          <div className="ktp-grid-3 handover-summary-grid">
            <SummaryCard icon="description" title="Thông tin hợp đồng" accentColor="#4A6549">
              <InfoRow label="Mã HĐ:" value={hopDong.maHopDong} />
              <InfoRow label="Trạng thái:" value={hopDong.trangThaiHopDong} badge={hopDong.trangThaiHopDong === 'Hiệu lực' ? 'success' : 'warning'} />
              <InfoRow label="Ngày bắt đầu:" value={formatDate(hopDong.ngayBatDau)} />
              <InfoRow label="Thời hạn:" value={`${hopDong.thoiHanThue || 0} tháng`} />
            </SummaryCard>

            <SummaryCard icon="person" title="Thông tin khách thuê" accentColor="#4A6549">
              <InfoRow label="Họ tên:" value={hopDong.hoTenKhachHang} />
              <InfoRow label="SĐT:" value={hopDong.sdt} />
              <InfoRow label="Số người ở:" value={`${Math.max(Number(hopDong.soNguoiO) || 0, 1)} người`} />
              <InfoRow label="Hóa đơn kỳ đầu:" value={hopDong.trangThaiHoaDonKyDau} badge={hopDong.trangThaiHoaDonKyDau === 'Đã TT' ? 'success' : 'warning'} />
            </SummaryCard>

            <SummaryCard icon="bed" title="Thông tin phòng/giường" accentColor="#4A6549">
              <InfoRow label="Chi nhánh:" value={hopDong.tenChiNhanh} />
              <InfoRow label="Hình thức:" value={getScopeLabel(hopDong.danhSachGiuong)} badge="success" />
              <InfoRow label="Phòng:" value={hopDong.tenPhong || hopDong.maPhong} />
              <InfoRow label="Phạm vi:" value={isWholeRoomValue(hopDong.danhSachGiuong) ? 'Toàn bộ phòng' : `Giường ${hopDong.danhSachGiuong}`} />
              <InfoRow label="Trạng thái:" value="Đã lập HĐ" badge={hopDong.coTheBanGiao ? 'success' : 'warning'} />
            </SummaryCard>
          </div>

          <div className="ktp-section handover-workspace">
            <div className="handover-form-head">
              <div className="handover-form-head-row">
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#191c1d', margin: 0 }}>
                    Lập biên bản bàn giao
                  </h3>
                  <p style={{ fontSize: '13px', color: '#6f797a', margin: '6px 0 0 0' }}>
                    {isWholeRoomValue(hopDong.danhSachGiuong)
                      ? 'Kiểm kê toàn bộ tài sản thuộc phòng khi khách thuê nguyên căn.'
                      : 'Kiểm kê tài sản cá nhân theo giường và tài sản chung của phòng.'}
                  </p>
                </div>
                <div className="handover-pills">
                  <span className="handover-pill">
                    <Icon name={isWholeRoomValue(hopDong.danhSachGiuong) ? 'home' : 'bed'} />
                    {getScopeLabel(hopDong.danhSachGiuong)}
                  </span>
                  <span className={`handover-pill ${assetNoteCount > 0 ? 'is-warning' : ''}`}>
                    <Icon name="edit_note" />
                    {assetNoteCount > 0 ? `${assetNoteCount} tài sản cần ghi chú` : 'Chưa có chênh lệch'}
                  </span>
                  <span className={`handover-pill ${dieuKien?.hopLe ? '' : 'is-warning'}`}>
                    <Icon name={dieuKien?.hopLe ? 'check_circle' : 'error_outline'} />
                    {dieuKien?.hopLe ? 'Đủ điều kiện bàn giao' : 'Cần kiểm tra điều kiện'}
                  </span>
                </div>
              </div>
            </div>

            {(() => {
              const monHu = danhSachTaiSan.filter((item) => item.tinhTrang === 'Hư hỏng');
              if (!monHu.length) return null;
              return (
                <div className="handover-damage-alert" role="alert">
                  <Icon name="build" />
                  <div>
                    <strong>Có {monHu.length} tài sản hư hỏng: {monHu.map((item) => item.tenTaiSan).join(', ')}</strong>
                    <span>Nên điều phối món tốt từ kho thay vào trước khi giao phòng. Thay xong, mở lại hợp đồng này để lập biên bản với số liệu mới.</span>
                  </div>
                  {onDieuPhoi && (
                    <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={() => onDieuPhoi({ maPhong: monHu[0].maPhong, tenPhong: monHu[0].tenPhong, maTaiSan: monHu[0].maTaiSan, tenTaiSan: monHu[0].tenTaiSan })}>
                      <Icon name="swap_horiz" /> Sang Điều phối tài sản
                    </button>
                  )}
                </div>
              );
            })()}

            <div className="handover-table-scroll">
              <table className="ktp-table" style={{ tableLayout: 'fixed', minWidth: '900px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '110px' }}>Mã tài sản</th>
                    <th style={{ width: '240px' }}>Tên tài sản</th>
                    <th style={{ width: '170px' }}>Phạm vi</th>
                    <th style={{ width: '210px' }}>Kiểm kê</th>
                    <th style={{ width: '150px' }}>Tình trạng</th>
                    <th style={{ width: '320px' }}>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {danhSachTaiSan.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: '#6f797a', padding: '28px' }}>
                        Chưa có tài sản bàn giao cho hợp đồng này.
                      </td>
                    </tr>
                  ) : danhSachTaiSan.map((item, index) => {
                    const hasDifference = Number(item.soLuongThucTe) !== Number(item.soLuongHeThong);
                    const damaged = item.tinhTrang === 'Hư hỏng';
                    const missingNote = (hasDifference || damaged) && !String(item.ghiChu || '').trim();
                    return (
                      <tr key={`${item.maPhong}-${item.maTaiSan}-${index}`} style={{ backgroundColor: damaged ? '#fff5f4' : hasDifference ? '#fffaf3' : '#ffffff' }}>
                        <td style={{ fontWeight: 700, color: '#4A6549', verticalAlign: 'middle' }}>{item.maTaiSan}</td>
                        <td>
                          <div style={{ fontWeight: '700', color: '#191c1d' }}>{item.tenTaiSan}</div>
                          {hasDifference && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', color: '#9b4922', fontSize: '12px', fontWeight: 700 }}>
                              <Icon name="warning" />
                              {missingNote ? 'Cần nhập ghi chú chênh lệch' : 'Đã ghi nhận chênh lệch'}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#191c1d' }}>{item.tenPhong || item.maPhong}</div>
                          {!isWholeRoomValue(item.maGiuong) && (
                            <div style={{ fontSize: '12px', color: '#6f797a', fontWeight: 500 }}>
                              Giường {item.maGiuong}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(44px, auto) 16px 74px', alignItems: 'center', gap: '10px' }}>
                            <div>
                              <div style={{ fontSize: '11px', color: '#6f797a', fontWeight: 600, marginBottom: '3px' }}>Hệ thống</div>
                              <div style={{ fontWeight: 800, color: '#191c1d' }}>{item.soLuongHeThong}</div>
                            </div>
                            <span style={{ color: '#8a9495', fontWeight: 700, textAlign: 'center' }}>→</span>
                            <input
                              type="number"
                              min="0"
                              value={item.soLuongThucTe}
                              onChange={(event) => updateAsset(index, 'soLuongThucTe', event.target.value)}
                              style={{
                                width: '74px',
                                textAlign: 'center',
                                padding: '8px 6px',
                                border: hasDifference ? '1px solid #9b4922' : '1px solid #bec8c9',
                                borderRadius: '6px',
                                outline: 'none',
                                fontWeight: 700,
                                color: hasDifference ? '#9b4922' : '#191c1d',
                                backgroundColor: '#ffffff'
                              }}
                            />
                          </div>
                        </td>
                        <td>
                          <select
                            className={`ui-condition-select ${conditionClass(item.tinhTrang)}`}
                            aria-label={`Tình trạng ${item.tenTaiSan}`}
                            value={item.tinhTrang || 'Tốt'}
                            onChange={(event) => updateAsset(index, 'tinhTrang', event.target.value)}
                          >
                            {TINH_TRANG_TAI_SAN.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            value={item.ghiChu}
                            onChange={(event) => updateAsset(index, 'ghiChu', event.target.value)}
                            placeholder={damaged ? 'Bắt buộc ghi chú hư hỏng' : hasDifference ? 'Bắt buộc nhập lý do chênh lệch' : 'Không bắt buộc'}
                            style={{
                              width: '100%',
                              maxWidth: '320px',
                              padding: '8px',
                              border: missingNote ? '1px solid #ba1a1a' : '1px solid #bec8c9',
                              borderRadius: '6px',
                              outline: 'none',
                              boxSizing: 'border-box',
                              backgroundColor: missingNote ? '#fff8f7' : '#ffffff'
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '22px 24px', backgroundColor: '#ffffff', borderTop: '1px solid #e1e3e4' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#191c1d', margin: '0 0 16px 0' }}>Xác nhận bàn giao</h3>
              <div className="ktp-grid-2" style={{ gap: '16px', marginBottom: '18px' }}>
                <div style={{ border: '1px solid #E8EDE7', backgroundColor: '#F1F4F0', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#4A6549', fontWeight: 700 }}>
                    <Icon name="check_circle" /> Quản lý xác nhận
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={quanLyXacNhan}
                      onChange={(event) => setQuanLyXacNhan(event.target.checked)}
                      style={{ width: '20px', height: '20px', accentColor: '#4A6549' }}
                    />
                    <span style={{ fontSize: '14px', color: '#191c1d' }}>Đã kiểm kê tài sản và thông tin bàn giao</span>
                  </label>
                </div>

                <div style={{ border: '1px solid #e1e3e4', backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#3f494a', fontWeight: 700 }}>
                    <Icon name="person" /> Khách hàng xác nhận
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={khachCoMat}
                        onChange={(event) => setKhachCoMat(event.target.checked)}
                        style={{ width: '20px', height: '20px', accentColor: '#4A6549' }}
                      />
                      <span style={{ fontSize: '14px', color: '#191c1d' }}>Khách hàng có mặt tại thời điểm bàn giao</span>
                    </label>
                    <p style={{ margin: 0, fontSize: '13px', color: '#3f494a', lineHeight: 1.5 }}>
                      Không cần ký giấy. Sau khi lưu, khách nhận biên bản trong tài khoản (kèm email) để tự xác nhận
                      hoặc yêu cầu chỉnh sửa — có thể làm ngay tại phòng trên điện thoại hoặc sau đó.
                    </p>
                  </div>
                </div>
              </div>

              {thieuBanKy && !hopDong?.daCoBienBanBanGiaoVao && (
                <div className="ktp-inline-notice ktp-inline-notice-warning" style={{ marginBottom: '16px' }} role="status">
                  <div>
                    <strong>Hợp đồng chưa có ảnh hợp đồng đã ký</strong>
                    <p>Bạn vẫn lưu được biên bản, nhưng biên bản chưa gửi được cho khách xác nhận cho tới khi Sale tải ảnh hợp đồng đã ký lên (Lập hợp đồng, mục "Bản hợp đồng đã ký"). Sau đó bấm "Gửi lại cho khách" hoặc gửi ở tab "Khách xác nhận biên bản".</p>
                  </div>
                </div>
              )}

              <label className="ktp-label">Ghi chú chung</label>
              <textarea
                className="ktp-input"
                value={ghiChuChung}
                placeholder="Nhập ghi chú chung cho biên bản..."
                style={{ minHeight: '92px', resize: 'vertical' }}
                onChange={(event) => setGhiChuChung(event.target.value)}
              />
            </div>

            <div style={{ padding: '16px 24px', backgroundColor: '#f8f9fa', borderTop: '1px solid #e1e3e4', display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid #bec8c9', backgroundColor: 'transparent', color: '#3f494a', fontWeight: '600', cursor: 'pointer' }}
                onClick={resetForm}
              >
                Hủy
              </button>
              <button
                type="button"
                className="ktp-btn-submit"
                style={{ padding: '10px 24px' }}
                disabled={!canSubmit}
                onClick={handleSubmit}
              >
                {saving ? 'Đang lưu...' : 'Lưu biên bản'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
