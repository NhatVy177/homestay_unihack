import React, { useState, useEffect } from 'react';
import { Icon } from '../../components/common/Icon.jsx';
import { hopDongApi } from './hopDong.api.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import './lapHopDongTab.css';
import SaleContractList from './SaleContractList.jsx';
import '../../styles/contractPresentation.css';

const STEPS = [
  { id: 1, label: 'Tra cứu phiếu cọc' },
  { id: 2, label: 'Kiểm tra điều kiện' },
  { id: 3, label: 'Thành viên hợp đồng' },
  { id: 4, label: 'Thông tin & Dịch vụ' },
  { id: 5, label: 'Xác nhận' },
];

function StepIndicator({ current }) {
  return (
    <div className="lhd-stepper">
      {STEPS.map((step, idx) => {
        const done = step.id < current;
        const active = step.id === current;
        return (
          <React.Fragment key={step.id}>
            <div className={`lhd-step ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
              <div className="lhd-step-number">
                {done ? <span className="lhd-step-check">✓</span> : step.id}
              </div>
              <span className="lhd-step-label">{step.label}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`lhd-stepper-line ${done ? 'done' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function LapHopDongTab({ onResidence }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [ngayTaoFilter, setNgayTaoFilter] = useState('');

  // Data lists from API
  const [phieuCocs, setPhieuCocs] = useState([]);
  const [services, setServices] = useState([]);
  const [thanhVien, setThanhVien] = useState([]);
  const [thanhVienValidationResult, setThanhVienValidationResult] = useState([]);
  const [memberSummary, setMemberSummary] = useState(null);
  const [cuTruReview, setCuTruReview] = useState(null);

  // Selection states
  const [selectedPhieu, setSelectedPhieu] = useState(null);
  const [selectedServices, setSelectedServices] = useState({}); // mapped by MaDichVu -> boolean

  // Form inputs
  const [ngayKy, setNgayKy] = useState(new Date().toISOString().split('T')[0]);
  const [ngayBatDau, setNgayBatDau] = useState('');
  const [ngayKetThuc, setNgayKetThuc] = useState('');
  const [kyTT, setKyTT] = useState('Hàng tháng');
  const [ghiChu, setGhiChu] = useState('');
  const [soXeGuiXe, setSoXeGuiXe] = useState(1);
  const [confirmKH, setConfirmKH] = useState(false);
  const [confirmNV, setConfirmNV] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({ ten: '', ngaySinh: '', gioiTinh: 'Nam', cccd: '', sdt: '', email: '', quocTich: 'Việt Nam' });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showChiTiet, setShowChiTiet] = useState(false);
  const [savedHD, setSavedHD] = useState(null);

  // Condition check state (Step 2)
  const [dieukienCheck, setDieukienCheck] = useState({ loading: false, hopLe: false, thongBao: '' });

  // Fetch deposit slips on mount & search
  const loadPhieuCocs = async (keyword = '', date = '') => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await hopDongApi.traCuuPhieuCoc(keyword, null, date || null);
      setPhieuCocs(res.data || []);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Không thể tải danh sách phiếu cọc.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhieuCocs();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    loadPhieuCocs(searchText, ngayTaoFilter);
  };

  // Load services
  const loadServices = async () => {
    try {
      const res = await hopDongApi.layDanhSachDichVu();
      const data = res.data || [];
      setServices(data);
      // Auto select compulsory services (Điện and Nước)
      const compulsory = {};
      data.forEach(dv => {
        if (dv.batBuoc) {
          compulsory[dv.maDichVu] = true;
        }
      });
      setSelectedServices(prev => ({ ...prev, ...compulsory }));
    } catch (err) {
      console.error('Failed to load services:', err);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  // Step transitions
  const handleSelectPhieu = async (phieu) => {
    try {
      setLoading(true);
      setErrorMsg('');
      // Fetch full details of selected deposit slip
      const res = await hopDongApi.layChiTietPhieuCoc(phieu.maPhieuDatCoc);
      const details = res.data;
      setSelectedPhieu(details);
      setThanhVien([]);
      setThanhVienValidationResult([]);
      setMemberSummary(null);
      setCuTruReview(null);

      try {
        const cuTruRes = await hopDongApi.layHoSoCuTruDaDuyet(phieu.maPhieuDatCoc);
        const approvedResidence = cuTruRes.data || null;
        const approvedMembers = (approvedResidence?.thanhVien || [])
          .filter((item) => item.trangThaiDuyet === 'Đủ điều kiện')
          .map((item) => ({
            ten: item.ten || item.hoTen,
            hoTen: item.hoTen || item.ten,
            ngaySinh: item.ngaySinh,
            gioiTinh: item.gioiTinh,
            cccd: item.cccd,
            sdt: item.sdt,
            email: item.email,
            quocTich: item.quocTich || 'Việt Nam'
          }));
        setCuTruReview(approvedResidence);
        setThanhVien(approvedMembers);
        setThanhVienValidationResult((approvedResidence?.thanhVien || []).map((item) => ({
          hoTen: item.hoTen || item.ten,
          ngaySinh: item.ngaySinh,
          gioiTinh: item.gioiTinh,
          cccd: item.cccd,
          sdt: item.sdt,
          email: item.email,
          quocTich: item.quocTich,
          trangThaiKiemTra: item.trangThaiDuyet === 'Bị từ chối' ? 'Bị từ chối' : 'Đang ở',
          lyDo: item.lyDoTuChoi
        })));
        setMemberSummary({
          TongThanhVien: approvedResidence?.summary?.tongThanhVien || 0,
          ThanhVienHopLe: approvedResidence?.summary?.soDuDieuKien || 0,
          ThanhVienBiTuChoi: approvedResidence?.summary?.soBiTuChoi || 0,
          KetLuan: approvedResidence?.summary?.coTheTiepTucLapHopDong ? 'Có thể tiếp tục' : 'Không có thành viên hợp lệ'
        });
      } catch {
        // Hồ sơ cư trú chưa duyệt: giữ luồng nhập thành viên thủ công hiện có.
      }

      // Auto-set estimated dates based on ThoiGianNhanPhong
      if (details?.thoiGianNhanPhong) {
        const start = new Date(details.thoiGianNhanPhong);
        setNgayBatDau(start.toISOString().split('T')[0]);
        // Set end date to 1 year later by default
        const end = new Date(start);
        end.setFullYear(end.getFullYear() + 1);
        setNgayKetThuc(end.toISOString().split('T')[0]);
      }

      setStep(2);
      // Immediately run conditions check
      setDieukienCheck({ loading: true, hopLe: false, thongBao: '' });
      const checkRes = await hopDongApi.kiemTraDieuKienLapHopDong(phieu.maPhieuDatCoc);
      setDieukienCheck({ loading: false, hopLe: checkRes.data.hopLe, thongBao: checkRes.data.thongBao });
    } catch (err) {
      setDieukienCheck({ loading: false, hopLe: false, thongBao: err.response?.data?.message || 'Lỗi kiểm tra điều kiện.' });
      setErrorMsg(err.response?.data?.message || 'Lỗi lấy chi tiết phiếu cọc.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewContract = async (maPhieuDatCoc) => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await hopDongApi.layChiTietHopDongTheoPhieuCoc(maPhieuDatCoc);
      setSavedHD(res.data);
      setShowChiTiet(true);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Không thể tải chi tiết hợp đồng.');
    } finally {
      setLoading(false);
    }
  };

  const handleStep3Continue = async () => {
    if (cuTruReview) {
      const rejectedCount = cuTruReview.summary?.soBiTuChoi || 0;
      if (thanhVien.length === 0) {
        alert('Không còn thành viên đủ điều kiện để lập hợp đồng. Vui lòng dừng thủ tục hoặc yêu cầu cập nhật lại hồ sơ cư trú.');
        return;
      }
      if (rejectedCount > 0) {
        const confirmProceed = window.confirm(
          `Hồ sơ cư trú có ${rejectedCount} thành viên bị từ chối. ` +
          'Bạn có muốn tiếp tục lập hợp đồng với các thành viên còn lại đủ điều kiện không?'
        );
        if (!confirmProceed) {
          handleReset();
          return;
        }
      }
      setStep(4);
      return;
    }

    if (selectedPhieu?.hinhThucThue === 'Nguyên phòng' && thanhVien.length === 0) {
      alert('Thuê nguyên phòng yêu cầu nhập ít nhất 1 thành viên cư trú.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      // Check members list using database SP validation logic
      const res = await hopDongApi.kiemTraThanhVienHopDongTam(selectedPhieu.maPhieuDatCoc, thanhVien);
      const result = res.data;
      setThanhVienValidationResult(result.thanhVienValidation || []);
      setMemberSummary(result.summary || null);

      // Verify validation criteria
      if (result.summary) {
        if (result.summary.KetLuan === 'Vượt sức chứa' || result.summary.KetLuan === 'Vượt số giường') {
          alert(`Số thành viên vượt quá giới hạn tối đa (${result.summary.SucChuaToiDa} người/giường). Vui lòng điều chỉnh.`);
          return;
        }
        if (result.summary.KetLuan === 'Không có thành viên hợp lệ' && selectedPhieu?.hinhThucThue === 'Nguyên phòng') {
          alert('Không tìm thấy thành viên cư trú nào hợp lệ. Vui lòng kiểm tra lại thông tin (CCCD, SĐT, Giới tính).');
          return;
        }
      }

      // Check if there are any rejected members
      const hasRejected = result.thanhVienValidation?.some(tv => tv.trangThaiKiemTra === 'Bị từ chối');
      if (hasRejected) {
        const confirmProceed = window.confirm(
          "Phát hiện có thành viên không đủ điều kiện lưu trú (bị từ chối). " +
          "Bạn có muốn tiếp tục lập hợp đồng với các thành viên còn lại đáp ứng điều kiện không?"
        );
        if (!confirmProceed) {
          handleReset();
          return;
        }
      }

      // If validation looks good, proceed to step 4
      setStep(4);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Có lỗi xảy ra khi kiểm tra danh sách thành viên.');
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi kiểm tra danh sách thành viên.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedPhieu(null);
    setThanhVien([]);
    setThanhVienValidationResult([]);
    setMemberSummary(null);
    setCuTruReview(null);
    setSoXeGuiXe(1);
    setConfirmKH(false);
    setConfirmNV(false);
    setShowSuccessModal(false);
    setSavedHD(null);
    setShowChiTiet(false);
    setGhiChu('');
    // re-fetch fresh list
    loadPhieuCocs(searchText, ngayTaoFilter);
  };

  const handleLuu = async () => {
    if (!confirmKH || !confirmNV) {
      alert('Vui lòng tích chọn xác nhận hợp đồng trước khi lưu.');
      return;
    }

    // Prepare payload
    const selectedDVs = services
      .filter(dv => selectedServices[dv.maDichVu])
      .map(dv => ({
        maDichVu: dv.maDichVu,
        ghiChu: isXeService(dv) ? soXeGuiXe.toString() : (dv.batBuoc ? 'Bắt buộc' : 'Dịch vụ chọn thêm')
      }));

    const payload = {
      maPhieuDatCoc: selectedPhieu.maPhieuDatCoc,
      ngayBatDau: ngayBatDau,
      ngayKetThuc: ngayKetThuc,
      kyThanhToan: kyTT,
      khachHangDaXacNhan: confirmKH,
      nhanVienDaXacNhan: confirmNV,
      danhSachThanhVien: thanhVien,
      danhSachDichVu: selectedDVs
    };

    try {
      setLoading(true);
      setErrorMsg('');
      const res = await hopDongApi.lapHopDongThue(payload);
      setSavedHD(res.data);
      setShowSuccessModal(true);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Gặp lỗi khi tạo hợp đồng thuê phòng.');
      alert(err.response?.data?.message || 'Gặp lỗi khi tạo hợp đồng thuê phòng.');
    } finally {
      setLoading(false);
    }
  };

  const getServiceIcon = (name = '') => {
    if (name.includes('Điện')) return 'bolt';
    if (name.includes('Nước')) return 'water_drop';
    if (name.includes('Wifi') || name.includes('Internet')) return 'wifi';
    if (name.includes('Xe')) return 'directions_bike';
    return 'room_service';
  };

  const getPhieuStatusStyle = (p = {}) => {
    if (p.trangThaiCoc === 'Huỷ') {
      return { class: 'lhd-badge-danger', label: 'Đã hủy cọc' };
    }
    if (p.trangThaiThanhToan !== 'Đã TT') {
      return { class: 'lhd-badge-warning', label: 'Chờ thanh toán' };
    }
    if (p.trangThaiCoc === 'Đã lập HĐ' || (!p.coTheLapHopDong && p.trangThaiHoSoCuTru === 'Đã duyệt cư trú')) {
      return { class: 'lhd-badge-success', label: 'Đã lập HĐ' };
    }
    if (p.trangThaiHoSoCuTru === 'Chờ duyệt cư trú') {
      return { class: 'lhd-badge-warning', label: 'Chờ duyệt' };
    }
    if (p.trangThaiHoSoCuTru === 'Từ chối cư trú') {
      return { class: 'lhd-badge-danger', label: 'Từ chối cư trú' };
    }
    if (p.trangThaiHoSoCuTru === 'Chưa cập nhật' || !p.trangThaiHoSoCuTru) {
      return { class: 'lhd-badge-warning', label: 'Chưa cư trú' };
    }
    if (p.coTheLapHopDong) {
      return { class: 'lhd-badge-info', label: 'Chờ lập HĐ' };
    }
    return { class: 'lhd-badge-muted', label: 'Không rõ' };
  };

  const getContractMembers = () => {
    if (cuTruReview) {
      return thanhVien.map((tv, index) => ({
        ...tv,
        ten: tv.ten || tv.hoTen,
        vaiTro: index === 0 ? 'Chủ hợp đồng' : 'Thành viên'
      }));
    }

    const list = [{ ten: selectedPhieu?.hoTenKhachHang, vaiTro: 'Chủ hợp đồng' }];
    if (selectedPhieu?.hinhThucThue !== 'Ghép giường') {
      thanhVien.forEach(tv => list.push({ ...tv, ten: tv.ten || tv.hoTen, vaiTro: 'Thành viên' }));
    }
    return list;
  };

  const getDisplayViTriThue = () => {
    if (!selectedPhieu) return '';
    if (selectedPhieu.hinhThucThue === 'Ghép giường' && selectedPhieu.maGiuong && selectedPhieu.maGiuong.includes(',')) {
      const beds = selectedPhieu.maGiuong.split(',').map(b => b.trim());
      const approvedBedsCount = thanhVien.length || 1;
      const slicedBeds = beds.slice(0, approvedBedsCount);
      return `${selectedPhieu.maPhong}-${slicedBeds.join(', ')}`;
    }
    return selectedPhieu.viTriThue;
  };

  // Base price and cost calculation
  const bedCount = selectedPhieu?.hinhThucThue === 'Ghép giường' ? (thanhVien.length || 1) : 1;
  const basePrice = selectedPhieu ? (selectedPhieu.giaThue * bedCount) : 0;
  const isXeService = (dv) => dv.tenDichVu?.toLowerCase().includes('xe');
  const dichVuCost = services
    .filter(dv => selectedServices[dv.maDichVu])
    .reduce((sum, dv) => sum + (isXeService(dv) ? dv.donGia * soXeGuiXe : dv.donGia), 0);
  const totalPrice = basePrice + dichVuCost;

  const formatRentPerMonth = (value) => (
    Number(value || 0) > 0 ? `${Number(value).toLocaleString('vi-VN')}đ/tháng` : '-'
  );

  const renderChiTietModal = () => {
    if (!showChiTiet || !savedHD) return null;

    const closeModal = () => { setShowChiTiet(false); handleReset(); };
    const formatDate = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : '...../...../..........';
    const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đồng`;
    const signedDate = savedHD.ngayKyHD ? new Date(savedHD.ngayKyHD) : null;
    const signedDay = signedDate ? signedDate.getDate() : '.....';
    const signedMonth = signedDate ? signedDate.getMonth() + 1 : '.....';
    const signedYear = signedDate ? signedDate.getFullYear() : '..........';
    const daiDienBenA = user?.hoTen || savedHD.daiDienChoThue || '........................';
    const hinhThucThue = savedHD.hinhThucThue || (savedHD.tenPhongDayDu?.includes('Giường') ? 'Ghép giường' : 'Nguyên phòng');
    const soGiuongThue = Number(savedHD.soGiuongThue || savedHD.thanhVien?.length || 1);
    const phamViThue = hinhThucThue === 'Nguyên phòng' ? 'Thuê cả phòng' : `${soGiuongThue} giường`;
    const giaTheoHinhThuc = hinhThucThue === 'Nguyên phòng' ? 'Giá thuê theo phòng' : 'Giá thuê theo giường';
    const kyThanhToan = savedHD.kyThanhToan || 'Hàng tháng';
    const quyDinhHoanCoc = savedHD.quyDinhHoanCoc || [];
    const noiQuyList = savedHD.dieuKhoan || [];
    const dieuKhoanViPham = savedHD.dieuKhoanViPham || [];
    const contractRow = (label, value) => (
      <div className="contract-row-item">
        <span>{label}:</span>
        <strong>{value || '........................................'}</strong>
      </div>
    );
    const articleTitle = (index, title) => (
      <h4 className={["lhd-display-001"].filter(Boolean).join(" ")}>
        ĐIỀU {index}. {title}
      </h4>
    );
    const legalBase = (text) => (
      <p className="contract-legal-base">- {text}</p>
    );

    return (
      <div className="ktp-modal-overlay" onClick={closeModal}>
        <div className={["ktp-modal", "lhd-display-002"].filter(Boolean).join(" ")} onClick={e => e.stopPropagation()} >
          <div className="lhd-modal-topbar">
            <div className="lhd-modal-topbar-icon"><Icon name="description" /></div>
            <div className={["lhd-display-003"].filter(Boolean).join(" ")}>
              <h3 className={["lhd-display-004"].filter(Boolean).join(" ")}>Bản xem hợp đồng thuê</h3>
              <p className={["lhd-display-005"].filter(Boolean).join(" ")}>Mã hợp đồng: {savedHD.maHopDong}</p>
            </div>
            <button
              onClick={() => window.print()}
              className={["lhd-btn lhd-btn-outline", "lhd-display-006"].filter(Boolean).join(" ")}

            >
              <Icon name="print" className={["lhd-display-007"].filter(Boolean).join(" ")} /> In hợp đồng
            </button>
            <button onClick={closeModal} className="lhd-modal-close-btn"><Icon name="close" className={["lhd-display-008"].filter(Boolean).join(" ")} /></button>
          </div>

          <div  className={["lhd-print-overlay", "lhd-display-009"].filter(Boolean).join(" ")}>
            <article id="print-area-wrapper" className="contract-paper-a4">
              <header className={["lhd-display-010"].filter(Boolean).join(" ")}>
                <div className={["lhd-display-011"].filter(Boolean).join(" ")}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div className={["lhd-display-012"].filter(Boolean).join(" ")}>Độc lập - Tự do - Hạnh phúc</div>
                <h2 className={["lhd-display-013"].filter(Boolean).join(" ")}>HỢP ĐỒNG THUÊ CHỖ Ở NỘI TRÚ</h2>
                <div className={["lhd-display-014"].filter(Boolean).join(" ")}>HOMESTAYDORM</div>
                <div className={["lhd-display-015"].filter(Boolean).join(" ")}>Số: {savedHD.maHopDong || '.....'}/HĐ-HSD</div>
              </header>

              <section className={["lhd-display-016"].filter(Boolean).join(" ")}>
                {legalBase('Căn cứ Bộ Luật Dân sự số 91/2015/QH13 ngày 24/11/2015 của Quốc hội Nước Cộng hòa Xã hội Chủ nghĩa Việt Nam;')}
                {legalBase('Căn cứ nhu cầu thuê chỗ ở của Bên B và khả năng cung cấp chỗ ở của HomeStayDorm;')}
                {legalBase('Căn cứ thông tin đặt cọc, hồ sơ cư trú đã được đối chiếu và kết quả thỏa thuận giữa hai bên.')}
              </section>

              <p>
                Hôm nay, ngày <strong>{signedDay}</strong> tháng <strong>{signedMonth}</strong> năm <strong>{signedYear}</strong>, tại <strong>{savedHD.diaChiChiNhanh || 'HomeStayDorm'}</strong>, hai bên gồm:
              </p>

              <section className={["lhd-display-017"].filter(Boolean).join(" ")}>
                <div className={["lhd-display-018"].filter(Boolean).join(" ")}>BÊN CHO THUÊ (Bên A): {savedHD.benChoThue || 'HomeStayDorm'}</div>
                {contractRow('Tên đơn vị', savedHD.benChoThue)}
                {contractRow('Đại diện', daiDienBenA)}
                {contractRow('Chức vụ', 'Nhân viên sale')}
                {contractRow('Địa chỉ chi nhánh', savedHD.diaChiChiNhanh)}
              </section>
              <section className={["lhd-display-016"].filter(Boolean).join(" ")}>
                <div className={["lhd-display-018"].filter(Boolean).join(" ")}>BÊN THUÊ CHỖ Ở (Bên B):</div>
                {contractRow('Họ tên', savedHD.benThue)}
                {contractRow('CCCD/Hộ chiếu', savedHD.cccdBenThue)}
                {contractRow('Mã khách hàng', savedHD.maKhachHang)}
              </section>

              {articleTitle(1, 'Đối tượng và thời hạn thuê')}
              {contractRow('Phòng/giường thuê', savedHD.tenPhongDayDu || savedHD.tenPhong)}
              {contractRow('Hình thức thuê', hinhThucThue)}
              {contractRow('Số giường/phạm vi thuê', phamViThue)}
              {contractRow('Địa chỉ', savedHD.diaChiChiNhanh)}
              {contractRow('Thời hạn thuê', `${savedHD.thoiHanThue || 0} tháng`)}
              {contractRow('Trạng thái ký', savedHD.trangThaiKy)}

              {articleTitle(2, 'Giá thuê, tiền cọc và kỳ thanh toán')}
              <table>
                <tbody>
                  <tr>
                    <td className={["lhd-display-019"].filter(Boolean).join(" ")}>{giaTheoHinhThuc}</td>
                    <td className={["lhd-display-020"].filter(Boolean).join(" ")}>{formatMoney(savedHD.giaThueThang)}</td>
                  </tr>
                  <tr>
                    <td className={["lhd-display-021"].filter(Boolean).join(" ")}>Kỳ thanh toán</td>
                    <td className={["lhd-display-022"].filter(Boolean).join(" ")}>{kyThanhToan}</td>
                  </tr>
                  <tr>
                    <td className={["lhd-display-021"].filter(Boolean).join(" ")}>Tiền đặt cọc đã nhận</td>
                    <td className={["lhd-display-020"].filter(Boolean).join(" ")}>{formatMoney(savedHD.soTienCoc)}</td>
                  </tr>
                </tbody>
              </table>
              <p>
                Bên thuê thanh toán tiền thuê theo kỳ đã thỏa thuận và thực hiện đầy đủ các khoản phí dịch vụ phát sinh trong quá trình lưu trú.
              </p>

              {articleTitle(3, 'Quy định hoàn hoặc khấu trừ tiền cọc')}
              <p>
                Tiền cọc được đối soát theo bảng quy định hoàn cọc đang có hiệu lực, sau đó khấu trừ các khoản còn nợ, chi phí sửa chữa, tiền phạt hoặc nghĩa vụ phát sinh nếu có.
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Mã quy định</th>
                    <th>Trường hợp áp dụng</th>
                    <th>Tỷ lệ hoàn cọc</th>
                  </tr>
                </thead>
                <tbody>
                  {quyDinhHoanCoc.length > 0 ? (
                    quyDinhHoanCoc.map((qd) => (
                      <tr key={qd.maQuyDinhHoanCoc}>
                        <td className={["lhd-display-023"].filter(Boolean).join(" ")}>{qd.maQuyDinhHoanCoc}</td>
                        <td>{qd.tenQuyDinh}</td>
                        <td className={["lhd-display-024"].filter(Boolean).join(" ")}>{Number(qd.tyLeHoanCoc || 0).toLocaleString('vi-VN')}%</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3}>
                        Áp dụng theo quy định hoàn cọc hiện hành của ký túc xá tại thời điểm đối soát.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {articleTitle(4, 'Các khoản phí dịch vụ áp dụng')}
              <table>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Khoản phí</th>
                    <th>Đơn giá</th>
                    <th>Đơn vị tính</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {(savedHD.dichVu || []).map((dv, i) => (
                    <tr key={i}>
                      <td className={["lhd-display-025"].filter(Boolean).join(" ")}>{i + 1}</td>
                      <td className={["lhd-display-021"].filter(Boolean).join(" ")}>{dv.tenDichVu}</td>
                      <td>{formatMoney(dv.donGia)}</td>
                      <td>{dv.donViTinh}</td>
                      <td>Tính theo mức sử dụng hoặc chính sách dịch vụ tại thời điểm thanh toán.</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {articleTitle(5, 'Thành viên cư trú')}
              <table>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Họ tên</th>
                    <th>Vai trò</th>
                    <th>Số điện thoại</th>
                  </tr>
                </thead>
                <tbody>
                  {(savedHD.thanhVien || []).map((tv, i) => (
                    <tr key={i}>
                      <td className={["lhd-display-025"].filter(Boolean).join(" ")}>{i + 1}</td>
                      <td className={["lhd-display-021"].filter(Boolean).join(" ")}>{tv.hoTen}</td>
                      <td>{tv.quanHe || 'Thành viên'}</td>
                      <td>{tv.sdt || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {articleTitle(6, 'Nội quy lưu trú')}
              {noiQuyList.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th className={["lhd-display-026"].filter(Boolean).join(" ")}>STT</th>
                      <th className={["lhd-display-027"].filter(Boolean).join(" ")}>Nội dung</th>
                      <th>Quy định cụ thể</th>
                    </tr>
                  </thead>
                  <tbody>
                    {noiQuyList.map((nq, i) => (
                      <tr key={nq.maQuyDinh || i}>
                        <td className={["lhd-display-026"].filter(Boolean).join(" ")}>{i + 1}</td>
                        <td className={["lhd-display-021"].filter(Boolean).join(" ")}>{nq.tieuDeNoiQuy}</td>
                        <td>{nq.noiDung}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className={["lhd-display-028"].filter(Boolean).join(" ")}>Chưa có dữ liệu nội quy.</p>
              )}

              {articleTitle(7, 'Điều khoản xử lý vi phạm')}
              {dieuKhoanViPham.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th className={["lhd-display-026"].filter(Boolean).join(" ")}>STT</th>
                      <th>Điều khoản vi phạm</th>
                      <th className={["lhd-display-029"].filter(Boolean).join(" ")}>Hình thức</th>
                      <th className={["lhd-display-030"].filter(Boolean).join(" ")}>Mức phạt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dieuKhoanViPham.map((dk, i) => (
                      <tr key={dk.maDieuKhoan || i}>
                        <td className={["lhd-display-026"].filter(Boolean).join(" ")}>{i + 1}</td>
                        <td className={["lhd-display-021"].filter(Boolean).join(" ")}>{dk.tenDieuKhoan}</td>
                        <td>{dk.hinhThucXuPhat}</td>
                        <td className={["lhd-display-022", dk.mucPhat > 0 ? "lhd-display-031" : "lhd-display-032"].filter(Boolean).join(" ")}>
                          {dk.mucPhat > 0 ? `${Number(dk.mucPhat).toLocaleString('vi-VN')}đ` : 'Nhắc nhở'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className={["lhd-display-028"].filter(Boolean).join(" ")}>Chưa có dữ liệu điều khoản vi phạm.</p>
              )}

              {articleTitle(8, 'Cam kết chung')}
              <p>
                Hai bên cam kết thực hiện đúng các nội dung đã thỏa thuận trong hợp đồng. Hợp đồng có hiệu lực kể từ ngày ký và là căn cứ để thực hiện các bước thu tiền nhận phòng, bàn giao phòng/giường và quản lý lưu trú.
              </p>

              <div className={["lhd-display-033"].filter(Boolean).join(" ")}>
                <div>
                  <div className={["lhd-display-034"].filter(Boolean).join(" ")}>Đại diện bên A</div>
                  <div className={["lhd-display-035"].filter(Boolean).join(" ")}>(Ký, ghi rõ họ tên)</div>
                  <div className={["lhd-display-036"].filter(Boolean).join(" ")} />
                  <div className={["lhd-display-021"].filter(Boolean).join(" ")}>{daiDienBenA}</div>
                  <div className={["lhd-display-035"].filter(Boolean).join(" ")}>Nhân viên sale</div>
                </div>
                <div>
                  <div className={["lhd-display-034"].filter(Boolean).join(" ")}>Bên thuê</div>
                  <div className={["lhd-display-035"].filter(Boolean).join(" ")}>(Ký, ghi rõ họ tên)</div>
                  <div className={["lhd-display-036"].filter(Boolean).join(" ")} />
                  <div className={["lhd-display-021"].filter(Boolean).join(" ")}>{savedHD.benThue || '........................'}</div>
                </div>
              </div>
            </article>
          </div>

          <div className={["lhd-display-037"].filter(Boolean).join(" ")}>
            <button onClick={closeModal} className="lhd-btn lhd-btn-primary">Đóng</button>
          </div>
        </div>
      </div>
    );
  };

  /* List-first entry; the existing handlers own every contract transition. */
  if (step === 1) return <div className="lhd-container sale-contract-landing">
    <SaleContractList rows={phieuCocs} loading={loading} error={errorMsg} search={searchText}
      onSearch={value => { setSearchText(value); loadPhieuCocs(value, ngayTaoFilter); }}
      date={ngayTaoFilter} onDate={value => { setNgayTaoFilter(value); loadPhieuCocs(searchText, value); }}
      onSelect={handleSelectPhieu} onView={handleViewContract} onResidence={onResidence}
      branch={user?.tenChiNhanh || user?.maChiNhanh} formatRent={formatRentPerMonth} statusInfo={getPhieuStatusStyle} />
    {renderChiTietModal()}
  </div>;

  /* ─── STEP 2 ─── */
  if (step === 2) {
    const dieuKienItems = [
      { label: 'Trạng thái phiếu đặt cọc: Hiệu lực', met: selectedPhieu?.trangThaiCoc === 'Hiệu lực' },
      { label: 'Tiền cọc: Đã thanh toán', met: selectedPhieu?.trangThaiThanhToan === 'Đã TT' },
      { label: 'Liên kết dữ liệu: Chưa có hợp đồng liên kết', met: dieukienCheck.hopLe },
      { label: 'Dữ liệu khách hàng: Đủ thông tin (CCCD, SĐT)', met: !!(selectedPhieu?.cccd && selectedPhieu?.sdt) }
    ];

    return (
      <div className="lhd-container">
        <StepIndicator current={2} />

        <div className="lhd-grid-2">
          <div className={["lhd-card", "lhd-display-038"].filter(Boolean).join(" ")} >
            <div className={["lhd-display-039"].filter(Boolean).join(" ")}>
              <h4 className={["lhd-display-040"].filter(Boolean).join(" ")}>Thông tin phiếu đặt cọc</h4>
              <span className="lhd-badge lhd-badge-warning">{selectedPhieu?.maPhieuDatCoc}</span>
            </div>

            <div className={["lhd-display-041"].filter(Boolean).join(" ")}>
              <span className={["lhd-display-042"].filter(Boolean).join(" ")}>Khách hàng:</span>
              <span className={["lhd-display-043"].filter(Boolean).join(" ")}>{selectedPhieu?.hoTenKhachHang}</span>
            </div>
            <div className={["lhd-display-041"].filter(Boolean).join(" ")}>
              <span className={["lhd-display-042"].filter(Boolean).join(" ")}>Phòng thuê:</span>
              <span className={["lhd-display-043"].filter(Boolean).join(" ")}>{selectedPhieu?.viTriThue}</span>
            </div>
            <div className={["lhd-display-041"].filter(Boolean).join(" ")}>
              <span className={["lhd-display-042"].filter(Boolean).join(" ")}>Giá thuê:</span>
              <span className={["lhd-display-044"].filter(Boolean).join(" ")}>{selectedPhieu?.giaThue?.toLocaleString('vi-VN')}đ/tháng</span>
            </div>
            <div className={["lhd-display-041"].filter(Boolean).join(" ")}>
              <span className={["lhd-display-042"].filter(Boolean).join(" ")}>Trạng thái cọc:</span>
              <span className={`lhd-badge ${selectedPhieu?.trangThaiCoc === 'Hiệu lực' ? 'lhd-badge-success' : 'lhd-badge-danger'}`}>
                {selectedPhieu?.trangThaiCoc}
              </span>
            </div>
            <div className={["lhd-display-045"].filter(Boolean).join(" ")}>
              <span className={["lhd-display-042"].filter(Boolean).join(" ")}>Thanh toán cọc:</span>
              <span className={["lhd-display-021", selectedPhieu?.trangThaiThanhToan === 'Đã TT' ? "lhd-display-046" : "lhd-display-047"].filter(Boolean).join(" ")}>
                {selectedPhieu?.trangThaiThanhToan === 'Đã TT' ? 'ĐÃ THANH TOÁN CỌC' : 'CHƯA THANH TOÁN CỌC'}
              </span>
            </div>

            {dieukienCheck.loading ? (
              <div className={["lhd-display-048"].filter(Boolean).join(" ")}>
                <Icon name="sync" className={["lhd-rotate", "lhd-display-007"].filter(Boolean).join(" ")}  />
                <span className={["lhd-display-049"].filter(Boolean).join(" ")}>Đang đối chiếu dữ liệu hệ thống & kiểm tra điều kiện...</span>
              </div>
            ) : dieukienCheck.hopLe ? (
              <div className={["lhd-alert lhd-alert-success", "lhd-display-050"].filter(Boolean).join(" ")} >
                <div className="lhd-alert-icon"><Icon name="check" /></div>
                <div>
                  <div className={["lhd-display-051"].filter(Boolean).join(" ")}>Đủ điều kiện lập hợp đồng</div>
                  <div className={["lhd-display-052"].filter(Boolean).join(" ")}>{dieukienCheck.thongBao}</div>
                </div>
              </div>
            ) : (
              <div className={["lhd-alert lhd-alert-danger", "lhd-display-050"].filter(Boolean).join(" ")} >
                <div className="lhd-alert-icon"><Icon name="close" /></div>
                <div>
                  <div className={["lhd-display-051"].filter(Boolean).join(" ")}>Không đủ điều kiện</div>
                  <div className={["lhd-display-052"].filter(Boolean).join(" ")}>{dieukienCheck.thongBao || 'Vui lòng kiểm tra các mục bên phải.'}</div>
                </div>
              </div>
            )}
          </div>

          <div className="lhd-card">
            <h4 className={["lhd-display-053"].filter(Boolean).join(" ")}>Điều kiện lập hợp đồng</h4>
            <div className={["lhd-display-054"].filter(Boolean).join(" ")}>
              {dieuKienItems.map((dk, i) => (
                <div key={i} className={["lhd-display-055"].filter(Boolean).join(" ")}>
                  <span className={["lhd-display-056"].filter(Boolean).join(" ")}>{dk.label}</span>
                  <div className={["lhd-display-062", dieukienCheck.loading ? "lhd-display-057" : dk.met ? "lhd-display-058" : "lhd-display-059", dieukienCheck.loading ? "lhd-display-060" : "lhd-display-061"].filter(Boolean).join(" ")}>
                    <Icon
                      name={dieukienCheck.loading ? "sync" : (dk.met ? "check" : "close")}
                      className={[dieukienCheck.loading ? "lhd-rotate" : "", "lhd-display-063"].filter(Boolean).join(" ")}

                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={["lhd-display-064"].filter(Boolean).join(" ")}>
          <button className="lhd-btn lhd-btn-outline" onClick={() => setStep(1)}><Icon name="arrow_back" /> Quay lại</button>
          <button
            disabled={!dieukienCheck.hopLe}
            onClick={() => setStep(3)}
            className="lhd-btn lhd-btn-primary"
          >
            Tiếp tục lập hợp đồng <Icon name="arrow_forward" />
          </button>
        </div>
      </div>
    );
  }

  /* ─── STEP 3 ─── */
  if (step === 3) {
    const sucChua = selectedPhieu?.sucChuaToiDa || 1;
    const hinhThucThue = selectedPhieu?.hinhThucThue || 'Ghép giường';
    const rejectedResidenceMembers = (cuTruReview?.thanhVien || []).filter((item) => item.trangThaiDuyet === 'Bị từ chối');
    const totalCount = cuTruReview ? thanhVien.length : 1 + thanhVien.length;
    const residencePrimary = cuTruReview && thanhVien.length > 0
      ? thanhVien[0]
      : {
          ten: selectedPhieu?.hoTenKhachHang,
          hoTen: selectedPhieu?.hoTenKhachHang,
          sdt: selectedPhieu?.sdt,
          cccd: selectedPhieu?.cccd,
          gioiTinh: selectedPhieu?.gioiTinh,
          ngaySinh: selectedPhieu?.ngaySinh,
          quocTich: selectedPhieu?.quocTich
        };
    const formatMemberDate = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : '-';

    return (
      <div className="lhd-container">
        <StepIndicator current={3} />

        {hinhThucThue === 'Ghép giường' && thanhVien.length <= 1 ? (
          <div className={["lhd-card", "lhd-display-065"].filter(Boolean).join(" ")} >
            <h4 className={["lhd-display-066"].filter(Boolean).join(" ")}>Xử lý khách đi đơn</h4>
            <p className={["lhd-display-067"].filter(Boolean).join(" ")}>
              Đối với hình thức thuê <strong>Ghép giường (Khách đi đơn)</strong>, hệ thống lập hợp đồng cho một thành viên cư trú đã đủ điều kiện.
            </p>
            <div className={["lhd-display-068"].filter(Boolean).join(" ")}>
              <div className={["lhd-display-069"].filter(Boolean).join(" ")}>
                <div className={["lhd-display-070"].filter(Boolean).join(" ")}>
                  <div className={["lhd-display-071"].filter(Boolean).join(" ")}>
                    {(residencePrimary?.ten || residencePrimary?.hoTen || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className={["lhd-display-072"].filter(Boolean).join(" ")}>{residencePrimary?.ten || residencePrimary?.hoTen || '-'}</div>
                    <div className={["lhd-display-073"].filter(Boolean).join(" ")}>Thành viên hợp đồng</div>
                  </div>
                </div>
                <span className="lhd-badge lhd-badge-success">
                  Đủ điều kiện
                </span>
              </div>
              <div className={["lhd-display-074"].filter(Boolean).join(" ")}>
                {[
                  { label: 'Ngày sinh', value: formatMemberDate(residencePrimary?.ngaySinh) },
                  { label: 'Giới tính', value: residencePrimary?.gioiTinh || '-' },
                  { label: 'Quốc tịch', value: residencePrimary?.quocTich || 'Việt Nam' },
                  { label: 'CCCD/Hộ chiếu', value: residencePrimary?.cccd || 'Chưa cập nhật' },
                  { label: 'Số điện thoại', value: residencePrimary?.sdt || '-' },
                  { label: 'Email', value: residencePrimary?.email || '-' }
                ].map((item) => (
                  <div key={item.label} className={["lhd-card", "lhd-display-075"].filter(Boolean).join(" ")} >
                    <div className={["lhd-label", "lhd-display-076"].filter(Boolean).join(" ")} >{item.label}</div>
                    <div className={["lhd-display-077"].filter(Boolean).join(" ")}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
            <p className={["lhd-display-078"].filter(Boolean).join(" ")}>
              * Bạn có thể bấm tiếp tục vì thành viên hợp đồng đã đủ điều kiện ở bước kiểm tra cư trú.
            </p>
          </div>
        ) : (
          <div className={["lhd-grid-2", "lhd-display-079"].filter(Boolean).join(" ")} >
            <div className="lhd-card">
              <div className={["lhd-display-080"].filter(Boolean).join(" ")}>
                <div>
                  <h4 className={["lhd-display-081"].filter(Boolean).join(" ")}>Danh sách thành viên (Thuê nhóm)</h4>
                  <p className={["lhd-display-082"].filter(Boolean).join(" ")}>
                    {cuTruReview ? 'Danh sách được lấy từ hồ sơ cư trú đã được quản lý duyệt.' : 'Nhập đầy đủ danh sách các thành viên sẽ lưu trú cùng căn hộ/phòng.'}
                  </p>
                </div>
                {!cuTruReview && (
                  <button
                    onClick={() => setShowAddMember(true)}
                    className={["lhd-btn lhd-btn-outline", "lhd-display-083"].filter(Boolean).join(" ")}

                  >
                    <Icon name="person_add" /> Thêm thành viên
                  </button>
                )}
              </div>

              {cuTruReview && (
                <div className={["lhd-alert lhd-alert-success", "lhd-display-084"].filter(Boolean).join(" ")} >
                  <Icon name="fact_check" className={["lhd-display-085"].filter(Boolean).join(" ")} />
                  <div>
                    <div className={["lhd-display-086"].filter(Boolean).join(" ")}>Đã duyệt cư trú trước khi lập hợp đồng</div>
                    <div className={["lhd-display-087"].filter(Boolean).join(" ")}>
                      {thanhVien.length} thành viên đủ điều kiện sẽ được đưa vào hợp đồng.
                      {rejectedResidenceMembers.length > 0 ? ` ${rejectedResidenceMembers.length} thành viên bị từ chối sẽ không được ký và không được sắp xếp vào ở.` : ''}
                    </div>
                  </div>
                </div>
              )}

              <div className={["lhd-table-wrapper", "lhd-display-088"].filter(Boolean).join(" ")} >
                <table className="lhd-table">
                  <thead>
                    <tr>
                      <th>Họ tên</th>
                      <th>Ngày sinh</th>
                      <th>Giới tính</th>
                      <th>CCCD/Hộ chiếu</th>
                      <th>Số điện thoại</th>
                      <th className="text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!cuTruReview && (
                      <tr>
                        <td>
                          <div className={["lhd-display-089"].filter(Boolean).join(" ")}>
                            <div className={["lhd-display-090"].filter(Boolean).join(" ")}>
                              <Icon name="person" className={["lhd-display-091"].filter(Boolean).join(" ")} />
                            </div>
                            <div>
                              <div className={["lhd-display-092"].filter(Boolean).join(" ")}>{selectedPhieu?.hoTenKhachHang}</div>
                              <div className={["lhd-display-093"].filter(Boolean).join(" ")}>Chủ hợp đồng</div>
                            </div>
                          </div>
                        </td>
                        <td className={["lhd-display-094"].filter(Boolean).join(" ")}>
                          {selectedPhieu?.ngaySinh ? new Date(selectedPhieu.ngaySinh).toLocaleDateString('vi-VN') : '-'}
                        </td>
                        <td className={["lhd-display-094"].filter(Boolean).join(" ")}>{selectedPhieu?.gioiTinh}</td>
                        <td className={["lhd-display-094"].filter(Boolean).join(" ")}>{selectedPhieu?.cccd}</td>
                        <td className={["lhd-display-094"].filter(Boolean).join(" ")}>{selectedPhieu?.sdt}</td>
                        <td className="text-center"><span className={["lhd-display-095"].filter(Boolean).join(" ")}>-</span></td>
                      </tr>
                    )}
                    {thanhVien.map((tv, i) => (
                      <tr key={i}>
                        <td>
                          <div className={["lhd-display-089"].filter(Boolean).join(" ")}>
                            <div className={["lhd-display-096"].filter(Boolean).join(" ")}>
                              <Icon name="person" className={["lhd-display-091"].filter(Boolean).join(" ")} />
                            </div>
                            <span className={["lhd-display-092"].filter(Boolean).join(" ")}>{tv.ten}</span>
                          </div>
                        </td>
                        <td className={["lhd-display-094"].filter(Boolean).join(" ")}>
                          {tv.ngaySinh ? new Date(tv.ngaySinh).toLocaleDateString('vi-VN') : '-'}
                        </td>
                        <td className={["lhd-display-094"].filter(Boolean).join(" ")}>{tv.gioiTinh}</td>
                        <td className={["lhd-display-094"].filter(Boolean).join(" ")}>{tv.cccd}</td>
                        <td className={["lhd-display-094"].filter(Boolean).join(" ")}>{tv.sdt}</td>
                        <td className="text-center">
                          {cuTruReview ? (
                            <span className="lhd-badge lhd-badge-success">Đủ điều kiện</span>
                          ) : (
                            <button
                              onClick={() => setThanhVien(thanhVien.filter((_, idx) => idx !== i))}
                              className="lhd-btn-text-danger"
                            >
                              <Icon name="delete" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {rejectedResidenceMembers.length > 0 && (
                <div className={["lhd-display-097"].filter(Boolean).join(" ")}>
                  <div className={["lhd-display-098"].filter(Boolean).join(" ")}>
                    Thành viên không được tham gia ký hợp đồng
                  </div>
                  {rejectedResidenceMembers.map((tv, index) => (
                    <div key={tv.maThanhVienCuTru || index} className={["lhd-display-099"].filter(Boolean).join(" ")}>
                      <span className={["lhd-display-100"].filter(Boolean).join(" ")}>{tv.hoTen || tv.ten}</span>
                      <span className={["lhd-display-101"].filter(Boolean).join(" ")}>{tv.lyDoTuChoi || 'Không đáp ứng điều kiện cư trú'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={["lhd-display-102"].filter(Boolean).join(" ")}>
              <div className="lhd-capacity-card">
                <div className={["lhd-label", "lhd-display-103"].filter(Boolean).join(" ")} >TÓM TẮT THÀNH VIÊN</div>
                <div className={["lhd-display-104"].filter(Boolean).join(" ")}>
                  <span className={["lhd-display-105"].filter(Boolean).join(" ")}>Số người ở:</span>
                  <span className={["lhd-display-106"].filter(Boolean).join(" ")}>{totalCount}<span className={["lhd-display-107"].filter(Boolean).join(" ")}>/{sucChua}</span></span>
                </div>
                <div className="lhd-progress-track">
                  <progress className={`lhd-progress-bar lhd-native-progress ${totalCount > sucChua ? 'error' : ''}`} value={Math.min((totalCount / sucChua) * 100, 100)} max="100" aria-label="Tỷ lệ sức chứa" />
                </div>
                <div className={["lhd-display-108"].filter(Boolean).join(" ")}>
                  <span className={["lhd-display-109"].filter(Boolean).join(" ")}>Sức chứa tối đa:</span>
                  <span className={["lhd-display-021"].filter(Boolean).join(" ")}>{sucChua} người</span>
                </div>

              </div>
            </div>
          </div>
        )}

        <div className={["lhd-display-064"].filter(Boolean).join(" ")}>
          <button className="lhd-btn lhd-btn-outline" onClick={() => setStep(2)}><Icon name="arrow_back" /> Quay lại</button>
          <button
            onClick={hinhThucThue === 'Ghép giường' && !cuTruReview ? () => setStep(4) : handleStep3Continue}
            className="lhd-btn lhd-btn-primary"
          >
            Tiếp tục <Icon name="arrow_forward" />
          </button>
        </div>

        {showAddMember && (
          <div className="ktp-modal-overlay" onClick={() => setShowAddMember(false)}>
            <div className={["ktp-modal", "lhd-display-110"].filter(Boolean).join(" ")} onClick={e => e.stopPropagation()} >
              <div className="ktp-modal-header">
                <h3 className={["lhd-display-111"].filter(Boolean).join(" ")}>Thêm thành viên</h3>
                <button className="ktp-modal-close" onClick={() => setShowAddMember(false)}><Icon name="close" /></button>
              </div>
              <div className={["ktp-modal-body", "lhd-display-112"].filter(Boolean).join(" ")} >
                <div className={["lhd-display-113"].filter(Boolean).join(" ")}>
                  <div className="lhd-form-group">
                    <label className="lhd-label">Họ và tên *</label>
                    <input className="lhd-input" type="text" placeholder="Nguyễn Văn A" value={newMember.ten} onChange={e => setNewMember({ ...newMember, ten: e.target.value })} />
                  </div>
                  <div className="lhd-form-group">
                    <label className="lhd-label">Ngày sinh</label>
                    <input className="lhd-input" type="date" value={newMember.ngaySinh} onChange={e => setNewMember({ ...newMember, ngaySinh: e.target.value })} />
                  </div>
                  <div className="lhd-form-group">
                    <label className="lhd-label">CCCD/Hộ chiếu *</label>
                    <input className="lhd-input" type="text" placeholder="Số CCCD" value={newMember.cccd} onChange={e => setNewMember({ ...newMember, cccd: e.target.value })} />
                  </div>
                  <div className="lhd-form-group">
                    <label className="lhd-label">Số điện thoại *</label>
                    <input className="lhd-input" type="text" placeholder="Số điện thoại" value={newMember.sdt} onChange={e => setNewMember({ ...newMember, sdt: e.target.value })} />
                  </div>
                  <div className="lhd-form-group">
                    <label className="lhd-label">Email</label>
                    <input className="lhd-input" type="email" placeholder="Email (nếu có)" value={newMember.email} onChange={e => setNewMember({ ...newMember, email: e.target.value })} />
                  </div>
                  <div className="lhd-form-group">
                    <label className="lhd-label">Giới tính</label>
                    <select className="lhd-input" value={newMember.gioiTinh} onChange={e => setNewMember({ ...newMember, gioiTinh: e.target.value })}>
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className={["ktp-modal-footer", "lhd-display-114"].filter(Boolean).join(" ")} >
                <button className="lhd-btn lhd-btn-outline" onClick={() => setShowAddMember(false)}>Hủy</button>
                <button
                  className="lhd-btn lhd-btn-primary"
                  onClick={() => {
                    if (newMember.ten && newMember.cccd && newMember.sdt) {
                      setThanhVien([...thanhVien, newMember]);
                      setNewMember({ ten: '', ngaySinh: '', gioiTinh: 'Nam', cccd: '', sdt: '', email: '', quocTich: 'Việt Nam' });
                      setShowAddMember(false);
                    } else {
                      alert('Vui lòng điền đầy đủ các thông tin bắt buộc (*).');
                    }
                  }}
                >
                  <Icon name="person_add" /> Thêm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ─── STEP 4 ─── */
  if (step === 4) return (
    <div className="lhd-container">
      <StepIndicator current={4} />
      <div className={["lhd-grid-2", "lhd-display-115"].filter(Boolean).join(" ")} >
        <div className="lhd-card">
          <h4 className="lhd-card-title">
            <Icon name="description" /> Thông tin hợp đồng
          </h4>
          <div className={["lhd-grid-form", "lhd-display-116"].filter(Boolean).join(" ")} >
            <div className="lhd-form-group"><label className="lhd-label">Mã phiếu cọc</label><input className="lhd-input" value={selectedPhieu?.maPhieuDatCoc || ''} readOnly /></div>
            <div className="lhd-form-group"><label className="lhd-label">Khách hàng</label><input className="lhd-input" value={selectedPhieu?.hoTenKhachHang || ''} readOnly /></div>
            <div className="lhd-form-group"><label className="lhd-label">Phòng/Giường</label><input className="lhd-input" value={getDisplayViTriThue() || ''} readOnly /></div>
            <div className="lhd-form-group">
              <label className="lhd-label">Kỳ thanh toán</label>
              <select className="lhd-input" value={kyTT} onChange={e => setKyTT(e.target.value)}>
                <option value="Hàng tháng">Hàng tháng</option>
                <option value="Hàng quý">Hàng quý</option>
              </select>
            </div>
            <div className="lhd-form-group"><label className="lhd-label">Ngày ký</label><input type="date" className="lhd-input" value={ngayKy} readOnly disabled /></div>
            <div className="lhd-form-group"><label className="lhd-label">Giá thuê niêm yết</label><div className={["lhd-display-117"].filter(Boolean).join(" ")}><input className={["lhd-input", "lhd-display-118"].filter(Boolean).join(" ")} value={basePrice?.toLocaleString('vi-VN') || 0} readOnly  /><span className={["lhd-display-119"].filter(Boolean).join(" ")}>VND</span></div></div>
            <div className="lhd-form-group"><label className="lhd-label">Ngày bắt đầu</label><input type="date" className="lhd-input" value={ngayBatDau} min={new Date().toISOString().split('T')[0]} onChange={e => setNgayBatDau(e.target.value)} /></div>
            <div className="lhd-form-group"><label className="lhd-label">Ngày kết thúc (Dự kiến)</label><input type="date" className="lhd-input" value={ngayKetThuc} min={ngayBatDau || new Date().toISOString().split('T')[0]} onChange={e => setNgayKetThuc(e.target.value)} /></div>
            <div className={["lhd-form-group", "lhd-display-120"].filter(Boolean).join(" ")} ><label className="lhd-label">Ghi chú hợp đồng</label><textarea className={["lhd-input", "lhd-display-121"].filter(Boolean).join(" ")} rows={3} placeholder="Nhập các thỏa thuận riêng hoặc yêu cầu đặc biệt..." value={ghiChu} onChange={e => setGhiChu(e.target.value)}  /></div>
          </div>
        </div>

        <div className={["lhd-display-102"].filter(Boolean).join(" ")}>
          <div className="lhd-card">
            <h4 className="lhd-card-title">
              <Icon name="electric_bolt" /> Dịch vụ đăng ký
            </h4>
            <div className={["service-select-grid", "lhd-display-122"].filter(Boolean).join(" ")} >
              {services.map(dv => {
                const isXe = isXeService(dv);
                const isSelected = !!selectedServices[dv.maDichVu];
                return (
                  <label key={dv.maDichVu} className={`service-select-card ${isSelected ? 'selected' : ''} ${dv.batBuoc ? 'compulsory' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={dv.batBuoc}
                      onChange={e => setSelectedServices({ ...selectedServices, [dv.maDichVu]: e.target.checked })}
                    />
                    <div className="service-card-info">
                      <div className="service-card-title">
                        {dv.tenDichVu} {dv.batBuoc && <span className="service-card-tag">Bắt buộc</span>}
                      </div>
                      <div className="service-card-desc">
                        {isXe && isSelected
                          ? <span className={["lhd-display-123"].filter(Boolean).join(" ")}>
                              Tổng: {(soXeGuiXe * dv.donGia)?.toLocaleString('vi-VN')}đ/tháng
                            </span>
                          : 'Áp dụng hợp đồng'
                        }
                      </div>
                    </div>
                    {isXe && isSelected ? (
                      <div className={["lhd-display-124"].filter(Boolean).join(" ")} onClick={e => e.preventDefault()}>
                        <div className={["lhd-display-125"].filter(Boolean).join(" ")}>
                          {dv.donGia?.toLocaleString('vi-VN')}đ / xe
                        </div>
                        <div className={["lhd-display-126"].filter(Boolean).join(" ")}>
                          <button
                            type="button"
                            onClick={() => setSoXeGuiXe(v => Math.max(1, v - 1))}
                            className={["lhd-display-127"].filter(Boolean).join(" ")}
                          >−</button>
                          <span className={["lhd-display-128"].filter(Boolean).join(" ")}>{soXeGuiXe}</span>
                          <button
                            type="button"
                            onClick={() => setSoXeGuiXe(v => Math.min(10, v + 1))}
                            className={["lhd-display-129"].filter(Boolean).join(" ")}
                          >+</button>
                        </div>
                        <div className={["lhd-display-130"].filter(Boolean).join(" ")}>xe gửi</div>
                      </div>
                    ) : (
                      <div className="service-card-price">
                        <div className="service-price-value">{dv.donGia?.toLocaleString('vi-VN')}đ</div>
                        <div className="service-price-unit">/ {dv.donViTinh}</div>
                      </div>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          <div className={["lhd-card", "lhd-display-131"].filter(Boolean).join(" ")} >
            <div className={["lhd-label", "lhd-display-016"].filter(Boolean).join(" ")} >THÀNH VIÊN CƯ TRÚ ({getContractMembers().length})</div>
            <div className={["lhd-display-132"].filter(Boolean).join(" ")}>
              {getContractMembers().map((tv, i) => (
                <div key={i} className={["lhd-display-091", i === 0 ? "lhd-display-133" : "lhd-display-042"].filter(Boolean).join(" ")}>{i + 1}. {tv.ten}</div>
              ))}
            </div>
          </div>

          <div className="lhd-capacity-card">
            <div className={["lhd-display-134"].filter(Boolean).join(" ")}>DỰ TÍNH PHÍ HÀNG THÁNG</div>
            <div className={["lhd-display-135"].filter(Boolean).join(" ")}>{totalPrice?.toLocaleString('vi-VN') || 0} VND</div>
            <div className={["lhd-display-136"].filter(Boolean).join(" ")}>* Đã bao gồm các dịch vụ đăng ký cố định</div>
          </div>
        </div>
      </div>
      <div className={["lhd-display-064"].filter(Boolean).join(" ")}>
        <button className="lhd-btn lhd-btn-outline" onClick={() => setStep(3)}><Icon name="arrow_back" /> Quay lại</button>
        <button className="lhd-btn lhd-btn-primary" onClick={() => setStep(5)}>Tiếp tục <Icon name="arrow_forward" /></button>
      </div>
    </div>
  );

  /* ─── STEP 5 ─── */
  if (step === 5) {
    const activeServices = services.filter(dv => selectedServices[dv.maDichVu]);
    const allTV = getContractMembers();

    return (
      <div className="lhd-container">
        <StepIndicator current={5} />

        {loading && <div className={["lhd-display-137"].filter(Boolean).join(" ")}>Đang lưu hợp đồng... Vui lòng đợi.</div>}

        <div className={["lhd-grid-2", "lhd-display-079"].filter(Boolean).join(" ")} >
          <div className={["lhd-display-102"].filter(Boolean).join(" ")}>
            <div className="lhd-card">
              <h4 className="lhd-card-title">
                <Icon name="description" /> Thông tin hợp đồng
              </h4>
              <div className={["lhd-grid-form", "lhd-display-116"].filter(Boolean).join(" ")} >
                {[{ l: 'Ngày lập', v: new Date(ngayKy).toLocaleDateString('vi-VN') },
                  { l: 'Chủ hợp đồng', v: selectedPhieu?.hoTenKhachHang, s: 'lg' },
                  { l: 'Căn hộ / Phòng', v: 'Phòng ' + selectedPhieu?.viTriThue, s: 'lg' },
                  { l: 'Thời hạn thuê', v: `${new Date(ngayBatDau).toLocaleDateString('vi-VN')} - ${new Date(ngayKetThuc).toLocaleDateString('vi-VN')}` },
                  { l: 'Giá thuê hàng tháng', v: basePrice?.toLocaleString('vi-VN') + ' VND', c: 'var(--lhd-secondary)', s: 'lg' }
                ].map((f, i) => (
                  <div key={i} className="lhd-form-group">
                    <div className={["lhd-label", "lhd-display-138"].filter(Boolean).join(" ")} >{f.l}</div>
                    <div className={["lhd-display-140", f.s === 'lg' ? "lhd-display-139" : "lhd-display-063", f.c ? "lhd-display-047" : "lhd-display-133"].filter(Boolean).join(" ")}>{f.v}</div>
                  </div>
                ))}
              </div>
              <div className={["lhd-display-141"].filter(Boolean).join(" ")}>
                <span className={["lhd-display-094"].filter(Boolean).join(" ")}>Khoản tiền cọc đã nhận:</span>
                <span className={["lhd-display-142"].filter(Boolean).join(" ")}>{selectedPhieu?.soTienCoc?.toLocaleString('vi-VN')} VND</span>
              </div>
              <div className={["lhd-display-143"].filter(Boolean).join(" ")}>
                <span className="lhd-badge lhd-badge-success">Đã thanh toán cọc</span>
              </div>
            </div>

            <div className="lhd-card">
              <h4 className="lhd-card-title">
                <Icon name="description" /> Thành viên & Dịch vụ
              </h4>
              <div className={["lhd-display-144"].filter(Boolean).join(" ")}>
                <div className={["lhd-label", "lhd-display-016"].filter(Boolean).join(" ")} >DỊCH VỤ ĐĂNG KÝ</div>
                <div className={["lhd-display-145"].filter(Boolean).join(" ")}>
                  {activeServices.map(dv => (
                    <span key={dv.maDichVu} className={["lhd-badge lhd-badge-success", "lhd-display-146"].filter(Boolean).join(" ")} >
                      <Icon name={getServiceIcon(dv.tenDichVu)} className={["lhd-display-063"].filter(Boolean).join(" ")} />
                      {dv.tenDichVu} ({dv.donGia?.toLocaleString('vi-VN')}đ)
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className={["lhd-label", "lhd-display-016"].filter(Boolean).join(" ")} >THÀNH VIÊN CƯ TRÚ ({allTV.length})</div>
                <div className={["lhd-display-147"].filter(Boolean).join(" ")}>
                  {allTV.map((tv, i) => (
                    <div key={i} className={["lhd-display-148"].filter(Boolean).join(" ")}>
                      <div className={["lhd-display-151", i === 0 ? "lhd-display-149" : "lhd-display-150"].filter(Boolean).join(" ")}>
                        {tv.ten?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className={["lhd-display-152"].filter(Boolean).join(" ")}>{tv.ten}</div>
                        <div className={["lhd-display-153"].filter(Boolean).join(" ")}>{tv.vaiTro}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className={["lhd-display-154"].filter(Boolean).join(" ")}>
            <div className="lhd-card">
              <h4 className="lhd-card-title">
                <Icon name="fact_check" /> Xác nhận hợp đồng
              </h4>

              <div className={["lhd-display-155"].filter(Boolean).join(" ")}>
                <label className={["lhd-display-156"].filter(Boolean).join(" ")}>
                  <input type="checkbox" checked={confirmKH} onChange={e => setConfirmKH(e.target.checked)} className={["lhd-display-157"].filter(Boolean).join(" ")} />
                  <span className={["lhd-display-158"].filter(Boolean).join(" ")}>Khách hàng đã kiểm tra thông tin và đồng ý ký hợp đồng</span>
                </label>
                <label className={["lhd-display-156"].filter(Boolean).join(" ")}>
                  <input type="checkbox" checked={confirmNV} onChange={e => setConfirmNV(e.target.checked)} className={["lhd-display-157"].filter(Boolean).join(" ")} />
                  <span className={["lhd-display-158"].filter(Boolean).join(" ")}>Nhân viên Sale xác nhận thông tin hợp đồng là chính xác</span>
                </label>
              </div>
              <button
                onClick={handleLuu}
                disabled={!confirmKH || !confirmNV || loading}
                className={["lhd-btn lhd-btn-primary", "lhd-display-159"].filter(Boolean).join(" ")}

              >
                <Icon name="save" /> {loading ? 'Đang xử lý...' : 'Lập hợp đồng thuê'}
              </button>
              <button onClick={() => setStep(4)} className={["lhd-btn lhd-btn-outline", "lhd-display-160"].filter(Boolean).join(" ")} ><Icon name="arrow_back" /> Quay lại</button>
              <button onClick={handleReset} className={["lhd-btn-text-danger", "lhd-display-161"].filter(Boolean).join(" ")} ><Icon name="delete" /> Hủy lập hợp đồng</button>
              <div className={["lhd-display-162"].filter(Boolean).join(" ")}>
                <span className={["lhd-display-163"].filter(Boolean).join(" ")}></span>
                Dữ liệu đã được kiểm chứng trên hệ thống
              </div>
            </div>
          </div>
        </div>

        {/* Modal thanh cong */}
        {showSuccessModal && savedHD && (
          <div className="ktp-modal-overlay">
            <div className="lhd-success-modal">
              <div className="lhd-success-icon-wrap"><Icon name="check" className={["lhd-display-164"].filter(Boolean).join(" ")} /></div>
              <h3 className="lhd-success-title">Lập hợp đồng thuê thành công</h3>
              <p className="lhd-success-text">Hệ thống đã ghi nhận và lưu trữ thông tin hợp đồng vào cơ sở dữ liệu.</p>
              <div className={["lhd-display-165"].filter(Boolean).join(" ")}>
                {[{ label: 'MÃ HỢP ĐỒNG', value: savedHD.maHopDong, bold: true }, { label: 'KHÁCH HÀNG', value: savedHD.benThue }, { label: 'PHÒNG', value: savedHD.tenPhongDayDu }, { label: 'TRẠNG THÁI', badge: savedHD.trangThaiKy }].map((row, i) => (
                  <div key={i} className={["lhd-display-166"].filter(Boolean).join(" ")}>
                    <span className={["lhd-label", "lhd-display-167"].filter(Boolean).join(" ")} >{row.label}</span>
                    {row.badge ? <span className="lhd-badge lhd-badge-success">{row.badge}</span> : <span className={["lhd-display-133", row.bold ? "lhd-display-021" : "lhd-display-168"].filter(Boolean).join(" ")}>{row.value}</span>}
                  </div>
                ))}
              </div>
              <div className={["lhd-display-169"].filter(Boolean).join(" ")}>
                <button onClick={handleReset} className={["lhd-btn lhd-btn-outline", "lhd-display-170"].filter(Boolean).join(" ")} ><Icon name="arrow_back" /> Quay lại</button>
                <button onClick={() => { setShowSuccessModal(false); setShowChiTiet(true); }} className={["lhd-btn lhd-btn-primary", "lhd-display-170"].filter(Boolean).join(" ")} ><Icon name="description" /> Xem hợp đồng</button>
              </div>
            </div>
          </div>
        )}

        {renderChiTietModal()}
      </div>
    );
  }

  return null;
}
