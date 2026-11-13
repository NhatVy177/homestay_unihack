import React, { useState, useEffect, useMemo } from 'react';
import OverviewCards from '../../components/common/OverviewCards.jsx';
import { Icon } from '../../components/common/Icon.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';
import { dangKyThueApi } from '../dangKyThue/dangKyThue.api.js';
import LapLichChoHoSo from './LapLichChoHoSo.jsx';
import StatusFilterTabs from '../../components/common/StatusFilterTabs.jsx';

function parseMoney(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  const raw = String(value).trim();
  if (!raw) return null;

  const numericText = raw.replace(/[^\d,.-]/g, '');
  const commaAsDecimal = numericText.includes(',') && numericText.lastIndexOf(',') > numericText.lastIndexOf('.');
  const cleaned = commaAsDecimal
    ? numericText.replace(/\./g, '').replace(',', '.')
    : numericText.replace(/,/g, '');
  const compact = (cleaned.match(/\./g) || []).length > 1
    ? cleaned.replace(/\./g, '')
    : cleaned;
  const number = Number(compact);

  return Number.isFinite(number) ? number : null;
}

function formatMoney(value) {
  const number = parseMoney(value);
  if (!number) return '';
  const vnd = Math.round(number);
  const remainder = ((vnd % 1000) + 1000) % 1000;
  const normalized = remainder <= 10
    ? vnd - remainder
    : 1000 - remainder <= 10
      ? vnd + (1000 - remainder)
      : vnd;
  return normalized.toLocaleString('vi-VN') + 'đ';
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-GB') : '';
}

function formatGenderRequirement(reg = {}) {
  const soNam = Number(reg.soNam || 0);
  const soNu = Number(reg.soNu || 0);
  if (soNam > 0 && soNu > 0) return `Khác (Nam: ${soNam}, Nữ: ${soNu})`;
  if (soNu > 0 && soNam === 0) return 'Nữ';
  if (soNam > 0 && soNu === 0) return 'Nam';
  return reg.gioiTinh || 'Không yêu cầu';
}

