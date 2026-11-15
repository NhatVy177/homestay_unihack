import OverviewCards from '../../components/common/OverviewCards.jsx';
import DoiChieuTraPhong from '../../components/traPhong/DoiChieuTraPhong.jsx';
import React, { useEffect, useMemo, useState } from 'react';

const PAGE_SIZE = 10;
import { Icon } from '../../components/common/Icon.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import ListSearch from '../../components/common/ListSearch.jsx';
import ListPagination from '../../components/common/ListPagination.jsx';
import TableState from '../../components/common/TableState.jsx';
import './quyetToanTraPhong.css';
import { doiSoatApi } from './doiSoat.api.js';
import StatusFilterTabs from '../../components/common/StatusFilterTabs.jsx';

const LOAI_HO_SO = {
  HOP_DONG_THUE: 'HOP_DONG_THUE',
  DAT_COC_CHUA_KY_HOP_DONG: 'DAT_COC_CHUA_KY_HOP_DONG'
};

const QUYET_TOAN_TABS = [
  { id: 'lap-doi-soat', label: 'Lập phiếu đối soát', group: 'doi-soat' },
  { id: 'ghi-nhan-thu-them', label: 'Ghi nhận thu thêm', group: 'chi-tien' },
  { id: 'ghi-nhan-hoan-coc', label: 'Ghi nhận hoàn cọc', group: 'chi-tien' },
  { id: 'ket-qua-doi-soat', label: 'Kết quả đối soát', group: 'doi-soat' }
];

const THU_THEM_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'can-ghi-nhan', label: 'Cần ghi nhận' },
  { key: 'cho-xac-nhan', label: 'Chờ xác nhận' }
];

const THU_THEM_FILTER_META = {
  all: {
    title: 'Tất cả phiếu thu thêm',
    subtitle: 'Bao gồm phiếu cần kế toán ghi nhận và phiếu đã có thông tin thanh toán chờ xác nhận.',
    empty: 'Chưa có phiếu thu thêm cần xử lý.',
    summary: 'phiếu thu thêm'
  },
  'can-ghi-nhan': {
    title: 'Cần ghi nhận thu thêm',
    subtitle: 'Phiếu thu thêm chưa có phương thức thanh toán, cần kế toán ghi nhận.',
    empty: 'Chưa có phiếu thu thêm cần ghi nhận.',
    summary: 'phiếu cần ghi nhận'
  },
  'cho-xac-nhan': {
    title: 'Chờ xác nhận thu thêm',
    subtitle: 'Phiếu thu thêm đã có phương thức thanh toán, chờ kế toán xác nhận.',
    empty: 'Chưa có phiếu thu thêm chờ xác nhận.',
    summary: 'phiếu chờ xác nhận'
  }
};

const KET_QUA_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'thu-them', label: 'Thu thêm' },
  { key: 'hoan-coc', label: 'Hoàn cọc' },
  { key: 'khong-phat-sinh', label: 'Không phát sinh' }
];

const DEFAULT_SERVICE_FALLBACKS = [
  { maDichVu: 'fallback-dien', tenDichVu: 'Điện', donViTinh: 'kWh', donGia: 4000 },
  { maDichVu: 'fallback-nuoc', tenDichVu: 'Nước', donViTinh: 'm3', donGia: 18000 },
  { maDichVu: 'fallback-wifi', tenDichVu: 'Wifi', donViTinh: 'tháng', donGia: 100000 },
  { maDichVu: 'fallback-gui-xe', tenDichVu: 'Gửi xe', donViTinh: 'tháng', donGia: 150000 },
  { maDichVu: 'fallback-ve-sinh', tenDichVu: 'Vệ sinh', donViTinh: 'tháng', donGia: 80000 }
];

function hasPaymentMethod(row) {
  return String(row?.phuongThucThanhToan || '').trim() !== '';
}

function hasPaymentProof(row) {
  return String(row?.chungTuThanhToan || '').trim() !== '';
}

function isTransferPayment(row) {
  return String(row?.phuongThucThanhToan || '').trim() === 'Chuyển khoản';
}

function isReadyForThuThemConfirmation(row) {
  return hasPaymentMethod(row) && (!isTransferPayment(row) || hasPaymentProof(row));
}

function needsThuThemProof(row) {
  return hasPaymentMethod(row) && isTransferPayment(row) && !hasPaymentProof(row);
}

function matchesThuThemFilter(row, filter) {
  if (filter === 'cho-xac-nhan') return isReadyForThuThemConfirmation(row);
  if (filter === 'can-ghi-nhan') return !isReadyForThuThemConfirmation(row);
  return true;
}

function getLapDoiSoatState(row) {
  if (row?.trangThaiDoiSoat === 'Cần điều chỉnh') return 'needs-adjustment';
  if (!row?.daDoiSoat) return 'pending';
  return 'completed';
}

function getLapDoiSoatStatusLabel(row) {
  const state = getLapDoiSoatState(row);
  if (state === 'needs-adjustment') return 'Cần điều chỉnh';
  if (state === 'pending') return 'Chờ đối soát';
  return 'Đã đối soát';
}

function getLapDoiSoatStatusTone(row) {
  const state = getLapDoiSoatState(row);
  if (state === 'needs-adjustment') return 'info';
  if (state === 'pending') return 'warning';
  return 'success';
}

function getDoiSoatStatusTone(status) {
  const normalized = String(status || '').trim();
  if (normalized === 'Cần điều chỉnh') return 'info';
  if (normalized.startsWith('Đã') || normalized === 'Hoàn tất') return 'success';
  return 'warning';
}

function safeNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const normalized = String(value).replaceAll(',', '');
  const number = Number(normalized);
  return Number.isNaN(number) ? 0 : number;
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = toDate(value);
  if (!date) return '--';
  return date.toLocaleDateString('vi-VN');
}

function formatMoney(value) {
  return `${Math.round(safeNumber(value)).toLocaleString('vi-VN')}đ`;
}

function isZeroMoneyText(value) {
  return String(value ?? '').trim() === '0đ';
}

function moneyToneClass(tone, value) {
  if (isZeroMoneyText(value)) return 'qt-money qt-money--zero';
  if (tone === 'collect') return 'qt-money qt-money--collect';
  if (tone === 'success') return 'qt-money qt-money--success';
  if (tone === 'deduction') return 'qt-money qt-money--deduction';
  if (tone === 'primary' || tone === 'group') return 'qt-money qt-money--primary';
  return 'qt-money';
}