const branchAreaMap = {
  CN0001: ['Quận 1', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 10'],
  CN0002: ['Bình Thạnh', 'Phú Nhuận', 'Gò Vấp', 'Tân Bình'],
  CN0003: ['Thủ Đức', 'Quận 2', 'Quận 9']
};

const branchPrimaryAreaMap = {
  CN0001: 'Quận 1',
  CN0002: 'Bình Thạnh',
  CN0003: 'Thủ Đức'
};

function isSaleUser(user = {}) {
  return (user?.vaiTro === 'NhanVien' && user?.chucVu === 'Sale') || user?.vaiTro === 'NhanVienSale';
}

function areaBelongsToBranch(area, branchId) {
  const normalizedArea = String(area || '').toLocaleLowerCase('vi-VN');
  const aliases = branchAreaMap[branchId] || [];
  if (!normalizedArea || !aliases.length) return true;
  return aliases.some((alias) => normalizedArea.includes(alias.toLocaleLowerCase('vi-VN')));
}

function needsAreaConsultation(area, branchId) {
  const normalizedArea = String(area || '').toLocaleLowerCase('vi-VN');
  const primaryArea = branchPrimaryAreaMap[branchId];
  if (!normalizedArea || !primaryArea || !areaBelongsToBranch(area, branchId)) return false;
  return !normalizedArea.includes(primaryArea.toLocaleLowerCase('vi-VN'));
}

function buildDoiChieuRows(reg, roomResults, isRegionValid, branchId) {
  const hasRooms = Array.isArray(roomResults) && roomResults.length > 0;
  const roomCriteriaPassed = hasRooms;
  const shouldConsultArea = needsAreaConsultation(reg?.khuVucMongMuon, branchId);

  return [
    {
      label: 'Khu vực mong muốn',
      value: reg?.khuVucMongMuon || 'Không yêu cầu',
      passed: isRegionValid,
      note: isRegionValid
        ? (shouldConsultArea ? 'Khu vực gần chi nhánh - cần tư vấn lại' : 'Có chi nhánh phù hợp')
        : 'Không có chi nhánh phù hợp'
    },
    {
      label: 'Giới tính thuê',
      value: formatGenderRequirement(reg),
      passed: roomCriteriaPassed,
      note: roomCriteriaPassed ? 'Có phòng/giường phù hợp' : 'Chưa có phòng/giường phù hợp'
    },
    {
      label: 'Số người ở / sức chứa',
      value: reg?.soNguoiO ? `${reg.soNguoiO} người` : 'Không yêu cầu',
      passed: roomCriteriaPassed,
      note: roomCriteriaPassed ? 'Đủ sức chứa/chỗ trống' : 'Chưa tìm thấy sức chứa phù hợp'
    },
    {
      label: 'Loại phòng mong muốn',
      value: reg?.loaiPhongYeuCau || 'Không yêu cầu',
      passed: roomCriteriaPassed,
      note: roomCriteriaPassed ? 'Có loại phòng phù hợp' : 'Chưa có loại phòng phù hợp'
    },
    {
      label: 'Mức giá tối đa',
      value: formatMoney(reg?.mucGia || reg?.mucGiaToiDa) || 'Không yêu cầu',
      passed: roomCriteriaPassed,
      note: roomCriteriaPassed ? 'Có phòng trong mức giá' : 'Chưa có phòng trong mức giá'
    },
    {
      label: 'Thời gian dự kiến vào ở',
      value: formatDate(reg?.ngayDuKienVaoO) || 'Chưa có',
      passed: Boolean(reg?.ngayDuKienVaoO),
      note: reg?.ngayDuKienVaoO ? 'Đã ghi nhận' : 'Thiếu thời gian dự kiến'
    },
    {
      label: 'Thời hạn thuê',
      value: reg?.thoiHanThue ? `${reg.thoiHanThue} tháng` : 'Chưa có',
      passed: Boolean(reg?.thoiHanThue),
      note: reg?.thoiHanThue ? 'Đã ghi nhận' : 'Thiếu thời hạn thuê'
    },
    {
      label: 'Yêu cầu khác',
      value: reg?.ghiChu || 'Không có',
      passed: true,
      note: 'Đã ghi nhận'
    }
  ];
}

function isPendingRegistration(reg) {
  return reg?.trangThai === 'Chờ tiếp nhận';
}

function getRegistrationDisplayStatus(reg = {}) {
  if (reg?.biHuyDoTatCaLich) return 'Hủy';
  return reg?.trangThaiHienThi || reg?.trangThai || '';
}

export default function HoSoDangKyTab({ onNavigate, onSchedulingChange }) {
  const { user } = useAuth();
  const [filterStatus, setFilterStatus] = useState('Chờ tiếp nhận');
  const [list, setList] = useState([]);
  const [selectedReg, setSelectedReg] = useState(null);
  const [schedulingProfile, setSchedulingProfile] = useState(null);

  const [acceptedReg, setAcceptedReg] = useState(null);

  // Drawer States
  const [checkingRooms, setCheckingRooms] = useState(false);
  const [roomResults, setRoomResults] = useState(null);
  const [isRegionValid, setIsRegionValid] = useState(true);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [showTuVanModal, setShowTuVanModal] = useState(false);
  const [tuVanNote, setTuVanNote] = useState('');
  // Modal States
  const [mismatchReason, setMismatchReason] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showAreaConfirmModal, setShowAreaConfirmModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('Không còn phòng/giường phù hợp');
  const [rejectNote, setRejectNote] = useState('');

  useEffect(() => {
    onSchedulingChange?.(Boolean(schedulingProfile));
    return () => onSchedulingChange?.(false);
  }, [schedulingProfile, onSchedulingChange]);

  // Lọc theo chi nhánh
  const branchFilteredList = useMemo(() => {
    if (!isSaleUser(user) || !user?.maChiNhanh) return list;

    return list.filter((item) => areaBelongsToBranch(item.khuVucMongMuon, user.maChiNhanh));
  }, [list, user]);

  const stats = {
    choTiepNhan: branchFilteredList.filter(x => x.trangThai === 'Chờ tiếp nhận').length,
    daTiepNhan: branchFilteredList.filter(x => x.trangThai === 'Đã tiếp nhận' || x.trangThai === 'Chấp nhận').length,
    tuChoi: branchFilteredList.filter(x => getRegistrationDisplayStatus(x) === 'Từ chối').length,
    huy: branchFilteredList.filter(x => getRegistrationDisplayStatus(x) === 'Hủy').length
  };

  const filteredList = filterStatus === 'Tất cả'
    ? branchFilteredList
    : branchFilteredList.filter(item => {
        if (filterStatus === 'Đã tiếp nhận') return item.trangThai === 'Đã tiếp nhận' || item.trangThai === 'Chấp nhận';
        return getRegistrationDisplayStatus(item) === filterStatus;
      });

  const fetchData = async () => {
    try {
      const res = await dangKyThueApi.getAll();
      setList(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);



  const acceptRegistration = async () => {
    if (!selectedReg) return;
    try {
      const res = await dangKyThueApi.capNhatKetQuaXuLy(selectedReg.maDangKy, { trangThai: 'Đã tiếp nhận', ghiChuXuLy: '' });
      setAcceptedReg(res.data || selectedReg);
      // NOTE: Here you would normally store selectedRooms into ChiTietXemPhong. For now we pass them to the next step.
      setShowAreaConfirmModal(false);
      setSelectedReg(null);
      setRoomResults(null);
      setSelectedRooms([]);
      fetchData();
    } catch (err) {
      alert('Lỗi khi tiếp nhận hồ sơ: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleAccept = async () => {
    if (!selectedReg) return;
    if (needsAreaConsultation(selectedReg.khuVucMongMuon, user?.maChiNhanh)) {
      setShowAreaConfirmModal(true);
      return;
    }
    await acceptRegistration();
  };

  const handleTuVan = async () => {
    if (!selectedReg) return;
    try {
      await dangKyThueApi.capNhatKetQuaXuLy(selectedReg.maDangKy, { trangThai: 'Đã tiếp nhận', ghiChuXuLy: tuVanNote });
      alert('Đã chuyển hồ sơ sang trạng thái Đã tiếp nhận để tư vấn lại.');
      setShowTuVanModal(false);
      setSelectedReg(null);
      setRoomResults(null);
      setSelectedRooms([]);
      fetchData();
    } catch (err) {
      alert('Lỗi khi tiếp nhận hồ sơ: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleReject = async () => {
    if (!selectedReg) return;
    try {
      let finalNote = rejectReason;
      if (rejectReason === 'Khác') {
          finalNote = rejectNote;
      } else if (rejectNote) {
          finalNote += ' - ' + rejectNote;
      }
      await dangKyThueApi.capNhatKetQuaXuLy(selectedReg.maDangKy, { trangThai: 'Từ chối', ghiChuXuLy: finalNote });
      alert('Đã từ chối phiếu đăng ký.');
      setShowRejectModal(false);
      setSelectedReg(null);
      setRoomResults(null);
      setSelectedRooms([]);
      setMismatchReason(null);
      fetchData();
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.message || err.message));
    }
  };


  const handleCheckRoom = async () => {
    setCheckingRooms(true);
    setRoomResults(null);
    setIsRegionValid(true);
    setSelectedRooms([]);
    try {
      const res = await dangKyThueApi.getPhongGiuongKhaDung({
        hoSoId: selectedReg.maDangKy
      });
      let currentList = (res.data?.rooms || []).filter((item) => item.maPhong);
      const regionValid = res.data?.isRegionValid ?? true;
      setIsRegionValid(regionValid);

      // Group beds by room
      const roomMap = {};
      currentList.forEach(r => {
        if (!roomMap[r.maPhong]) {
          roomMap[r.maPhong] = {
            maPhong: r.maPhong,
            tenPhong: r.tenPhong,
            loaiThue: r.loaiThue,
            loaiPhong: r.loaiPhong,
            giaThue: r.giaThue,
            gioiTinhChoPhep: r.gioiTinhChoPhep,
            tenChiNhanh: r.tenChiNhanh,
            soGiuongTrong: r.soGiuongTrong ?? 0,
            danhSachGiuong: []
          };
        }
        if (r.maGiuong) {
          roomMap[r.maPhong].soGiuongTrong += 1;
          roomMap[r.maPhong].danhSachGiuong.push(r.maGiuong);
        } else {
          roomMap[r.maPhong].soGiuongTrong = r.soGiuongTrong ?? r.sucChua ?? 0;
        }
      });

      const groupedRooms = Object.values(roomMap);

      setCheckingRooms(false);
      setRoomResults(groupedRooms);
    } catch (err) {
      setCheckingRooms(false);
      setRoomResults([]);
    }
  };

  if (schedulingProfile) {
    return (
      <LapLichChoHoSo
        profile={schedulingProfile}
        onBack={() => {
          setSchedulingProfile(null);
          fetchData();
        }}
        onCreated={() => {
          onSchedulingChange?.(false);
          fetchData();
        }}
      />
    );
  }

  const doiChieuRows = roomResults
    ? buildDoiChieuRows(selectedReg, roomResults, isRegionValid, user?.maChiNhanh)
    : [];
  const selectedNeedsAreaConsultation = needsAreaConsultation(selectedReg?.khuVucMongMuon, user?.maChiNhanh);
  const selectedIsPending = isPendingRegistration(selectedReg);
  const selectedDisplayStatus = getRegistrationDisplayStatus(selectedReg);

  return (
    <div className="ktp-container">
      {/* HEADER TABS & STATS */}
      <OverviewCards items={[
        { key: 'Tất cả', label: 'Tất cả', count: branchFilteredList.length },
        { key: 'Chờ tiếp nhận', label: 'Chờ tiếp nhận', count: stats.choTiepNhan },
        { key: 'Đã tiếp nhận', label: 'Đã tiếp nhận', count: stats.daTiepNhan },
        { key: 'Từ chối', label: 'Từ chối', count: stats.tuChoi },
        { key: 'Hủy', label: 'Hủy', count: stats.huy }
      ]} />
      <section className="ui-list-toolbar">
        <StatusFilterTabs
          items={[
            { key: 'Tất cả', label: 'Tất cả', count: branchFilteredList.length },
            { key: 'Chờ tiếp nhận', label: 'Chờ tiếp nhận', count: stats.choTiepNhan },
            { key: 'Đã tiếp nhận', label: 'Đã tiếp nhận', count: stats.daTiepNhan },
            { key: 'Từ chối', label: 'Từ chối', count: stats.tuChoi },
            { key: 'Hủy', label: 'Hủy', count: stats.huy }
          ]}
          activeKey={filterStatus}
          onChange={setFilterStatus}
        />

      </section>

      {/* TABLE */}
      <section className="ktp-table-section">
        {filteredList.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ color: '#bec8c9', marginBottom: '16px' }}><Icon name="description" /></div>
            <h3 style={{ color: '#3f494a', marginBottom: '8px' }}>Không có phiếu đăng ký</h3>
            <p style={{ color: '#6f797a' }}>Hiện tại chưa có phiếu đăng ký nào ở trạng thái {filterStatus}.</p>
          </div>
        ) : (
          <table className="ktp-table">
            <thead>
              <tr>
                <th>Mã phiếu</th>
                <th>Khách hàng</th>
                <th>Yêu cầu thuê</th>
                <th>Khu vực / Loại phòng</th>
                <th>Ngày gửi</th>
                <th className="text-center">Trạng thái</th>
                <th className="text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map(item => {
                const itemIsPending = isPendingRegistration(item);
                const itemDisplayStatus = getRegistrationDisplayStatus(item);
                const itemIsRejectedOrCancelled = ['Từ chối', 'Hủy'].includes(itemDisplayStatus);
                return (
                <tr key={item.maDangKy}>
                  <td style={{ fontWeight: '600' }}>{item.maDangKy}</td>
                  <td>
                    <div style={{ fontWeight: '600', color: '#191c1d' }}>{item.hoTenKhach}</div>
                    <div style={{ fontSize: '12px', color: '#6f797a' }}>{item.sdtKhach}</div>
                  </td>
                  <td>
                    <div style={{ color: '#191c1d' }}>
                      {(item.soNam > 0 && item.soNu > 0) ? 'Khác' : (item.soNu > 0 && item.soNam === 0 ? 'Nữ' : (item.soNam > 0 && item.soNu === 0 ? 'Nam' : 'Khác'))}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6f797a' }}>{item.soNguoiO} người</div>
                  </td>
                  <td>
                    <div style={{ color: '#191c1d' }}>{item.khuVucMongMuon}</div>
                    {needsAreaConsultation(item.khuVucMongMuon, user?.maChiNhanh) && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', marginTop: '4px', padding: '3px 7px', borderRadius: '999px', background: '#fff3cd', color: '#8a5a00', fontSize: '11px', fontWeight: 700 }}>
                        Cần tư vấn lại khu vực
                      </div>
                    )}
                    <div style={{ fontSize: '12px', color: '#6f797a' }}>{item.loaiPhongYeuCau}</div>
                  </td>
                  <td>{item.ngayDangKy ? new Date(item.ngayDangKy).toLocaleDateString('en-GB') : ''}</td>
                  <td className="text-center">
                    <span
                      className={`ktp-badge ${itemDisplayStatus === 'Chờ tiếp nhận' ? 'ktp-badge-warning' : ((itemDisplayStatus === 'Đã tiếp nhận' || itemDisplayStatus === 'Chấp nhận') ? 'ktp-badge-success' : (itemIsRejectedOrCancelled ? 'ktp-badge-danger' : 'ktp-badge-info'))}`}
                      style={{
                        backgroundColor: (itemDisplayStatus === 'Đã tiếp nhận' || itemDisplayStatus === 'Chấp nhận') ? '#e8f5e9' : (itemIsRejectedOrCancelled ? '#ffebee' : undefined),
                        color: (itemDisplayStatus === 'Đã tiếp nhận' || itemDisplayStatus === 'Chấp nhận') ? '#2e7d32' : (itemIsRejectedOrCancelled ? '#c62828' : undefined)
                      }}
                    >
                      {itemDisplayStatus}
                    </span>
                  </td>
                  <td className="text-center">
                    <button
                      className="ktp-btn-action-fill"
                      onClick={() => {
                        setSelectedReg(item);
                        setRoomResults(null);
                        setCheckingRooms(false);
                        setSelectedRooms([]);
                        setShowAreaConfirmModal(false);
                      }}
                    >
                      {itemIsPending ? 'Xem & xử lý' : 'Xem chi tiết'}
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* MODAL CHI TIẾT */}
      {selectedReg && (
        <div className="ktp-modal-overlay" onClick={() => { setSelectedReg(null); setRoomResults(null); setShowAreaConfirmModal(false); }}>
          <div className="ktp-modal" onClick={(e) => e.stopPropagation()} style={{ width: '800px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="ktp-modal-header" style={{ alignItems: 'flex-start', borderBottom: 'none', backgroundColor: '#2f6765', color: '#ffffff' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', color: '#ffffff' }}>Phiếu đăng ký {selectedReg.maDangKy}</h3>
                <p className="ktp-modal-header-sub" style={{ color: 'rgba(255,255,255,0.82)' }}>Ngày gửi: <span style={{ color: '#ffffff' }}>{selectedReg.ngayDangKy ? new Date(selectedReg.ngayDangKy).toLocaleDateString('en-GB') : ''}</span></p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  className={`ktp-badge ${selectedDisplayStatus === 'Chờ tiếp nhận' ? 'ktp-badge-warning' : ((selectedDisplayStatus === 'Đã tiếp nhận' || selectedDisplayStatus === 'Chấp nhận') ? 'ktp-badge-success' : (['Từ chối', 'Hủy'].includes(selectedDisplayStatus) ? 'ktp-badge-danger' : 'ktp-badge-info'))}`}
                  style={{
                    backgroundColor: (selectedDisplayStatus === 'Đã tiếp nhận' || selectedDisplayStatus === 'Chấp nhận') ? '#e8f5e9' : (['Từ chối', 'Hủy'].includes(selectedDisplayStatus) ? '#ffebee' : undefined),
                    color: (selectedDisplayStatus === 'Đã tiếp nhận' || selectedDisplayStatus === 'Chấp nhận') ? '#2e7d32' : (['Từ chối', 'Hủy'].includes(selectedDisplayStatus) ? '#c62828' : undefined)
                  }}
                >
                  {selectedDisplayStatus}
                </div>
                <button className="ktp-modal-close" style={{ color: '#ffffff' }} onClick={() => { setSelectedReg(null); setRoomResults(null); setShowAreaConfirmModal(false); }}><Icon name="close" /></button>
              </div>
            </div>

            <div className="ktp-modal-body" style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#f4f6f6' }}>
              {selectedIsPending && selectedNeedsAreaConsultation && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '16px', padding: '12px 14px', border: '1px solid #ffcdd2', borderLeft: '4px solid #d32f2f', borderRadius: '8px', backgroundColor: '#ffebee', color: '#b71c1c' }}>
                  <Icon name="warning" />
                  <div>
                    <strong style={{ display: 'block', marginBottom: '4px', color: '#b71c1c' }}>Cần liên hệ lại khách hàng để tư vấn lại khu vực</strong>
                    <span style={{ fontSize: '13px', lineHeight: 1.45 }}>Khu vực khách chọn đang được chuyển về chi nhánh gần nhất. Vui lòng xác nhận lại với khách trước khi tiếp nhận và lập lịch xem phòng.</span>
                  </div>
                </div>
              )}

              {/* Khối 1 */}
              <div className="ktp-section ktp-info-box-outline" style={{ backgroundColor: '#fff', marginBottom: '16px' }}>
                <h4 className="ktp-section-title"><Icon name="person" /> Khối 1: Thông tin khách hàng</h4>
                <div className="ktp-grid-2" style={{ gap: '16px' }}>
                  <div className="ktp-info-row"><span className="ktp-info-label">Họ tên:</span> <span className="ktp-info-value">{selectedReg.hoTenKhach}</span></div>
                  <div className="ktp-info-row"><span className="ktp-info-label">Ngày sinh:</span> <span className="ktp-info-value">{selectedReg.ngaySinhKhach ? new Date(selectedReg.ngaySinhKhach).toLocaleDateString('en-GB') : ''}</span></div>
                  <div className="ktp-info-row"><span className="ktp-info-label">Giới tính:</span> <span className="ktp-info-value">{selectedReg.gioiTinh}</span></div>
                  <div className="ktp-info-row"><span className="ktp-info-label">Quốc tịch:</span> <span className="ktp-info-value">{selectedReg.quocTichKhach || selectedReg.quocTich}</span></div>
                  <div className="ktp-info-row"><span className="ktp-info-label">CCCD:</span> <span className="ktp-info-value">{selectedReg.cccdKhach || selectedReg.cccd}</span></div>
                  <div className="ktp-info-row"><span className="ktp-info-label">SĐT:</span> <span className="ktp-info-value">{selectedReg.sdtKhach}</span></div>
                  <div className="ktp-info-row"><span className="ktp-info-label">Email:</span> <span className="ktp-info-value">{selectedReg.emailKhach}</span></div>
                </div>
              </div>

              {/* Khối 2 */}
              <div className="ktp-section ktp-info-box-outline" style={{ backgroundColor: '#fff', marginBottom: '16px' }}>
                <h4 className="ktp-section-title"><Icon name="description" /> Khối 2: Yêu cầu thuê</h4>
                <div className="ktp-grid-2" style={{ gap: '16px' }}>
                  <div className="ktp-info-row"><span className="ktp-info-label">Số người ở:</span> <span className="ktp-info-value">{selectedReg.soNguoiO} người</span></div>
                  <div className="ktp-info-row"><span className="ktp-info-label">Giới tính thuê:</span> <span className="ktp-info-value">{formatGenderRequirement(selectedReg)}</span></div>

                  <div className="ktp-info-row">
                    <span className="ktp-info-label">Khu vực:</span>
                    <span className="ktp-info-value ktp-text-primary" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                      {selectedReg.khuVucMongMuon}
                      {selectedNeedsAreaConsultation && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 7px', borderRadius: '999px', background: '#fff3cd', color: '#8a5a00', fontSize: '11px', fontWeight: 700 }}>
                          Cần tư vấn lại khu vực
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="ktp-info-row"><span className="ktp-info-label">Loại phòng:</span> <span className="ktp-info-value">{selectedReg.loaiPhongYeuCau}</span></div>
                  <div className="ktp-info-row"><span className="ktp-info-label">Mức giá:</span> <span className="ktp-info-value ktp-text-primary">{formatMoney(selectedReg.mucGia || selectedReg.mucGiaToiDa)}</span></div>
                  <div className="ktp-info-row"><span className="ktp-info-label">TG vào ở:</span> <span className="ktp-info-value">{formatDate(selectedReg.ngayDuKienVaoO)}</span></div>
                  <div className="ktp-info-row"><span className="ktp-info-label">Thời hạn:</span> <span className="ktp-info-value">{selectedReg.thoiHanThue} tháng</span></div>
                  <div className="ktp-info-row" style={{ gridColumn: '1 / -1' }}><span className="ktp-info-label">Yêu cầu khác:</span> <span className="ktp-info-value" style={{ fontStyle: 'italic' }}>{selectedReg.ghiChu || 'Không có'}</span></div>
                </div>
              </div>

              {selectedIsPending && (
                <div className="ktp-section ktp-info-box-outline" style={{ backgroundColor: '#fff' }}>
                  <h4 className="ktp-section-title"><Icon name="search" /> Khối 3: Đối chiếu & Kiểm tra phòng/giường</h4>

                  <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#eef2f2', borderRadius: '4px' }}>
                    <p style={{ margin: '0 0 10px 0', fontWeight: '600', color: '#3f494a', fontSize: '13px' }}>Thông tin cần đối chiếu từ phiếu đăng ký:</p>
                    <div className="ktp-grid-2" style={{ fontSize: '13px', color: '#6f797a', gap: '8px 20px' }}>
                      <div>
                        Khu vực: <strong style={{ color: '#191c1d' }}>{selectedReg.khuVucMongMuon || 'Không yêu cầu'}</strong>
                        {selectedNeedsAreaConsultation && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '8px', padding: '3px 7px', borderRadius: '999px', background: '#fff3cd', color: '#8a5a00', fontSize: '11px', fontWeight: 700 }}>
                            Cần tư vấn lại khu vực
                          </span>
                        )}
                      </div>
                      <div>Giới tính thuê: <strong style={{ color: '#191c1d' }}>{formatGenderRequirement(selectedReg)}</strong></div>
                      <div>Số người ở: <strong style={{ color: '#191c1d' }}>{selectedReg.soNguoiO ? `${selectedReg.soNguoiO} người` : 'Không yêu cầu'}</strong></div>
                      <div>Loại phòng: <strong style={{ color: '#191c1d' }}>{selectedReg.loaiPhongYeuCau || 'Không yêu cầu'}</strong></div>
                      <div>Mức giá tối đa: <strong style={{ color: '#191c1d' }}>{formatMoney(selectedReg.mucGia || selectedReg.mucGiaToiDa) || 'Không yêu cầu'}</strong></div>
                      <div>Ngày vào ở: <strong style={{ color: '#191c1d' }}>{formatDate(selectedReg.ngayDuKienVaoO) || 'Chưa có'}</strong></div>
                      <div>Thời hạn: <strong style={{ color: '#191c1d' }}>{selectedReg.thoiHanThue ? `${selectedReg.thoiHanThue} tháng` : 'Chưa có'}</strong></div>
                      <div>Yêu cầu khác: <strong style={{ color: '#191c1d' }}>{selectedReg.ghiChu || 'Không có'}</strong></div>
                    </div>
                  </div>

                  {!checkingRooms && !roomResults && (
                    <div style={{ textAlign: 'center', padding: '10px' }}>
                      <button className="ktp-btn-action-fill" onClick={handleCheckRoom}>Hệ thống tự động tìm phòng/giường phù hợp</button>
                    </div>
                  )}

                  {checkingRooms && (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#6f797a' }}>
                      <div className="ktp-spinner" style={{ marginBottom: '12px' }}></div>
                      <p>Hệ thống đang đối chiếu các điều kiện cho thuê...</p>
                    </div>
                  )}

                  {roomResults && (
                    <div style={{ marginTop: '16px', border: '1px solid #bec8c9', borderRadius: '4px', padding: '16px', backgroundColor: '#fcfdfd' }}>
                      <div style={{ marginBottom: '12px', fontWeight: 'bold' }}>Kết quả đối chiếu điều kiện:</div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px 16px' }}>
                        {doiChieuRows.map((row) => (
                          <li key={row.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', minWidth: 0 }}>
                            <span style={{ color: row.passed ? '#2e7d32' : '#d32f2f', display: 'inline-flex', lineHeight: 1, paddingTop: '1px' }}>
                              <Icon name={row.passed ? 'check_circle' : 'cancel'} style={{ fontSize: '18px' }} />
                            </span>
                            <span style={{ display: 'block', minWidth: 0 }}>
                              <span style={{ color: '#3f494a' }}>{row.label}: </span>
                              <strong style={{ color: '#191c1d' }}>{row.value}</strong>
                              <span style={{ display: 'block', color: row.passed ? '#2e7d32' : '#d32f2f', fontSize: '12px', marginTop: '2px' }}>{row.note}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                      {!isRegionValid && (
                        <div style={{ marginTop: '12px', color: '#d32f2f', fontSize: '13px', fontStyle: 'italic' }}>
                          Nhân viên sale vui lòng liên hệ lại với khách để lựa chọn chi nhánh phù hợp.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedIsPending && (
              <div className="ktp-modal-footer" style={{ borderTop: '1px solid #bec8c9', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                {roomResults && (
                  <button className="ktp-btn-cancel" style={{ color: '#c62828', borderColor: '#ffcdd2', backgroundColor: '#ffebee' }} onClick={() => {
                    setRejectNote('');
                    setShowRejectModal(true);
                  }}>Từ chối phiếu</button>
                )}

                {roomResults && roomResults.length > 0 && (
                  <button
                    className="ktp-btn-submit"
                    onClick={handleAccept}
                  >
                    Tiếp nhận & lập lịch xem phòng
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AREA CONSULT CONFIRM MODAL */}
      {showAreaConfirmModal && selectedReg && selectedIsPending && (
        <div className="ktp-modal-overlay" style={{ zIndex: 1200 }} onClick={() => setShowAreaConfirmModal(false)}>
          <div className="ktp-modal" onClick={(e) => e.stopPropagation()} style={{ width: '460px', maxWidth: '90vw' }}>
            <div className="ktp-modal-header" style={{ alignItems: 'center', borderBottom: 'none', backgroundColor: '#2f6765', color: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ffffff' }}>
                <Icon name="warning" />
                <h3 style={{ fontSize: '16px', margin: 0, color: '#ffffff' }}>Xác nhận đã tư vấn lại khu vực</h3>
              </div>
              <button className="ktp-modal-close" style={{ color: '#ffffff' }} onClick={() => setShowAreaConfirmModal(false)}><Icon name="close" /></button>
            </div>
            <div className="ktp-modal-body" style={{ padding: '22px 24px', flex: 'none', display: 'block' }}>
              <p style={{ margin: '0 0 12px', color: '#3f494a', fontSize: '14px', lineHeight: 1.55 }}>
                Hồ sơ <strong>{selectedReg.maDangKy}</strong> có khu vực mong muốn <strong>{selectedReg.khuVucMongMuon}</strong>, cần xác nhận lại với khách trước khi tiếp nhận và lập lịch xem phòng.
              </p>
              <div style={{ border: '1px solid #ffcdd2', borderRadius: '8px', backgroundColor: '#fff5f5', color: '#b71c1c', padding: '12px', fontSize: '13px', lineHeight: 1.45 }}>
                Chỉ bấm tiếp tục khi bạn đã liên hệ khách hàng và khách đồng ý tư vấn/xem phòng theo chi nhánh gần nhất.
              </div>
            </div>
            <div className="ktp-modal-footer" style={{ borderTop: '1px solid #ffcdd2', padding: '16px 24px', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="ktp-btn-cancel" style={{ backgroundColor: '#fff', borderColor: '#ffcdd2', color: '#b71c1c' }} onClick={() => setShowAreaConfirmModal(false)}>
                Chưa, quay lại
              </button>
              <button className="ktp-btn-submit" onClick={acceptRegistration}>
                Đã xác nhận với khách
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TU VAN MODAL */}
      {showTuVanModal && (
        <div className="ktp-modal-overlay" onClick={() => setShowTuVanModal(false)}>
          <div className="ktp-modal" onClick={(e) => e.stopPropagation()} style={{ width: '500px', maxWidth: '90vw' }}>
            <div className="ktp-modal-header" style={{ alignItems: 'center', borderBottom: 'none', backgroundColor: '#2f6765', color: '#ffffff' }}>
              <h3 style={{ fontSize: '16px', margin: 0, color: '#ffffff' }}>Tiếp nhận để tư vấn lại</h3>
              <button className="ktp-modal-close" style={{ color: '#ffffff' }} onClick={() => setShowTuVanModal(false)}><Icon name="close" /></button>
            </div>
            <div className="ktp-modal-body" style={{ padding: '24px', flex: 'none', display: 'block' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#3f494a' }}>Vui lòng nhập ghi chú sale để liên hệ tư vấn lại với khách hàng (Ví dụ: Chưa có phòng phù hợp, cần liên hệ khách tư vấn đổi loại phòng/khu vực/mức giá.)</p>
              <textarea
                placeholder="Nhập ghi chú sale..."
                value={tuVanNote}
                onChange={e => setTuVanNote(e.target.value)}
                style={{ width: '100%', height: '80px', padding: '8px 12px', border: '1px solid #bec8c9', borderRadius: '4px', fontSize: '14px', outline: 'none', resize: 'vertical' }}
                autoFocus
              />
            </div>
            <div className="ktp-modal-footer" style={{ borderTop: '1px solid #bec8c9', padding: '16px 24px', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="ktp-btn-cancel" style={{ backgroundColor: '#f4f6f6' }} onClick={() => setShowTuVanModal(false)}>Hủy</button>
              <button className="ktp-btn-submit" onClick={handleTuVan}>Xác nhận tiếp nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {showRejectModal && (
        <div className="ktp-modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="ktp-modal" onClick={(e) => e.stopPropagation()} style={{ width: '400px', maxWidth: '90vw' }}>
            <div className="ktp-modal-header" style={{ alignItems: 'center', borderBottom: 'none', backgroundColor: '#2f6765', color: '#ffffff' }}>
              <h3 style={{ fontSize: '16px', margin: 0, color: '#ffffff' }}>Xác nhận từ chối phiếu?</h3>
              <button className="ktp-modal-close" style={{ color: '#ffffff' }} onClick={() => setShowRejectModal(false)}><Icon name="close" /></button>
            </div>
            <div className="ktp-modal-body" style={{ padding: '24px', flex: 'none', display: 'block' }}>
              <p style={{ margin: '0 0 12px 0', fontWeight: '600', fontSize: '14px', color: '#3f494a' }}>Lý do từ chối <span style={{ color: '#d32f2f' }}>*</span></p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {['Không còn phòng/giường phù hợp', 'Không liên lạc được khách', 'Thông tin không hợp lệ', 'Khách hủy yêu cầu', 'Khác'].map(reason => (
                  <label key={reason} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#191c1d' }}>
                    <input type="radio" name="rejectReason" value={reason} checked={rejectReason === reason} onChange={(e) => setRejectReason(e.target.value)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                    {reason}
                  </label>
                ))}
              </div>
              <div style={{ marginTop: '12px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#3f494a' }}>Ghi chú thêm cho khách hàng {rejectReason !== 'Khác' && '(Tùy chọn)'}</p>
                <input type="text" placeholder="Ghi chú chi tiết hoặc gợi ý chỉnh sửa..." value={rejectNote} onChange={e => setRejectNote(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #bec8c9', borderRadius: '4px', fontSize: '14px', outline: 'none' }} autoFocus={rejectReason === 'Khác'} />
              </div>
            </div>
            <div className="ktp-modal-footer" style={{ borderTop: '1px solid #bec8c9', padding: '16px 24px', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="ktp-btn-cancel" style={{ backgroundColor: '#f4f6f6' }} onClick={() => setShowRejectModal(false)}>Hủy</button>
              <button className="ktp-btn-submit" style={{ backgroundColor: '#c62828' }} onClick={handleReject} disabled={rejectReason === 'Khác' && !rejectNote.trim()}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {acceptedReg && (
        <div className="ktp-modal-overlay">
          <div className="ktp-modal" onClick={(e) => e.stopPropagation()} style={{ width: '400px', maxWidth: '90vw' }}>
            <div className="ktp-modal-header" style={{ alignItems: 'center', backgroundColor: '#2f6765', color: '#ffffff' }}>
              <h3 style={{ fontSize: '18px', margin: 0, color: '#ffffff' }}>
                Tiếp nhận thành công
              </h3>
            </div>
            <div className="ktp-modal-body" style={{ padding: '24px', textAlign: 'center', flex: 'none', display: 'block' }}>
              <div style={{ color: '#2f6765', fontSize: '48px', marginBottom: '16px' }}>
                <Icon name="check_circle" />
              </div>
              <p style={{ margin: '0 0 8px', fontWeight: 'bold', color: '#191c1d', fontSize: '16px' }}>
                Phiếu đăng ký {acceptedReg.maDangKy || acceptedReg.id} đã được tiếp nhận.
              </p>
            </div>
            <div className="ktp-modal-footer" style={{ justifyContent: 'center', gap: '16px' }}>
              <button className="ktp-btn-submit" onClick={() => {
                const profileToSchedule = acceptedReg;
                setAcceptedReg(null);
                setSchedulingProfile(profileToSchedule);
              }}>Lập lịch tiếp</button>
            </div>
          </div>
        </div>
      )}

      {/* Styles inline for animations and spinner if missing */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .ktp-spinner {
          width: 30px; height: 30px;
          border: 3px solid rgba(47,103,101,0.2);
          border-top-color: #2f6765;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          display: inline-block;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