function evidenceHref(value) {
  if (!value) return '';
  const text = String(value);
  if (/^https?:\/\//i.test(text)) return text;
  if (text.startsWith('/uploads')) {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return `${apiBase.replace(/\/api\/?$/, '')}${text}`;
  }
  return text;
}

function makeLineKey(prefix, ...parts) {
  return [prefix, ...parts.map((part) => part ?? '')].join(':');
}

function hasLineValues(values) {
  return values && Object.keys(values).length > 0;
}

function sumLineValues(values) {
  return Object.values(values || {}).reduce((total, value) => total + safeNumber(value), 0);
}

function getFallbackServiceSources(chiTietKhauTru, total) {
  const contractServices = (chiTietKhauTru?.dichVuHopDong || [])
    .filter((service) => service?.tenDichVu || service?.maDichVu);

  if (contractServices.length > 0) return contractServices;
  return safeNumber(total) > 0 ? DEFAULT_SERVICE_FALLBACKS : [];
}

function getServiceSourceKey(service, index) {
  return makeLineKey(
    'service-contract',
    service?.maChiTietDVHD || service?.maDichVu || service?.tenDichVu || index
  );
}

function distributeServiceTotal(total, services) {
  const amount = safeNumber(total);
  if (amount <= 0 || services.length === 0) return {};

  const weights = services.map((service) => safeNumber(service.donGia));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  const values = {};
  let assigned = 0;

  services.forEach((service, index) => {
    const key = getServiceSourceKey(service, index);
    const lineAmount = index === services.length - 1
      ? amount - assigned
      : totalWeight > 0
        ? Math.round((amount * weights[index]) / totalWeight)
        : Math.floor(amount / services.length);

    values[key] = lineAmount;
    assigned += lineAmount;
  });

  return values;
}

function getLineAmount(values, key, fallback) {
  return values?.[key] ?? safeNumber(fallback);
}

function buildInitialDeductionValues(data) {
  const chiTietKhauTru = data?.chiTietKhauTru || {};
  const hoaDonConNo = chiTietKhauTru.hoaDonConNo || chiTietKhauTru.tienThueConNo || [];
  const chiTietHoaDon = chiTietKhauTru.chiTietHoaDon || [];
  const bienBanKiemTra = chiTietKhauTru.bienBanKiemTra || [];
  const chiTietHuHong = chiTietKhauTru.chiTietHuHong || [];
  const bienBanViPham = chiTietKhauTru.bienBanViPham || [];
  const tienDichVuConNoMacDinh = safeNumber(data?.doiSoat?.tienDichVuConNo ?? data?.macDinhKhauTru?.tienDichVuConNo);

  const rentLines = {};
  const serviceLines = {};
  const repairLines = {};
  const penaltyLines = {};

  hoaDonConNo.forEach((hoaDon) => {
    const key = makeLineKey('rent', hoaDon.maHoaDon, hoaDon.maHopDong, hoaDon.kyThanhToan);
    rentLines[key] = safeNumber(hoaDon.thanhTien);
  });

  if (chiTietHoaDon.length > 0) {
    chiTietHoaDon.forEach((line) => {
      const key = makeLineKey('service', line.maChiTietHD, line.maHoaDon);
      serviceLines[key] = safeNumber(line.thanhTien);
    });
  } else {
    Object.assign(
      serviceLines,
      distributeServiceTotal(
        tienDichVuConNoMacDinh,
        getFallbackServiceSources(chiTietKhauTru, tienDichVuConNoMacDinh)
      )
    );
  }

  bienBanKiemTra.forEach((bienBan) => {
    const damages = chiTietHuHong.filter((item) => item.maBienBanKT === bienBan.maBienBanKT);
    if (damages.length === 0) {
      const key = makeLineKey('repair-report', bienBan.maBienBanKT);
      repairLines[key] = safeNumber(bienBan.tongChiPhiSuaChua);
    }
  });

  chiTietHuHong.forEach((damage) => {
    const key = makeLineKey('repair', damage.maChiTietHH, damage.maBienBanKT);
    repairLines[key] = safeNumber(damage.chiPhiSuaChua);
  });

  bienBanViPham.forEach((viPham) => {
    const key = makeLineKey('penalty', viPham.maBBViPham);
    penaltyLines[key] = safeNumber(viPham.soTienPhat);
  });

  return {
    rentLines,
    serviceLines,
    repairLines,
    penaltyLines
  };
}

function buildFormFromDeductionValues(defaults, deductionValues) {
  return {
    tienThueConNo: hasLineValues(deductionValues.rentLines)
      ? sumLineValues(deductionValues.rentLines)
      : safeNumber(defaults?.tienThueConNo),
    tienDichVuConNo: hasLineValues(deductionValues.serviceLines)
      ? sumLineValues(deductionValues.serviceLines)
      : safeNumber(defaults?.tienDichVuConNo),
    tongChiPhiSuaChua: hasLineValues(deductionValues.repairLines)
      ? sumLineValues(deductionValues.repairLines)
      : safeNumber(defaults?.tongChiPhiSuaChua),
    tienPhat: hasLineValues(deductionValues.penaltyLines)
      ? sumLineValues(deductionValues.penaltyLines)
      : safeNumber(defaults?.tienPhat),
    ghiChuPhanHoiKhach: ''
  };
}

function buildAdjustmentDefaults(doiSoat) {
  if (!doiSoat) return null;

  return {
    tienThueConNo: safeNumber(doiSoat.tienThueConNo),
    tienDichVuConNo: safeNumber(doiSoat.tienDichVuConNo),
    tongChiPhiSuaChua: safeNumber(doiSoat.tongChiPhiSuaChua),
    tienPhat: safeNumber(doiSoat.tienPhat),
    ghiChuPhanHoiKhach: doiSoat.ghiChuPhanHoiKhach || ''
  };
}

function buildRepairAdjustmentPayload(detail, deductionValues) {
  const chiTietKhauTru = detail?.chiTietKhauTru || {};
  const bienBanKiemTra = chiTietKhauTru.bienBanKiemTra || [];
  const chiTietHuHong = chiTietKhauTru.chiTietHuHong || [];

  return bienBanKiemTra.flatMap((bienBan) => {
    const damages = chiTietHuHong.filter((item) => item.maBienBanKT === bienBan.maBienBanKT);
    if (damages.length === 0) {
      const key = makeLineKey('repair-report', bienBan.maBienBanKT);
      return [{
        maBienBanKT: bienBan.maBienBanKT,
        tongChiPhiSuaChua: getLineAmount(deductionValues.repairLines, key, bienBan.tongChiPhiSuaChua)
      }];
    }

    return damages.map((damage) => {
      const key = makeLineKey('repair', damage.maChiTietHH, damage.maBienBanKT);
      return {
        maBienBanKT: damage.maBienBanKT,
        maChiTietHH: damage.maChiTietHH,
        chiPhiSuaChua: getLineAmount(deductionValues.repairLines, key, damage.chiPhiSuaChua)
      };
    });
  });
}

function calculateStayMonths(startDateValue, returnDateValue) {
  const startDate = toDate(startDateValue);
  const returnDate = toDate(returnDateValue);
  if (!startDate || !returnDate) return 0;

  let months =
    (returnDate.getFullYear() - startDate.getFullYear()) * 12 +
    (returnDate.getMonth() - startDate.getMonth());

  if (returnDate.getDate() > startDate.getDate()) {
    months += 1;
  }

  return months <= 0 ? 1 : months;
}

function calculatePreview(detail, form) {
  if (!detail) return null;

  const doiSoat = detail.doiSoat || {};
  const tienCocBanDau = safeNumber(doiSoat.tienCocBanDau)
    || safeNumber(detail.hopDong?.soTienCoc ?? detail.phieuDatCoc?.soTienCoc);
  const tienThueConNo = safeNumber(form.tienThueConNo);
  const tienDichVuConNo = safeNumber(form.tienDichVuConNo);
  const tongChiPhiSuaChua = safeNumber(form.tongChiPhiSuaChua);
  const tienPhat = safeNumber(form.tienPhat);
  let soThangLuuTru = safeNumber(doiSoat.soThangLuuTru);
  let tyLeHoanCocHienTai = doiSoat.tyLeHoanCocHienTai !== undefined && doiSoat.tyLeHoanCocHienTai !== null
    ? safeNumber(doiSoat.tyLeHoanCocHienTai)
    : 80;

  if (!detail.doiSoat && Number.isFinite(Number(detail.tinhToanTam?.tyLeHoanCocHienTai))) {
    // D-040: the backend reads the rate from the policy locked on the deposit slip; show the same number.
    tyLeHoanCocHienTai = safeNumber(detail.tinhToanTam.tyLeHoanCocHienTai);
    soThangLuuTru = safeNumber(detail.tinhToanTam.soThangLuuTru);
  } else if (!detail.doiSoat) {
    if (detail.loaiHoSo === LOAI_HO_SO.HOP_DONG_THUE) {
      soThangLuuTru = calculateStayMonths(
        detail.hopDong?.ngayBatDau,
        detail.phieuTraPhong?.ngayTraThucTe
      );
      const ngayTraThucTe = toDate(detail.phieuTraPhong?.ngayTraThucTe);
      const ngayKetThuc = toDate(detail.hopDong?.ngayKetThuc);

      if (ngayTraThucTe && ngayKetThuc && ngayTraThucTe >= ngayKetThuc) {
        tyLeHoanCocHienTai = 100;
      } else if (soThangLuuTru < 6) {
        tyLeHoanCocHienTai = 50;
      } else {
        tyLeHoanCocHienTai = 70;
      }
    }
  }

  const tienCocDuocHoan = Math.round(tienCocBanDau * tyLeHoanCocHienTai / 100);
  const tongKhauTru = Math.round(tienThueConNo + tienDichVuConNo + tongChiPhiSuaChua + tienPhat);
  const chenhLech = tienCocDuocHoan - tongKhauTru;

  return {
    tienCocBanDau,
    soThangLuuTru,
    tyLeHoanCocHienTai,
    tienCocDuocHoan,
    tienThueConNo,
    tienDichVuConNo,
    tongChiPhiSuaChua,
    tienPhat,
    tongKhauTru,
    soTienHoanThucTe: chenhLech > 0 ? chenhLech : 0,
    soTienKhachPhaiTT: chenhLech < 0 ? Math.abs(chenhLech) : 0
  };
}

function resultText(result) {
  if (!result) return '--';
  if (result.soTienHoanThucTe > 0) return 'Khách được hoàn cọc';
  if (result.soTienKhachPhaiTT > 0) return 'Khách phải thanh toán thêm';
  return 'Không hoàn cọc và không thu thêm';
}



function InfoRow({ label, value, strong = false }) {
  return (
    <div className="ktp-info-row">
      <span className="ktp-info-label">{label}</span>
      <span className={`ktp-info-value${strong ? ' qt-info-strong' : ''}`}>
        {value ?? '--'}
      </span>
    </div>
  );
}

function SourceLine({ title, meta, amount, editing = false, editValue, onAmountChange, autoFocus = false }) {
  const canEdit = editing && typeof onAmountChange === 'function';
  const amountText = formatMoney(amount);

  return (
    <div className={`qt-source-line${canEdit ? ' is-editing' : ''}`}>
      <div>
        <p className="qt-source-title">{title}</p>
        {meta && <p className="qt-source-meta">{meta}</p>}
      </div>
      {canEdit ? (
        <input
          className="ktp-input qt-line-amount-input"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={safeNumber(editValue ?? amount)}
          onChange={(event) => onAmountChange(event.target.value)}
          autoFocus={autoFocus}
        />
      ) : (
        <strong className={`qt-source-amount${isZeroMoneyText(amountText) ? ' is-zero' : ''}`}>
          {amountText}
        </strong>
      )}
    </div>
  );
}

function EmptySource({ children }) {
  return null;
}

function SummaryLine({ label, value, tone = 'normal' }) {
  return (
    <div className="qt-summary-line">
      <span>{label}</span>
      <strong className={moneyToneClass(tone, value)}>{value}</strong>
    </div>
  );
}

function AdjustmentRequestBox({ value }) {
  return (
    <section className="ktp-section qt-adjustment-request">
      <h4 className="ktp-section-title qt-adjustment-title">
        <Icon name="feedback" /> Yêu cầu điều chỉnh của khách hàng
      </h4>
      <p className="qt-adjustment-text">
        {value || '(Khách hàng chưa nhập nội dung phản hồi)'}
      </p>
    </section>
  );
}

function KhauTruPanel({ title, value, children, editing, onEdit, onDone, readOnly = false }) {
  const totalText = formatMoney(value);
  return (
    <div className="qt-deduction-card">
      <div className="qt-deduction-head">
        <div>
          <h5>{title}</h5>
          <strong className={moneyToneClass('group', totalText)}>{totalText}</strong>
        </div>
        {!readOnly && (
          <button
            className={`qt-icon-btn${editing ? ' is-active' : ''}`}
            type="button"
            onClick={editing ? onDone : onEdit}
            title={editing ? 'Xong' : 'Sửa khoản này'}
            aria-label={editing ? 'Xong' : `Sửa ${title}`}
          >
            <Icon name={editing ? 'check' : 'edit_note'} />
          </button>
        )}
      </div>
      <div className="qt-deduction-lines">
        {children}
      </div>
    </div>
  );
}

function EvidenceValue({ value }) {
  if (!value) return '--';
  const href = evidenceHref(value);
  return (
    <a className="qt-evidence-link" href={href} target="_blank" rel="noreferrer">
      <Icon name="visibility" />
      <span>Xem chứng từ</span>
    </a>
  );
}

function parseRefundAccountInfo(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const parts = raw.split(';').map((part) => part.trim()).filter(Boolean);
  const data = {};

  parts.forEach((part) => {
    const [label, ...rest] = part.split(':');
    const key = String(label || '').trim().toLowerCase();
    const text = rest.join(':').trim();
    if (!text) return;

    if (key.includes('chủ') || key.includes('chu')) data.chuTaiKhoan = text;
    else if (key.includes('số') || key.includes('so')) data.soTaiKhoan = text;
    else if (key.includes('ngân') || key.includes('ngan')) data.nganHang = text;
  });

  if (!data.chuTaiKhoan && !data.soTaiKhoan && !data.nganHang) {
    return { raw };
  }

  return data;
}

function RefundAccountCard({ value }) {
  const info = parseRefundAccountInfo(value);
  if (!info) return null;

  if (info.raw) {
    return <div className="qt-refund-account-card is-raw">{info.raw}</div>;
  }

  return (
    <div className="qt-refund-account-card">
      <div className="qt-refund-account-head">
        <span><Icon name="account_balance_wallet" /></span>
        <div>
          <strong>Tài khoản nhận hoàn cọc</strong>
          <small>Thông tin do khách hàng cung cấp</small>
        </div>
      </div>
      <div className="qt-refund-account-grid">
        <div>
          <span>Chủ tài khoản</span>
          <strong>{info.chuTaiKhoan || '--'}</strong>
        </div>
        <div>
          <span>Số tài khoản</span>
          <strong className="is-account-number">{info.soTaiKhoan || '--'}</strong>
        </div>
        <div>
          <span>Ngân hàng</span>
          <strong>{info.nganHang || '--'}</strong>
        </div>
      </div>
    </div>
  );
}

function ketQuaMeta(row) {
  if (row?.ketQuaDoiSoat === 'hoan-coc') {
    return {
      label: 'Hoàn cọc',
      badgeClass: 'is-refund',
      amount: row.soTienHoanThucTe,
      amountTone: 'qt-money qt-money--success'
    };
  }

  if (row?.ketQuaDoiSoat === 'thu-them' || safeNumber(row?.soTienKhachPhaiTT) > 0) {
    return {
      label: 'Thu thêm',
      badgeClass: 'is-collect',
      amount: row.soTienKhachPhaiTT,
      amountTone: 'qt-money qt-money--collect'
    };
  }

  return {
    label: 'Không phát sinh',
    badgeClass: 'is-neutral',
    amount: 0,
    amountTone: 'qt-money'
  };
}

function ketQuaFilterKey(row) {
  if (row?.ketQuaDoiSoat === 'hoan-coc' || safeNumber(row?.soTienHoanThucTe) > 0) {
    return 'hoan-coc';
  }

  if (row?.ketQuaDoiSoat === 'thu-them' || safeNumber(row?.soTienKhachPhaiTT) > 0) {
    return 'thu-them';
  }

  return 'khong-phat-sinh';
}

function formatFileSize(bytes) {
  const size = safeNumber(bytes);
  if (size <= 0) return '';
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',').pop() : result);
    };
    reader.onerror = () => reject(new Error('Không đọc được file chứng từ.'));
    reader.readAsDataURL(file);
  });
}

function ChungTuUpload({ evidence, onFileSelect, onRemove }) {
  const inputId = 'qt-chung-tu-upload';
  const hasFile = Boolean(evidence?.name);
  const isImage = Boolean(evidence?.type?.startsWith('image/') && evidence?.previewUrl);

  function handleFiles(files) {
    const file = files?.[0];
    if (file) onFileSelect(file);
  }

  return (
    <div
      className={`qt-proof-upload${hasFile ? ' has-file' : ''}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        handleFiles(event.dataTransfer.files);
      }}
    >
      <input
        id={inputId}
        className="qt-proof-input"
        type="file"
        accept="image/*,.pdf"
        onChange={(event) => handleFiles(event.target.files)}
      />

      {hasFile ? (
        <div className="qt-proof-file">
          <div className="qt-proof-preview">
            {isImage ? (
              <img src={evidence.previewUrl} alt="Minh chứng thanh toán" />
            ) : (
              <Icon name="description" />
            )}
          </div>
          <div className="qt-proof-meta">
            <strong>{evidence.name}</strong>
            <span>{evidence.type || 'Tệp chứng từ'}{evidence.size ? ` · ${formatFileSize(evidence.size)}` : ''}</span>
          </div>
          <button type="button" className="qt-proof-remove" onClick={onRemove} aria-label="Bỏ chứng từ">
            <Icon name="close" />
          </button>
        </div>
      ) : (
        <label className="qt-proof-empty" htmlFor={inputId}>
          <span className="qt-proof-icon"><Icon name="upload_file" /></span>
          <span>
            <strong>Tải ảnh chứng từ lên</strong>
            <small>Chọn ảnh/PDF hoặc kéo thả vào đây</small>
          </span>
        </label>
      )}
    </div>
  );
}

function GhiNhanThanhToanPanel({ type }) {
  const isThuThem = type === 'thu-them';
  const title = isThuThem ? 'Ghi nhận thu thêm' : 'Ghi nhận hoàn cọc';
  const amountLabel = isThuThem ? 'Số tiền thu thêm' : 'Số tiền hoàn cọc';
  const actionTitle = isThuThem ? 'Ghi nhận thu thêm' : 'Ghi nhận hoàn cọc';
  const amountField = isThuThem ? 'soTienKhachPhaiTT' : 'soTienHoanThucTe';
  const submitLabel = isThuThem ? 'Xác nhận thu thêm' : 'Xác nhận hoàn cọc';
  const emptyText = isThuThem
    ? 'Chưa có phiếu cần ghi nhận thu thêm.'
    : 'Chưa có phiếu cần ghi nhận hoàn cọc.';
  const [pendingRows, setPendingRows] = useState([]);
  const [thuThemFilter, setThuThemFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [loadingRows, setLoadingRows] = useState(false);
  const [localMessage, setLocalMessage] = useState('');
  const [localError, setLocalError] = useState('');
  const [modalError, setModalError] = useState(''); // lỗi khi ghi nhận: hiện ngay trong hộp thoại, không hiện ở đầu trang
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [refundDetail, setRefundDetail] = useState(null);
  const [refundRooms, setRefundRooms] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [refundForm, setRefundForm] = useState({
    phuongThucThanhToan: '',
    ngayThanhToan: new Date().toISOString().slice(0, 10),
    chungTuThanhToan: ''
  });
  const [refundEvidence, setRefundEvidence] = useState(null);

  async function loadRows() {
    setLoadingRows(true);
    setLocalError('');
    try {
      const pendingResponse = isThuThem
        ? await doiSoatApi.getDanhSachChoThuThem('all')
        : await doiSoatApi.getDanhSachChoHoanCoc();
      setPendingRows(pendingResponse.data.danhSach || []);
    } catch (err) {
      setLocalError(err.response?.data?.message || `Không tải được danh sách phiếu ${isThuThem ? 'thu thêm' : 'hoàn cọc'}.`);
    } finally {
      setLoadingRows(false);
    }
  }

  useEffect(() => {
    loadRows();
  }, [isThuThem]);

  useEffect(() => {
    return () => {
      if (refundEvidence?.previewUrl) {
        URL.revokeObjectURL(refundEvidence.previewUrl);
      }
    };
  }, [refundEvidence?.previewUrl]);

  function filterRows(sourceRows) {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return sourceRows;

    return sourceRows.filter((row) =>
      row.maDoiSoat?.toLowerCase().includes(keyword) ||
      row.maPhieuTra?.toLowerCase().includes(keyword) ||
      row.maHoSo?.toLowerCase().includes(keyword) ||
      row.hoTenKhachHang?.toLowerCase().includes(keyword) ||
      row.sdtKhachHang?.toLowerCase().includes(keyword)
    );
  }

  const searchedPendingRows = useMemo(() => filterRows(pendingRows), [pendingRows, searchText]);
  const thuThemCounts = useMemo(() => ({
    all: searchedPendingRows.length,
    'can-ghi-nhan': searchedPendingRows.filter((row) => !isReadyForThuThemConfirmation(row)).length,
    'cho-xac-nhan': searchedPendingRows.filter((row) => isReadyForThuThemConfirmation(row)).length
  }), [searchedPendingRows]);
  const thuThemFilters = useMemo(() => THU_THEM_FILTERS.map((filter) => ({
    ...filter,
    count: thuThemCounts[filter.key] ?? 0
  })), [thuThemCounts]);
  const filteredPendingRows = useMemo(() => {
    if (!isThuThem) return searchedPendingRows;
    return searchedPendingRows.filter((row) => matchesThuThemFilter(row, thuThemFilter));
  }, [isThuThem, searchedPendingRows, thuThemFilter]);
  const displayedRows = useMemo(() => {
    return filteredPendingRows.map((row) => ({ ...row, _settlementMode: 'pending' }));
  }, [filteredPendingRows]);

  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [searchText, thuThemFilter, type]);
  const activeThuThemFilterMeta = THU_THEM_FILTER_META[thuThemFilter] || THU_THEM_FILTER_META.all;
  const currentProof = String(refundForm.chungTuThanhToan || refundDetail?.chungTuThanhToan || '').trim();
  const recordedThuThemPaymentMethod = isThuThem
    ? String(refundDetail?.phuongThucThanhToan || selectedRefund?.phuongThucThanhToan || '').trim()
    : '';
  const thuThemPaymentMethodLocked = Boolean(
    selectedRefund &&
    selectedRefund._viewMode !== 'completed' &&
    isThuThem &&
    recordedThuThemPaymentMethod
  );
  const thuThemPaymentDateLocked = Boolean(
    thuThemPaymentMethodLocked &&
    refundForm.phuongThucThanhToan === 'Chuyển khoản' &&
    currentProof &&
    refundDetail?.ngayThanhToan
  );
  const showPaymentEvidenceUpload = !isThuThem
    || !currentProof
    || refundForm.phuongThucThanhToan === 'Tiền mặt'
    || (!thuThemPaymentMethodLocked && refundForm.phuongThucThanhToan === 'Chuyển khoản');
  const canRejectThuThemProof = Boolean(
    selectedRefund &&
    selectedRefund._viewMode !== 'completed' &&
    isThuThem &&
    refundForm.phuongThucThanhToan === 'Chuyển khoản' &&
    currentProof &&
    !refundEvidence?.file
  );

  async function openRefundModal(row, mode = 'pending') {
    const isCompleted = mode === 'completed';
    setModalError('');
    setSelectedRefund({ ...row, _viewMode: mode });
    setRefundDetail(null);
    setRefundRooms([]);
    setLocalError('');
    setLocalMessage('');
    setRefundForm({
      phuongThucThanhToan: row.phuongThucThanhToan || '',
      ngayThanhToan: isCompleted && row.ngayThanhToan
        ? new Date(row.ngayThanhToan).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      chungTuThanhToan: row.chungTuThanhToan || ''
    });
    setRefundEvidence(null);
    setLoadingDetail(true);

    try {
      const response = isThuThem
        ? await doiSoatApi.getChiTietThuThem(row.maDoiSoat)
        : await doiSoatApi.getChiTietHoanCoc(row.maDoiSoat);
      setRefundDetail(response.data.chiTiet);
      setRefundRooms(response.data.danhSachPhong || []);
      setRefundForm((prev) => ({
        ...prev,
        phuongThucThanhToan: response.data.chiTiet?.phuongThucThanhToan || row.phuongThucThanhToan || '',
        ngayThanhToan: response.data.chiTiet?.ngayThanhToan
          ? new Date(response.data.chiTiet.ngayThanhToan).toISOString().slice(0, 10)
          : prev.ngayThanhToan,
        chungTuThanhToan: response.data.chiTiet?.chungTuThanhToan || row.chungTuThanhToan || prev.chungTuThanhToan
      }));
    } catch (err) {
      setLocalError(err.response?.data?.message || `Không tải được chi tiết ${isThuThem ? 'thu thêm' : 'hoàn cọc'}.`);
      setSelectedRefund(null);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function submitRefund() {
    if (!selectedRefund) return;
    if (!refundForm.phuongThucThanhToan) {
      setLocalError(isThuThem ? 'Vui lòng chọn phương thức thanh toán.' : 'Khách chưa chọn phương thức hoàn tiền.');
      return;
    }
    if (!refundForm.ngayThanhToan) {
      setLocalError('Vui lòng chọn ngày thanh toán.');
      return;
    }
    if (isThuThem && refundForm.phuongThucThanhToan === 'Chuyển khoản' && !refundEvidence?.file && !refundForm.chungTuThanhToan) {
      setLocalError('Khách chưa gửi minh chứng thanh toán chuyển khoản.');
      return;
    }
    if (!isThuThem && !refundEvidence?.file && !refundForm.chungTuThanhToan) {
      setLocalError('Vui lòng tải minh chứng hoàn cọc.');
      return;
    }

    setSubmittingRefund(true);
    setLocalError('');
    setLocalMessage('');
    setModalError('');
    try {
      let chungTuThanhToan = refundForm.chungTuThanhToan;
      if (refundEvidence?.file) {
        const dataBase64 = await readFileAsBase64(refundEvidence.file);
        const uploadResponse = await doiSoatApi.uploadChungTu({
          maDoiSoat: selectedRefund.maDoiSoat,
          fileName: refundEvidence.name,
          contentType: refundEvidence.type,
          dataBase64
        });
        chungTuThanhToan = uploadResponse.data.url;
      }

      const payload = {
        maDoiSoat: selectedRefund.maDoiSoat,
        phuongThucThanhToan: refundForm.phuongThucThanhToan,
        ngayThanhToan: refundForm.ngayThanhToan,
        chungTuThanhToan
      };
      if (isThuThem) {
        await doiSoatApi.xacNhanThuThem(payload);
      } else {
        await doiSoatApi.xacNhanHoanCoc(payload);
      }
      setLocalMessage(`Đã ghi nhận ${isThuThem ? 'thu thêm' : 'hoàn cọc'} cho phiếu ${selectedRefund.maDoiSoat}.`);
      setSelectedRefund(null);
      await loadRows();
    } catch (err) {
      setModalError(err.response?.data?.message || `Không ghi nhận được ${isThuThem ? 'thu thêm' : 'hoàn cọc'}.`);
    } finally {
      setSubmittingRefund(false);
    }
  }

  async function rejectThuThemProof() {
    if (!selectedRefund || !canRejectThuThemProof) return;

    setSubmittingRefund(true);
    setLocalError('');
    setLocalMessage('');
    try {
      await doiSoatApi.khongXacNhanThuThem({
        maDoiSoat: selectedRefund.maDoiSoat
      });
      setLocalMessage(`Đã không xác nhận chứng từ của phiếu ${selectedRefund.maDoiSoat}. Khách hàng cần tải lại minh chứng thanh toán.`);
      setSelectedRefund(null);
      await loadRows();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Không thể không xác nhận chứng từ thu thêm.');
    } finally {
      setSubmittingRefund(false);
    }
  }

  function handleEvidenceSelect(file) {
    setRefundEvidence((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return {
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
      };
    });
    setRefundForm((prev) => ({
      ...prev,
      phuongThucThanhToan: isThuThem && !prev.phuongThucThanhToan ? 'Chuyển khoản' : prev.phuongThucThanhToan,
      chungTuThanhToan: file.name
    }));
  }

  function removeEvidence() {
    setRefundEvidence((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    setRefundForm((prev) => ({ ...prev, chungTuThanhToan: '' }));
  }

  function renderSettlementTable(tableRows, toolbar) {
    const settlementName = isThuThem ? 'thu thêm' : 'hoàn cọc';
    const currentSection = {
      title: isThuThem ? activeThuThemFilterMeta.title : `Chờ ghi nhận ${settlementName}`,
      subtitle: isThuThem
        ? activeThuThemFilterMeta.subtitle
        : `Chỉ hiển thị các phiếu chưa được kế toán xác nhận ${settlementName}. Phiếu đã xác nhận nằm ở tab Kết quả đối soát.`,
      empty: isThuThem ? activeThuThemFilterMeta.empty : emptyText,
      icon: isThuThem ? 'payments' : 'account_balance_wallet'
    };

    return (
      <section className="ktp-table-section qt-settlement-section">
        {toolbar}
        <div className="qt-settlement-section-head">
          <div>
            <h4>{currentSection.title}</h4>
            <p>{currentSection.subtitle}</p>
          </div>
        </div>
        <table className="ktp-table">
          <thead>
            <tr>
              <th>Mã đối soát</th>
              <th>Khách hàng</th>
              <th>Hồ sơ</th>
              <th>{amountLabel}</th>
              <th>Trạng thái</th>
              <th className="text-center">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loadingRows ? (
              <TableState kind="loading" colSpan={6} />
            ) : tableRows.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center">
                  <div className="qt-empty-workflow">
                    <Icon name={currentSection.icon} />
                    <strong>{currentSection.title}</strong>
                    <span>{currentSection.empty}</span>
                  </div>
                </td>
              </tr>
            ) : tableRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((row) => {
              const rowMode = row._settlementMode || 'pending';
              const waitingForCustomerProof = isThuThem && needsThuThemProof(row);
              const statusLabel = waitingForCustomerProof ? 'Cần bổ sung minh chứng' : row.trangThaiDoiSoat;

              return (
                <tr key={`${rowMode}-${row.maDoiSoat}`}>
                  <td className="ui-cell-code">{row.maDoiSoat}</td>
                  <td>
                    <p className="ui-cell-main">{row.hoTenKhachHang || '--'}</p>
                    <p className="ui-cell-sub">{row.sdtKhachHang || '--'}</p>
                  </td>
                  <td>
                    <span className="ktp-badge ktp-badge-outline">{row.maHoSo || '--'}</span>
                    <p className="ui-cell-sub">
                      {row.tenPhong || '--'}{row.maGiuong ? ` - ${row.maGiuong}` : ''}
                      {safeNumber(row.soLuongPhongGiuong) > 1 ? ` và ${safeNumber(row.soLuongPhongGiuong) - 1} mục khác` : ''}
                    </p>
                  </td>
                  <td className={`ui-num qt-money ${isThuThem ? 'qt-money--collect' : 'qt-money--success'}`}>
                    {formatMoney(row[amountField])}
                  </td>
                  <td>
                    <StatusBadge status={statusLabel} tone={getDoiSoatStatusTone(statusLabel)} />
                  </td>
                  <td className="text-center">
                    <button
                      className="ktp-btn-action-fill"
                      type="button"
                      disabled={waitingForCustomerProof}
                      onClick={() => openRefundModal(row, rowMode)}
                    >
                      {waitingForCustomerProof
                        ? 'Chờ khách bổ sung'
                        : isThuThem && isReadyForThuThemConfirmation(row)
                          ? 'Xác nhận'
                          : 'Ghi nhận'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loadingRows && <ListPagination page={page} pageSize={PAGE_SIZE} total={tableRows.length} noun="phiếu" onChange={setPage} />}
      </section>
    );
  }

  const thuThemToolbar = (
    <>
{isThuThem && (
        <OverviewCards items={thuThemFilters} />
      )}
<div className="ui-list-toolbar">
        <ListSearch value={searchText} onChange={setSearchText} placeholder="Tìm theo mã, tên hoặc số điện thoại" />

{isThuThem && (
        <StatusFilterTabs
          className="status-pill-tabs-offset"
          ariaLabel="Bộ lọc thu thêm"
          items={thuThemFilters}
          activeKey={thuThemFilter}
          onChange={setThuThemFilter}
        />
      )}
</div>
<>


    </>
</>
  );

  return (
    <>
      {localMessage && (
        <div className="ui-list-alert qt-alert qt-alert--success" role="status">
          <Icon name="check_circle" />
          <span>{localMessage}</span>
        </div>
      )}

      {localError && (
        <div className="ui-list-alert qt-alert" role="alert">
          <Icon name="error_outline" />
          <span>{localError}</span>
        </div>
      )}

      {renderSettlementTable(displayedRows, thuThemToolbar)}

      {selectedRefund && (
        <div className="ktp-modal-overlay" onClick={() => setSelectedRefund(null)}>
          <div className="ktp-modal qt-refund-modal" onClick={(event) => event.stopPropagation()}>
            <div className="ktp-modal-header qt-modal-header">
              <div>
                <h3>{selectedRefund._viewMode === 'completed' ? `Chi tiết ${isThuThem ? 'thu thêm' : 'hoàn cọc'}` : actionTitle}</h3>
                <p className="ktp-modal-header-sub">
                  Mã đối soát: <span className="qt-modal-code">{selectedRefund.maDoiSoat}</span>
                </p>
              </div>
              <button className="ktp-modal-close" type="button" onClick={() => setSelectedRefund(null)} aria-label="Đóng hộp thoại">
                <Icon name="close" />
              </button>
            </div>

            <div className="ktp-modal-body qt-refund-body">
              {loadingDetail ? (
                <div className="text-center">Đang tải chi tiết...</div>
              ) : refundDetail ? (
                <>
                  <div className="qt-refund-top-grid">
                    <section className="ktp-section ktp-info-box-outline">
                      <h4 className="ktp-section-title"><Icon name="person" /> 1. Thông tin hồ sơ</h4>
                      <InfoRow label="Khách hàng" value={refundDetail.hoTenKhachHang} />
                      <InfoRow label="Số điện thoại" value={refundDetail.sdtKhachHang} />
                      <InfoRow label="Hồ sơ" value={refundDetail.maHoSo} />
                      <InfoRow label="Phiếu trả phòng" value={refundDetail.maPhieuTra} />
                      <InfoRow
                        label="Phòng/Giường"
                        value={refundRooms.map((room) => `${room.tenPhong || room.maPhong}${room.maGiuong ? ` - ${room.maGiuong}` : ''}`).join(', ') || '--'}
                      />
                    </section>

                    <section className="ktp-section ktp-info-box-outline">
                      <h4 className="ktp-section-title"><Icon name="account_balance_wallet" /> 2. Kết quả đối soát</h4>
                      <InfoRow label="Trạng thái đối soát" value={refundDetail.trangThaiDoiSoat} />
                      <InfoRow label="Tiền cọc ban đầu" value={formatMoney(refundDetail.tienCocBanDau)} />
                      <InfoRow label="Tỷ lệ hoàn cọc" value={`${safeNumber(refundDetail.tyLeHoanCocHienTai)}%`} />
                      <InfoRow label="Tổng khấu trừ" value={formatMoney(refundDetail.tongKhauTru)} />
                      <InfoRow
                        label={isThuThem ? 'Số tiền khách phải thanh toán thêm' : 'Số tiền hoàn thực tế'}
                        value={formatMoney(refundDetail[amountField])}
                        strong
                      />
                    </section>
                  </div>

                  {selectedRefund._viewMode === 'completed' ? (
                    <section className="ktp-section ktp-info-box-outline qt-refund-action-card">
                      <h4 className="ktp-section-title"><Icon name="task_alt" /> 3. {isThuThem ? 'Thông tin đã thu thêm' : 'Thông tin đã hoàn cọc'}</h4>
                      <InfoRow label="Phương thức thanh toán" value={refundDetail.phuongThucThanhToan} />
                      {!isThuThem && refundDetail.thongTinNhanHoanCoc && (
                        <RefundAccountCard value={refundDetail.thongTinNhanHoanCoc} />
                      )}
                      <InfoRow label="Ngày thanh toán" value={formatDate(refundDetail.ngayThanhToan)} />
                      <InfoRow label="Chứng từ thanh toán" value={<EvidenceValue value={refundDetail.chungTuThanhToan} />} />
                    </section>
                  ) : (
                    <section className="ktp-section ktp-info-box-outline qt-refund-form qt-refund-action-card">
                      <h4 className="ktp-section-title"><Icon name="payments" /> 3. {isThuThem ? 'Thông tin thu thêm' : 'Thông tin hoàn cọc'}</h4>
                      {isThuThem ? (
                        <>
                          {thuThemPaymentMethodLocked ? (
                            <div className="ktp-filter-group">
                              <span className="ktp-filter-label">Phương thức khách đã chọn</span>
                              <div className="ktp-readonly-field">{refundForm.phuongThucThanhToan || '--'}</div>
                            </div>
                          ) : (
                            <label className="ktp-filter-group">
                              <span className="ktp-filter-label">Phương thức thanh toán</span>
                              <select
                                className="ktp-input"
                                value={refundForm.phuongThucThanhToan}
                                onChange={(event) => setRefundForm((prev) => ({ ...prev, phuongThucThanhToan: event.target.value }))}
                              >
                                <option value="">Chọn phương thức</option>
                                <option value="Tiền mặt">Tiền mặt</option>
                                <option value="Chuyển khoản">Chuyển khoản</option>
                              </select>
                            </label>
                          )}
                          <label className="ktp-filter-group">
                            <span className="ktp-filter-label">Ngày thanh toán</span>
                            <input
                              className="ktp-input"
                              type="date"
                              value={refundForm.ngayThanhToan}
                              disabled={thuThemPaymentDateLocked}
                              onChange={(event) => setRefundForm((prev) => ({ ...prev, ngayThanhToan: event.target.value }))}
                            />
                          </label>
                        </>
                      ) : (
                        <>
                          <div className="ktp-filter-group">
                            <span className="ktp-filter-label">Phương thức khách chọn</span>
                            <div className="ktp-readonly-field">{refundForm.phuongThucThanhToan || 'Khách chưa chọn phương thức hoàn tiền'}</div>
                          </div>
                          <label className="ktp-filter-group">
                            <span className="ktp-filter-label">Ngày thanh toán</span>
                            <input
                              className="ktp-input"
                              type="date"
                              value={refundForm.ngayThanhToan}
                              onChange={(event) => setRefundForm((prev) => ({ ...prev, ngayThanhToan: event.target.value }))}
                            />
                          </label>
                          {refundDetail.thongTinNhanHoanCoc && (
                            <div className="ktp-filter-group qt-refund-payment-account qt-refund-wide-field">
                              <span className="ktp-filter-label">Thông tin tài khoản nhận hoàn cọc</span>
                              <RefundAccountCard value={refundDetail.thongTinNhanHoanCoc} />
                            </div>
                          )}
                        </>
                      )}
                      <div className="ktp-filter-group">
                        <span className="ktp-filter-label">Chứng từ thanh toán</span>
                        {isThuThem && refundForm.phuongThucThanhToan === 'Chuyển khoản' && currentProof && !refundEvidence?.file && (
                          <div className="qt-existing-proof-card">
                            <div>
                              <strong>Minh chứng khách đã gửi</strong>
                              <span>Kế toán kiểm tra chứng từ trước khi xác nhận thu thêm.</span>
                            </div>
                            <EvidenceValue value={currentProof} />
                          </div>
                        )}
                        {isThuThem && refundForm.phuongThucThanhToan === 'Chuyển khoản' && thuThemPaymentMethodLocked && !currentProof && (
                          <div className="ktp-readonly-field">Khách chưa gửi minh chứng thanh toán.</div>
                        )}
                        {showPaymentEvidenceUpload && (
                          <ChungTuUpload
                            evidence={refundEvidence}
                            onFileSelect={handleEvidenceSelect}
                            onRemove={removeEvidence}
                          />
                        )}
                      </div>
                    </section>
                  )}
                </>
              ) : null}
            </div>

            {modalError && <p className="qt-modal-error" role="alert"><Icon name="error" /> {modalError}</p>}
            <div className="ktp-modal-footer">
              {selectedRefund._viewMode === 'completed' ? (
                <button className="ktp-btn-cancel" type="button" onClick={() => setSelectedRefund(null)}>
                  Đóng
                </button>
              ) : (
                <>
                  {canRejectThuThemProof && (
                    <button
                      className="ktp-btn-cancel qt-btn-reject-proof"
                      type="button"
                      onClick={rejectThuThemProof}
                      disabled={submittingRefund || loadingDetail}
                    >
                      <Icon name="close" />
                      {submittingRefund ? 'Đang xử lý' : 'Từ chối xác nhận'}
                    </button>
                  )}
                  <button className="ktp-btn-submit" type="button" onClick={submitRefund} disabled={submittingRefund || loadingDetail}>
                    <Icon name="check_circle" />
                    {submittingRefund ? 'Đang ghi nhận' : submitLabel}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function KetQuaDoiSoatPanel() {
  const [rows, setRows] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [ketQuaFilter, setKetQuaFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  async function loadRows() {
    setLoading(true);
    setError('');
    try {
      const response = await doiSoatApi.getKetQuaDoiSoat();
      setRows(response.data.danhSach || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Không tải được danh sách kết quả đối soát.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRows();
  }, []);

  const searchedRows = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return rows;

    return rows.filter((row) =>
      row.maDoiSoat?.toLowerCase().includes(keyword) ||
      row.maPhieuTra?.toLowerCase().includes(keyword) ||
      row.maHoSo?.toLowerCase().includes(keyword) ||
      row.hoTenKhachHang?.toLowerCase().includes(keyword) ||
      row.sdtKhachHang?.toLowerCase().includes(keyword) ||
      row.trangThaiDoiSoat?.toLowerCase().includes(keyword)
    );
  }, [rows, searchText]);

  const ketQuaFilterItems = useMemo(() => {
    const counts = searchedRows.reduce((acc, row) => {
      const key = ketQuaFilterKey(row);
      acc[key] = (acc[key] || 0) + 1;
      acc.all += 1;
      return acc;
    }, { all: 0, 'thu-them': 0, 'hoan-coc': 0, 'khong-phat-sinh': 0 });

    return KET_QUA_FILTERS.map((filter) => ({
      ...filter,
      count: counts[filter.key] ?? 0
    }));
  }, [searchedRows]);

  const filteredRows = useMemo(() => {
    if (ketQuaFilter === 'all') return searchedRows;
    return searchedRows.filter((row) => ketQuaFilterKey(row) === ketQuaFilter);
  }, [ketQuaFilter, searchedRows]);

  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [searchText, ketQuaFilter]);
  const pagedRows = useMemo(() => filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filteredRows, page]);

  async function openDetail(row) {
    setSelected(row);
    setDetail(null);
    setRooms([]);
    setError('');
    setLoadingDetail(true);

    try {
      const response = row.ketQuaDoiSoat === 'hoan-coc'
        ? await doiSoatApi.getChiTietHoanCoc(row.maDoiSoat)
        : await doiSoatApi.getChiTietThuThem(row.maDoiSoat);
      setDetail(response.data.chiTiet);
      setRooms(response.data.danhSachPhong || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Không tải được chi tiết kết quả đối soát.');
      setSelected(null);
    } finally {
      setLoadingDetail(false);
    }
  }

  const selectedKetQuaKey = selected ? ketQuaFilterKey(selected) : '';
  const shouldShowPaymentInfo = selectedKetQuaKey !== 'khong-phat-sinh';

  return (
    <>
      {error && (
        <div className="ui-list-alert qt-alert" role="alert">
          <Icon name="error_outline" />
          <span>{error}</span>
        </div>
      )}

      <>
<OverviewCards items={ketQuaFilterItems} />
<div className="ui-list-toolbar">
          <ListSearch value={searchText} onChange={setSearchText} placeholder="Tìm theo mã, tên hoặc số điện thoại" />

<StatusFilterTabs
          className="status-pill-tabs-offset"
          ariaLabel="Bộ lọc kết quả đối soát"
          items={ketQuaFilterItems}
          activeKey={ketQuaFilter}
          onChange={setKetQuaFilter}
        />
</div>
<section className="ktp-table-section qt-settlement-section ui-list-table-card">




        <div className="qt-settlement-section-head">
          <div>
            <h4>Kết quả đối soát</h4>
            <p>Danh sách phiếu đã quyết toán hoặc đã hoàn cọc.</p>
          </div>
        </div>
        <table className="ktp-table">
          <thead>
            <tr>
              <th>Mã đối soát</th>
              <th>Khách hàng</th>
              <th>Hồ sơ</th>
              <th>Kết quả</th>
              <th>Số tiền</th>
              <th>Trạng thái</th>
              <th>Ngày xử lý</th>
              <th className="text-center">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableState kind="loading" colSpan={8} />
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center">
                  <div className="qt-empty-workflow">
                    <Icon name="task_alt" />
                    <strong>Kết quả đối soát</strong>
                    <span>{rows.length ? 'Không có phiếu phù hợp với bộ lọc.' : 'Chưa có phiếu đã quyết toán hoặc đã hoàn cọc.'}</span>
                  </div>
                </td>
              </tr>
            ) : pagedRows.map((row) => {
              const meta = ketQuaMeta(row);

              return (
                <tr key={row.maDoiSoat}>
                  <td className="ui-cell-code">{row.maDoiSoat}</td>
                  <td>
                    <p className="ui-cell-main">{row.hoTenKhachHang || '--'}</p>
                    <p className="ui-cell-sub">{row.sdtKhachHang || '--'}</p>
                  </td>
                  <td>
                    <span className="ktp-badge ktp-badge-outline">{row.maHoSo || '--'}</span>
                    <p className="ui-cell-sub">
                      {row.tenPhong || '--'}{row.maGiuong ? ` - ${row.maGiuong}` : ''}
                      {safeNumber(row.soLuongPhongGiuong) > 1 ? ` và ${safeNumber(row.soLuongPhongGiuong) - 1} mục khác` : ''}
                    </p>
                  </td>
                  <td><span className={`ktp-badge qt-result-badge ${meta.badgeClass}`}>{meta.label}</span></td>
                  <td className={`ui-num ${meta.amountTone}`}>{formatMoney(meta.amount)}</td>
                  <td>
                    <StatusBadge status={row.trangThaiDoiSoat} tone={getDoiSoatStatusTone(row.trangThaiDoiSoat)} />
                  </td>
                  <td>{formatDate(row.ngayThanhToan || row.ngayLap)}</td>
                  <td className="text-center">
                    <button className="ktp-btn-action-fill" type="button" onClick={() => openDetail(row)}>
                      Chi tiết
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && <ListPagination page={page} pageSize={PAGE_SIZE} total={filteredRows.length} noun="phiếu" onChange={setPage} />}
      </section>
</>

      {selected && (
        <div className="ktp-modal-overlay" onClick={() => setSelected(null)}>
          <div className="ktp-modal qt-refund-modal" onClick={(event) => event.stopPropagation()}>
            <div className="ktp-modal-header qt-modal-header">
              <div>
                <h3>Chi tiết kết quả đối soát</h3>
                <p className="ktp-modal-header-sub">
                  Mã đối soát: <span className="qt-modal-code">{selected.maDoiSoat}</span>
                </p>
              </div>
              <button className="ktp-modal-close" type="button" onClick={() => setSelected(null)} aria-label="Đóng hộp thoại">
                <Icon name="close" />
              </button>
            </div>

            <div className="ktp-modal-body qt-refund-body">
              {loadingDetail ? (
                <div className="text-center qt-loading">Đang tải chi tiết...</div>
              ) : detail ? (
                <>
                  <section className="ktp-section ktp-info-box-outline">
                    <h4 className="ktp-section-title"><Icon name="person" /> Thông tin hồ sơ</h4>
                    <InfoRow label="Khách hàng" value={detail.hoTenKhachHang} />
                    <InfoRow label="Số điện thoại" value={detail.sdtKhachHang} />
                    <InfoRow label="Mã hồ sơ" value={detail.maHoSo} />
                    <InfoRow label="Phòng/Giường" value={rooms.map((room) => `${room.tenPhong || room.maPhong}${room.maGiuong ? ` - ${room.maGiuong}` : ''}`).join(', ') || '--'} />
                  </section>

                  <section className="ktp-section ktp-info-box-outline">
                    <h4 className="ktp-section-title"><Icon name="task_alt" /> Kết quả đối soát</h4>
                    <InfoRow label="Trạng thái đối soát" value={detail.trangThaiDoiSoat} />
                    <InfoRow label="Trạng thái trả phòng" value={detail.trangThaiPhieuTra} />
                    <InfoRow label="Tiền cọc ban đầu" value={formatMoney(detail.tienCocBanDau)} />
                    <InfoRow label="Tổng khấu trừ" value={formatMoney(detail.tongKhauTru)} />
                    <InfoRow label="Số tiền hoàn thực tế" value={formatMoney(detail.soTienHoanThucTe)} strong />
                    <InfoRow label="Số tiền khách thanh toán thêm" value={formatMoney(detail.soTienKhachPhaiTT)} strong />
                  </section>

                  {shouldShowPaymentInfo && (
                    <section className="ktp-section ktp-info-box-outline">
                      <h4 className="ktp-section-title"><Icon name="payments" /> Thông tin thanh toán</h4>
                      <InfoRow label="Phương thức thanh toán" value={detail.phuongThucThanhToan} />
                      <InfoRow label="Ngày thanh toán" value={formatDate(detail.ngayThanhToan)} />
                      <InfoRow label="Chứng từ thanh toán" value={<EvidenceValue value={detail.chungTuThanhToan} />} />
                    </section>
                  )}
                </>
              ) : null}
            </div>

            <div className="ktp-modal-footer">
              <button className="ktp-btn-cancel" type="button" onClick={() => setSelected(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// group 'doi-soat' = "Đối soát hoàn cọc", group 'chi-tien' = "Chi tiền thanh lý" (menu split as in Hang's layout).
export default function QuyetToanTraPhongTab({ group = 'doi-soat' }) {
  const visibleTabs = QUYET_TOAN_TABS.filter((tab) => tab.group === group);
  const [activeQuyetToanTab, setActiveQuyetToanTab] = useState(visibleTabs[0].id);
  const [danhSach, setDanhSach] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [lapFilter, setLapFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editingKhoan, setEditingKhoan] = useState(null);
  const [form, setForm] = useState({
    tienThueConNo: 0,
    tienDichVuConNo: 0,
    tongChiPhiSuaChua: 0,
    tienPhat: 0,
    ghiChuPhanHoiKhach: ''
  });
  const [deductionValues, setDeductionValues] = useState({
    rentLines: {},
    serviceLines: {},
    repairLines: {},
    penaltyLines: {}
  });

  async function loadDanhSach() {
    setLoading(true);
    setError('');
    try {
      const response = await doiSoatApi.getDanhSachChoDoiSoat();
      setDanhSach(response.data.danhSach || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Không tải được danh sách phiếu trả phòng.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDanhSach();
  }, []);

  const searchedDanhSach = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return danhSach;
    return danhSach.filter((item) =>
      item.maPhieuTra?.toLowerCase().includes(keyword) ||
      item.maHopDong?.toLowerCase().includes(keyword) ||
      item.maPhieuDatCoc?.toLowerCase().includes(keyword) ||
      item.hoTenKhachHang?.toLowerCase().includes(keyword) ||
      item.sdtKhachHang?.toLowerCase().includes(keyword)
    );
  }, [danhSach, search]);

  const lapCounts = useMemo(() => {
    const pending = searchedDanhSach.filter((item) => getLapDoiSoatState(item) === 'pending').length;
    const needsAdjustment = searchedDanhSach.filter((item) => getLapDoiSoatState(item) === 'needs-adjustment').length;
    const completed = searchedDanhSach.filter((item) => getLapDoiSoatState(item) === 'completed').length;
    return {
      all: searchedDanhSach.length,
      pending,
      completed,
      needsAdjustment
    };
  }, [searchedDanhSach]);

  const lapFilters = useMemo(() => [
    { key: 'all', label: 'Tất cả', count: lapCounts.all },
    { key: 'pending', label: 'Chưa đối soát', count: lapCounts.pending },
    { key: 'needs-adjustment', label: 'Cần điều chỉnh', count: lapCounts.needsAdjustment },
    { key: 'completed', label: 'Đã đối soát', count: lapCounts.completed }
  ], [lapCounts]);

  const filteredDanhSach = useMemo(() => {
    if (lapFilter === 'pending') {
      return searchedDanhSach.filter((item) => getLapDoiSoatState(item) === 'pending');
    }
    if (lapFilter === 'needs-adjustment') {
      return searchedDanhSach.filter((item) => getLapDoiSoatState(item) === 'needs-adjustment');
    }
    if (lapFilter === 'completed') {
      return searchedDanhSach.filter((item) => getLapDoiSoatState(item) === 'completed');
    }
    return searchedDanhSach;
  }, [lapFilter, searchedDanhSach]);

  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [search, lapFilter]);
  const pagedDanhSach = useMemo(() => filteredDanhSach.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filteredDanhSach, page]);

  const lapSectionMeta = {
    all: {
      title: 'Tất cả phiếu đối soát',
      subtitle: 'Bao gồm phiếu chờ đối soát, phiếu cần điều chỉnh và phiếu đã đối soát.'
    },
    pending: {
      title: 'Phiếu chưa đối soát',
      subtitle: 'Chỉ gồm phiếu trả phòng có trạng thái chờ đối soát.'
    },
    'needs-adjustment': {
      title: 'Phiếu cần điều chỉnh',
      subtitle: 'Các phiếu đối soát khách hàng chưa đồng ý và cần kế toán điều chỉnh lại.'
    },
    completed: {
      title: 'Phiếu đã đối soát',
      subtitle: 'Các phiếu đã lập đối soát, chỉ cho phép xem chi tiết.'
    }
  };
  const currentLapSection = lapSectionMeta[lapFilter] || lapSectionMeta.all;

  const preview = useMemo(() => calculatePreview(selected, form), [selected, form]);
  const laPhieuDatCoc = selected?.loaiHoSo === LOAI_HO_SO.DAT_COC_CHUA_KY_HOP_DONG;
  const isAdjustmentDoiSoat = selected?.doiSoat?.trangThaiDoiSoat === 'Cần điều chỉnh';
  const isReadonlyDoiSoat = Boolean(selected?.doiSoat?.maDoiSoat) && !isAdjustmentDoiSoat;

  async function openDetail(rowOrMaPhieuTra) {
    const row = typeof rowOrMaPhieuTra === 'object' ? rowOrMaPhieuTra : null;
    const maPhieuTra = row?.maPhieuTra || rowOrMaPhieuTra;
    setDetailLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await doiSoatApi.getChiTietPhieuTraPhong(maPhieuTra);
      let doiSoatDetail = null;

      if (row?.maDoiSoat) {
        const detailResponse = row.loaiQuyetToan === 'Hoàn cọc'
          ? await doiSoatApi.getChiTietHoanCoc(row.maDoiSoat)
          : await doiSoatApi.getChiTietThuThem(row.maDoiSoat);
        doiSoatDetail = detailResponse.data.chiTiet || null;
      }

      const data = {
        ...response.data,
        doiSoat: row?.maDoiSoat
          ? {
              maDoiSoat: row.maDoiSoat,
              trangThaiDoiSoat: row.trangThaiDoiSoat,
              loaiQuyetToan: row.loaiQuyetToan,
              ...doiSoatDetail
            }
          : null
      };
      const isDepositOnly = data.loaiHoSo === LOAI_HO_SO.DAT_COC_CHUA_KY_HOP_DONG;
      const adjustmentDefaults = buildAdjustmentDefaults(doiSoatDetail);
      const initialDeductionValues = isDepositOnly
        ? {
            rentLines: {},
            serviceLines: {},
            repairLines: {},
            penaltyLines: {}
          }
        : buildInitialDeductionValues(data);

      setSelected(data);
      setEditingKhoan(null);
      setDeductionValues(initialDeductionValues);
      setForm(
        isDepositOnly
          ? {
              tienThueConNo: 0,
              tienDichVuConNo: 0,
              tongChiPhiSuaChua: 0,
              tienPhat: 0,
              ghiChuPhanHoiKhach: ''
            }
          : buildFormFromDeductionValues(adjustmentDefaults || data.macDinhKhauTru, initialDeductionValues)
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Không tải được chi tiết phiếu trả phòng.');
    } finally {
      setDetailLoading(false);
    }
  }


  function updateDeductionLine(group, key, value) {
    const nextDeductionValues = {
      ...deductionValues,
      [group]: {
        ...deductionValues[group],
        [key]: safeNumber(value)
      }
    };

    setDeductionValues(nextDeductionValues);
    setForm((prev) => ({
      ...prev,
      tienThueConNo: hasLineValues(nextDeductionValues.rentLines)
        ? sumLineValues(nextDeductionValues.rentLines)
        : prev.tienThueConNo,
      tienDichVuConNo: hasLineValues(nextDeductionValues.serviceLines)
        ? sumLineValues(nextDeductionValues.serviceLines)
        : prev.tienDichVuConNo,
      tongChiPhiSuaChua: hasLineValues(nextDeductionValues.repairLines)
        ? sumLineValues(nextDeductionValues.repairLines)
        : prev.tongChiPhiSuaChua,
      tienPhat: hasLineValues(nextDeductionValues.penaltyLines)
        ? sumLineValues(nextDeductionValues.penaltyLines)
        : prev.tienPhat
    }));
  }


  async function handleSubmit() {
    if (!selected) return;
    if (isReadonlyDoiSoat) return;
    const isAdjustment = isAdjustmentDoiSoat;

    const tienThueConNo = laPhieuDatCoc ? 0 : safeNumber(form.tienThueConNo);
    const tienDichVuConNo = laPhieuDatCoc ? 0 : safeNumber(form.tienDichVuConNo);
    const tongChiPhiSuaChua = laPhieuDatCoc ? 0 : safeNumber(form.tongChiPhiSuaChua);
    const tienPhat = laPhieuDatCoc ? 0 : safeNumber(form.tienPhat);
    const moneyValues = [
      tienThueConNo,
      tienDichVuConNo,
      tongChiPhiSuaChua,
      tienPhat
    ];

    if (moneyValues.some((value) => value < 0)) {
      setError('Các khoản tiền không được âm.');
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const response = await doiSoatApi.taoDoiSoat({
        maPhieuTra: selected.phieuTraPhong.maPhieuTra,
        maDoiSoat: isAdjustment ? selected.doiSoat?.maDoiSoat : undefined,
        tienThueConNo,
        tienDichVuConNo,
        tongChiPhiSuaChua,
        tienPhat,
        chiTietChiPhiSuaChua: isAdjustment
          ? buildRepairAdjustmentPayload(selected, deductionValues)
          : undefined,
        ghiChuPhanHoiKhach: form.ghiChuPhanHoiKhach
      });
      setMessage(`${isAdjustment ? 'Đã điều chỉnh' : 'Đã lập'} phiếu đối soát ${response.data.doiSoat?.maDoiSoat || ''}.`);
      setSelected(null);
      await loadDanhSach();
    } catch (err) {
      setError(err.response?.data?.message || 'Không lập được phiếu đối soát.');
    } finally {
      setSubmitting(false);
    }
  }

  const hoSoChinh = selected?.hopDong || selected?.phieuDatCoc;
  const chiTietKhauTru = selected?.chiTietKhauTru || {};
  const chiTietHoaDon = chiTietKhauTru.chiTietHoaDon || [];
  const serviceFallbackTotal = safeNumber(form.tienDichVuConNo)
    || sumLineValues(deductionValues.serviceLines)
    || safeNumber(selected?.doiSoat?.tienDichVuConNo)
    || safeNumber(selected?.macDinhKhauTru?.tienDichVuConNo);
  const fallbackServiceSources = chiTietHoaDon.length === 0
    ? getFallbackServiceSources(chiTietKhauTru, serviceFallbackTotal)
    : [];
  const serviceDebtLines = chiTietHoaDon.length > 0
    ? chiTietHoaDon.map((line) => {
      const key = makeLineKey('service', line.maChiTietHD, line.maHoaDon);
      return {
        key,
        title: line.tenDichVu || 'Dịch vụ',
        amount: getLineAmount(deductionValues.serviceLines, key, line.thanhTien),
        onAmountChange: (value) => updateDeductionLine('serviceLines', key, value)
      };
    })
    : fallbackServiceSources.map((service, index) => {
      const key = getServiceSourceKey(service, index);
      return {
        key,
        title: service.tenDichVu || service.maDichVu || 'Dịch vụ',
        amount: getLineAmount(deductionValues.serviceLines, key, 0),
        onAmountChange: (value) => updateDeductionLine('serviceLines', key, value)
      };
    });
  const bienBanKiemTra = chiTietKhauTru.bienBanKiemTra || [];
  const chiTietHuHong = chiTietKhauTru.chiTietHuHong || [];
  const bienBanViPham = chiTietKhauTru.bienBanViPham || [];
  const adjustmentRequestText = selected?.doiSoat?.ghiChuPhanHoiKhach || form.ghiChuPhanHoiKhach;

  return (
    <div className="ktp-container">
      <nav className="qt-subtab-bar" aria-label="Nghiệp vụ quyết toán trả phòng">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`qt-subtab-btn${activeQuyetToanTab === tab.id ? ' is-active' : ''}`}
            onClick={() => {
              setActiveQuyetToanTab(tab.id);
              setSelected(null);
              setEditingKhoan(null);
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeQuyetToanTab === 'lap-doi-soat' && (
        <>
      {message && (
        <div className="ui-list-alert qt-alert qt-alert--success" role="status">
          <Icon name="check_circle" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="ui-list-alert qt-alert" role="alert">
          <Icon name="error_outline" />
          <span>{error}</span>
        </div>
      )}

      <>
<OverviewCards items={lapFilters} />
<div className="ui-list-toolbar">
          <ListSearch value={search} onChange={setSearch} placeholder="Tìm theo mã, tên hoặc số điện thoại" />

<StatusFilterTabs
          className="status-pill-tabs-offset"
          ariaLabel="Bộ lọc đối soát"
          items={lapFilters}
          activeKey={lapFilter}
          onChange={setLapFilter}
        />
</div>
<section className="ktp-table-section qt-settlement-section ui-list-table-card">




        <div className="qt-settlement-section-head">
          <div>
            <h4>{currentLapSection.title}</h4>
            <p>{currentLapSection.subtitle}</p>
          </div>
        </div>
        <table className="ktp-table">
          <thead>
            <tr>
              <th>Mã phiếu trả</th>
              <th>Khách hàng</th>
              <th>Hồ sơ</th>
              <th>Ngày trả thực tế</th>
              <th>Trạng thái</th>
              <th className="text-center">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableState kind="loading" colSpan={6} />
            ) : filteredDanhSach.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center">
                  <div className="qt-empty-workflow">
                    <Icon name="receipt_long" />
                    <strong>{currentLapSection.title}</strong>
                    <span>Không có phiếu phù hợp.</span>
                  </div>
                </td>
              </tr>
            ) : pagedDanhSach.map((row) => {
              const lapState = getLapDoiSoatState(row);
              const hasDoiSoat = Boolean(row.maDoiSoat);

              return (
                <tr key={row.maPhieuTra}>
                  <td className="ui-cell-code">{row.maPhieuTra}</td>
                  <td>
                    <p className="ui-cell-main">{row.hoTenKhachHang || '--'}</p>
                    <p className="ui-cell-sub">{row.sdtKhachHang || row.emailKhachHang || '--'}</p>
                  </td>
                  <td>
                    <span className="ktp-badge ktp-badge-outline">
                      {row.maHopDong || row.maPhieuDatCoc || '--'}
                    </span>
                  </td>
                  <td>{formatDate(row.ngayTraThucTe)}</td>
                  <td>
                    <StatusBadge status={getLapDoiSoatStatusLabel(row)} tone={getLapDoiSoatStatusTone(row)} />
                    {hasDoiSoat && (
                      <p className="ui-cell-sub">
                        {row.maDoiSoat} · {row.loaiQuyetToan || '--'}
                      </p>
                    )}
                  </td>
                  <td className="text-center">
                    {lapState === 'needs-adjustment' ? (
                      <button
                        className="ktp-btn-action-fill"
                        type="button"
                        onClick={() => openDetail(row)}
                        disabled={detailLoading}
                      >
                        Điều chỉnh
                      </button>
                    ) : lapState === 'completed' ? (
                      <button
                        className="ktp-btn-action-fill"
                        type="button"
                        onClick={() => openDetail(row)}
                        disabled={detailLoading}
                      >
                        Xem chi tiết
                      </button>
                    ) : (
                      <button
                        className="ktp-btn-action-fill"
                        type="button"
                        onClick={() => openDetail(row)}
                        disabled={detailLoading}
                      >
                        Lập đối soát
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && <ListPagination page={page} pageSize={PAGE_SIZE} total={filteredDanhSach.length} noun="phiếu" onChange={setPage} />}
      </section>
</>
        </>
      )}

      {activeQuyetToanTab === 'ghi-nhan-thu-them' && (
        <GhiNhanThanhToanPanel type="thu-them" />
      )}

      {activeQuyetToanTab === 'ghi-nhan-hoan-coc' && (
        <GhiNhanThanhToanPanel type="hoan-coc" />
      )}

      {activeQuyetToanTab === 'ket-qua-doi-soat' && (
        <KetQuaDoiSoatPanel />
      )}

      {activeQuyetToanTab === 'lap-doi-soat' && selected && (
        <div className="ktp-modal-overlay" onClick={() => setSelected(null)}>
          <div className={`ktp-modal qt-modal ${laPhieuDatCoc ? 'qt-modal-sm' : ''}`} onClick={(event) => event.stopPropagation()}>
            <div className="ktp-modal-header qt-modal-header">
              <div>
                <h3>
                  {isAdjustmentDoiSoat
                    ? 'Điều chỉnh phiếu đối soát trả phòng'
                    : isReadonlyDoiSoat
                      ? 'Chi tiết phiếu đối soát trả phòng'
                      : 'Lập phiếu đối soát trả phòng'}
                </h3>
                <p className="ktp-modal-header-sub">
                  Mã phiếu trả: <span className="qt-modal-code">{selected.phieuTraPhong.maPhieuTra}</span>
                  {selected.doiSoat?.maDoiSoat ? (
                    <> · Mã đối soát: <span className="qt-modal-code">{selected.doiSoat.maDoiSoat}</span></>
                  ) : null}
                </p>
              </div>
              <button className="ktp-modal-close" type="button" onClick={() => setSelected(null)} aria-label="Đóng hộp thoại">
                <Icon name="close" />
              </button>
            </div>

            <div className="ktp-modal-body qt-modal-body">
              {laPhieuDatCoc ? (
                <div className="qt-full-span">
                  <div className="ktp-grid-2">
                    <section className="ktp-section ktp-info-box-outline">
                      <h4 className="ktp-section-title">
                        <Icon name="person" /> 1. Thông tin khách hàng
                      </h4>
                      <InfoRow label="Họ tên" value={selected.khachHang?.hoTen} />
                      <InfoRow label="Số điện thoại" value={selected.khachHang?.sdt} />
                      <InfoRow label="Email" value={selected.khachHang?.email} />
                      <InfoRow label="CCCD" value={selected.khachHang?.cccd} />
                    </section>

                    <section className="ktp-section ktp-info-box-outline">
                      <h4 className="ktp-section-title">
                        <Icon name="account_balance_wallet" /> 2. Thông tin phiếu đặt cọc
                      </h4>
                      <InfoRow label="Mã phiếu đặt cọc" value={selected.phieuDatCoc?.maPhieuDatCoc} />
                      <InfoRow label="Số tiền cọc" value={formatMoney(preview?.tienCocBanDau)} strong />
                      <InfoRow
                        label="Trạng thái thanh toán"
                        value={selected.phieuDatCoc?.trangThaiThanhToan}
                      />
                      <InfoRow label="Trạng thái cọc" value={selected.phieuDatCoc?.trangThaiCoc} />
                    </section>
                  </div>

                  {isAdjustmentDoiSoat && (
                    <AdjustmentRequestBox value={adjustmentRequestText} />
                  )}

                  <section className="ktp-section ktp-info-box-outline">
                    <h4 className="ktp-section-title">
                      <Icon name="account_balance_wallet" /> 3. Số tiền hoàn cho khách
                    </h4>
                    <div className="qt-summary-card">
                      <SummaryLine
                        label="Tiền cọc ban đầu"
                        value={formatMoney(preview?.tienCocBanDau)}
                      />
                      <SummaryLine
                        label="Tỷ lệ hoàn cọc"
                        value={`${preview?.tyLeHoanCocHienTai ?? 80}%`}
                      />
                      <SummaryLine
                        label="Số tiền hoàn cho khách"
                        value={formatMoney(preview?.soTienHoanThucTe)}
                        tone="success"
                      />
                    </div>


                  </section>
                </div>
              ) : (
                <>
              <div className="qt-main-column">
              <div className="ktp-grid-2">
                <section className="ktp-section ktp-info-box-outline">
                  <h4 className="ktp-section-title"><Icon name="person" /> 1. Thông tin khách hàng</h4>
                  <InfoRow label="Họ tên" value={selected.khachHang?.hoTen} />
                  <InfoRow label="Số điện thoại" value={selected.khachHang?.sdt} />
                  <InfoRow label="Email" value={selected.khachHang?.email} />
                  <InfoRow label="CCCD" value={selected.khachHang?.cccd} />
                </section>

                <section className="ktp-section ktp-info-box-outline">
                  <h4 className="ktp-section-title">
                    <Icon name={selected.loaiHoSo === LOAI_HO_SO.HOP_DONG_THUE ? 'receipt_long' : 'account_balance'} />
                    {selected.loaiHoSo === LOAI_HO_SO.HOP_DONG_THUE ? '2. Thông tin hợp đồng' : '2. Thông tin phiếu đặt cọc'}
                  </h4>
                  <InfoRow label="Mã hồ sơ" value={hoSoChinh?.maHopDong || hoSoChinh?.maPhieuDatCoc} />
                  <InfoRow label="Tiền cọc ban đầu" value={formatMoney(preview?.tienCocBanDau)} strong />
                  <InfoRow label="Phòng" value={Array.from(new Set((selected.danhSachPhong || []).map(p => p.tenPhong || p.maPhong))).join(', ') || '--'} />
                  {selected.hopDong && (
                    <>
                      <InfoRow label="Ngày bắt đầu" value={formatDate(selected.hopDong.ngayBatDau)} />
                      <InfoRow label="Ngày kết thúc" value={formatDate(selected.hopDong.ngayKetThuc)} />
                      <InfoRow label="Kỳ thanh toán" value={selected.hopDong.kyThanhToan} />
                    </>
                  )}
                  {selected.phieuDatCoc && (
                    <>
                      <InfoRow label="Thanh toán cọc" value={selected.phieuDatCoc.trangThaiThanhToan} />
                      <InfoRow label="Trạng thái cọc" value={selected.phieuDatCoc.trangThaiCoc} />
                      <InfoRow label="Loại hồ sơ" value="Đặt cọc chưa ký hợp đồng" />
                    </>
                  )}
                </section>
              </div>

              {isAdjustmentDoiSoat && (
                <AdjustmentRequestBox value={adjustmentRequestText} />
              )}

              {selected?.loaiHoSo === LOAI_HO_SO.HOP_DONG_THUE && selected?.phieuTraPhong?.maPhieuTra && (
                <section className="ktp-section ktp-info-box-outline">
                  <h4 className="ktp-section-title"><Icon name="fact_check" /> Đối chiếu lúc nhận phòng và lúc trả phòng</h4>
                  <DoiChieuTraPhong maPhieuTra={selected.phieuTraPhong.maPhieuTra} />
                </section>
              )}

              <section className="ktp-section ktp-info-box-outline">
                <h4 className="ktp-section-title"><Icon name="money_off" /> 3. Các khoản khấu trừ</h4>
                <div className="qt-deduction-grid">
                  <KhauTruPanel
                    title="Tiền thuê còn nợ"
                    value={safeNumber(form.tienThueConNo) + safeNumber(form.tienDichVuConNo)}
                    editing={editingKhoan === 'hoaDonConNo'}
                    onEdit={() => setEditingKhoan('hoaDonConNo')}
                    onDone={() => setEditingKhoan(null)}
                    readOnly={isReadonlyDoiSoat}
                  >
                    {safeNumber(form.tienThueConNo) > 0 || safeNumber(form.tienDichVuConNo) > 0 ? (
                      <div className="qt-debt-group">
                        {safeNumber(form.tienThueConNo) > 0 && (
                          <SourceLine
                            title="Tiền thuê hợp đồng"
                            amount={safeNumber(form.tienThueConNo)}
                            editing={editingKhoan === 'hoaDonConNo'}
                            editValue={safeNumber(form.tienThueConNo)}
                            onAmountChange={(value) => setForm((prev) => ({ ...prev, tienThueConNo: safeNumber(value) }))}
                          />
                        )}
                        {serviceDebtLines.length > 0 ? serviceDebtLines.map((line) => (
                          safeNumber(line.amount) > 0 && (
                            <SourceLine
                              key={line.key}
                              title={line.title}
                              amount={line.amount}
                              editing={editingKhoan === 'hoaDonConNo'}
                              editValue={line.amount}
                              onAmountChange={line.onAmountChange}
                            />
                          )
                        )) : safeNumber(form.tienDichVuConNo) > 0 && (
                          <SourceLine
                            title="Tiền dịch vụ"
                            amount={safeNumber(form.tienDichVuConNo)}
                            editing={editingKhoan === 'hoaDonConNo'}
                            editValue={safeNumber(form.tienDichVuConNo)}
                            onAmountChange={(value) => setForm((prev) => ({ ...prev, tienDichVuConNo: safeNumber(value) }))}
                          />
                        )}
                      </div>
                    ) : (
                      <EmptySource>Không có khoản thuê hoặc dịch vụ còn nợ.</EmptySource>
                    )}
                  </KhauTruPanel>

                  <KhauTruPanel
                    title="Chi phí sửa chữa"
                    value={form.tongChiPhiSuaChua}
                    editing={editingKhoan === 'tongChiPhiSuaChua'}
                    onEdit={() => setEditingKhoan('tongChiPhiSuaChua')}
                    onDone={() => setEditingKhoan(null)}
                    readOnly={isReadonlyDoiSoat}
                  >
                    {bienBanKiemTra.length === 0 ? (
                      safeNumber(form.tongChiPhiSuaChua) > 0 ? (
                        <SourceLine
                          title="Chi phí sửa chữa"
                          meta="Theo phiếu đối soát hiện tại khách đang xem"
                          amount={safeNumber(form.tongChiPhiSuaChua)}
                          tone="danger"
                          editing={editingKhoan === 'tongChiPhiSuaChua'}
                          editValue={safeNumber(form.tongChiPhiSuaChua)}
                          onAmountChange={(value) => setForm((prev) => ({ ...prev, tongChiPhiSuaChua: safeNumber(value) }))}
                        />
                      ) : (
                        <EmptySource>Chưa có biên bản kiểm tra phòng.</EmptySource>
                      )
                    ) : bienBanKiemTra.map((bienBan) => {
                      const damages = chiTietHuHong.filter((item) => item.maBienBanKT === bienBan.maBienBanKT);
                      const reportKey = makeLineKey('repair-report', bienBan.maBienBanKT);
                      const reportAmount = damages.length === 0
                        ? getLineAmount(deductionValues.repairLines, reportKey, bienBan.tongChiPhiSuaChua)
                        : damages.reduce((total, damage) => {
                            const damageKey = makeLineKey('repair', damage.maChiTietHH, damage.maBienBanKT);
                            return total + getLineAmount(deductionValues.repairLines, damageKey, damage.chiPhiSuaChua);
                          }, 0);

                      return (
                        <div key={bienBan.maBienBanKT} className="qt-inspection-item">
                          <SourceLine
                            title={`Biên bản ${bienBan.maBienBanKT}`}
                            meta={`Ngày kiểm tra: ${formatDate(bienBan.ngayKiemTra)}${bienBan.tinhTrangPhong ? ` · ${bienBan.tinhTrangPhong}` : ''}`}
                            amount={reportAmount}
                            tone="danger"
                            editing={editingKhoan === 'tongChiPhiSuaChua' && damages.length === 0}
                            editValue={reportAmount}
                            onAmountChange={damages.length === 0 ? (value) => updateDeductionLine('repairLines', reportKey, value) : undefined}
                          />
                          {damages.length === 0 ? (
                            <EmptySource>Biên bản không có chi tiết hư hỏng.</EmptySource>
                          ) : damages.map((damage) => (
                            <SourceLine
                              key={damage.maChiTietHH}
                              title={`${damage.tenTaiSan || damage.maTaiSan || 'Tài sản'} - ${damage.maPhong || '--'}`}
                              meta={damage.moTaHuHong || 'Chưa có mô tả hư hỏng'}
                              amount={getLineAmount(deductionValues.repairLines, makeLineKey('repair', damage.maChiTietHH, damage.maBienBanKT), damage.chiPhiSuaChua)}
                              tone="danger"
                              editing={editingKhoan === 'tongChiPhiSuaChua'}
                              editValue={getLineAmount(deductionValues.repairLines, makeLineKey('repair', damage.maChiTietHH, damage.maBienBanKT), damage.chiPhiSuaChua)}
                              onAmountChange={(value) => updateDeductionLine('repairLines', makeLineKey('repair', damage.maChiTietHH, damage.maBienBanKT), value)}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </KhauTruPanel>

                  <KhauTruPanel
                    title="Tiền phạt"
                    value={form.tienPhat}
                    editing={editingKhoan === 'tienPhat'}
                    onEdit={() => setEditingKhoan('tienPhat')}
                    onDone={() => setEditingKhoan(null)}
                    readOnly={isReadonlyDoiSoat}
                  >
                    {bienBanViPham.length === 0 ? (
                      safeNumber(form.tienPhat) > 0 ? (
                        <SourceLine
                          title="Tiền phạt vi phạm"
                          meta="Theo phiếu đối soát hiện tại khách đang xem"
                          amount={safeNumber(form.tienPhat)}
                          tone="danger"
                          editing={editingKhoan === 'tienPhat'}
                          editValue={safeNumber(form.tienPhat)}
                          onAmountChange={(value) => setForm((prev) => ({ ...prev, tienPhat: safeNumber(value) }))}
                        />
                      ) : (
                        <EmptySource>Không có biên bản vi phạm đang Chờ xử lý.</EmptySource>
                      )
                    ) : bienBanViPham.map((viPham) => (
                      <SourceLine
                        key={viPham.maBBViPham}
                        title={`Biên bản ${viPham.maBBViPham}${viPham.tenDieuKhoan ? ` - ${viPham.tenDieuKhoan}` : ''}`}
                        meta={`Ngày vi phạm: ${formatDate(viPham.ngayViPham)}${viPham.moTaViPham ? ` · ${viPham.moTaViPham}` : ''}`}
                        amount={getLineAmount(deductionValues.penaltyLines, makeLineKey('penalty', viPham.maBBViPham), viPham.soTienPhat)}
                        tone="danger"
                        editing={editingKhoan === 'tienPhat'}
                        editValue={getLineAmount(deductionValues.penaltyLines, makeLineKey('penalty', viPham.maBBViPham), viPham.soTienPhat)}
                        onAmountChange={(value) => updateDeductionLine('penaltyLines', makeLineKey('penalty', viPham.maBBViPham), value)}
                      />
                    ))}
                  </KhauTruPanel>
                </div>
              </section>

              </div>

              <aside className="qt-summary-panel">
                <h4 className="ktp-section-title"><Icon name="calculate" /> Tóm tắt đối soát</h4>
                <div className="qt-summary-card">
                  <SummaryLine label="Tiền cọc ban đầu" value={formatMoney(preview?.tienCocBanDau)} tone="primary" />
                  <SummaryLine label="Số tháng lưu trú" value={preview?.soThangLuuTru ?? 0} />
                  <SummaryLine label="Tỷ lệ hoàn cọc" value={`${preview?.tyLeHoanCocHienTai ?? 0}%`} />
                  {!selected?.doiSoat && selected?.chinhSachHoanCoc && (
                    <p className="qt-rate-source">
                      {selected.chinhSachHoanCoc.nguon === 'chinh-sach'
                        ? `Theo chính sách hoàn cọc khách đã nhận lúc cọc, phiên bản ${selected.chinhSachHoanCoc.phienBan}.`
                        : selected.chinhSachHoanCoc.lyDo}
                    </p>
                  )}
                  <SummaryLine label="Cọc được hoàn" value={formatMoney(preview?.tienCocDuocHoan)} tone="primary" />
                  <SummaryLine label="Tổng khấu trừ" value={formatMoney(preview?.tongKhauTru)} tone="deduction" />
                  <SummaryLine label="Số tiền hoàn thực tế" value={formatMoney(preview?.soTienHoanThucTe)} tone={preview?.soTienHoanThucTe > 0 ? 'success' : 'normal'} />
                  <SummaryLine label="Số tiền khách phải thanh toán thêm" value={formatMoney(preview?.soTienKhachPhaiTT)} tone={preview?.soTienKhachPhaiTT > 0 ? 'collect' : 'normal'} />
                </div>

                <div className={`qt-result-box${preview?.soTienKhachPhaiTT > 0 ? ' is-danger' : preview?.soTienHoanThucTe > 0 ? ' is-success' : ' is-neutral'}`}>
                  <Icon name={preview?.soTienKhachPhaiTT > 0 ? 'warning' : 'check_circle'} />
                  <div>
                    <span>Kết quả: {resultText(preview)}</span>
                    <strong>{formatMoney(preview?.soTienKhachPhaiTT > 0 ? preview?.soTienKhachPhaiTT : preview?.soTienHoanThucTe)}</strong>
                  </div>
                </div>

                <div className="qt-info-note">
                  <Icon name="info" />
                  <span>
                    {isReadonlyDoiSoat
                      ? 'Phiếu đối soát đã được lập, màn này chỉ dùng để xem thông tin.'
                      : 'Sau khi lập phiếu, phiếu đối soát sẽ chuyển sang trạng thái Chờ xác nhận.'}
                  </span>
                </div>
              </aside>
                </>
              )}
            </div>

            <div className="ktp-modal-footer">
              <button className="ktp-btn-cancel" type="button" onClick={() => setSelected(null)}>
                {isReadonlyDoiSoat ? 'Đóng' : 'Hủy'}
              </button>
              {!isReadonlyDoiSoat && (
                <button className="ktp-btn-submit" type="button" onClick={handleSubmit} disabled={submitting}>
                  <Icon name="check_circle" />
                  {submitting
                    ? (isAdjustmentDoiSoat ? 'Đang điều chỉnh' : 'Đang lập phiếu')
                    : (isAdjustmentDoiSoat ? 'Xác nhận điều chỉnh' : 'Xác nhận lập phiếu đối soát')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
