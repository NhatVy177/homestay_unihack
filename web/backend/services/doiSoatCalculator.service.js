// Refund cases of the deposit policy (QuyDinhHoanCoc rows / lines of the locked policy text).
export const TRUONG_HOP_HOAN = {
  CHUA_KY: 'chua-ky',
  DUOI_6_THANG: 'duoi-6-thang',
  TU_6_THANG: 'tu-6-thang',
  HET_HAN: 'het-han'
};

export const LOAI_HO_SO_TRA_PHONG = {
  HOP_DONG_THUE: 'HOP_DONG_THUE',
  DAT_COC_CHUA_KY_HOP_DONG: 'DAT_COC_CHUA_KY_HOP_DONG'
};

export function safeNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 0;
  }
  return Number(value);
}

export function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function roundMoney(value) {
  return Math.round(value);
}

export function xacDinhLoaiQuyetToan(soTienHoanThucTe, soTienKhachPhaiTT) {
  if (safeNumber(soTienKhachPhaiTT) > 0) {
    return 'Thu thêm';
  }

  if (safeNumber(soTienHoanThucTe) > 0) {
    return 'Hoàn cọc';
  }

  return 'Không phát sinh';
}

export function calculateStayMonths(startDate, returnDate) {
  let months =
    (returnDate.getFullYear() - startDate.getFullYear()) * 12 +
    (returnDate.getMonth() - startDate.getMonth());

  if (returnDate.getDate() > startDate.getDate()) {
    months += 1;
  }

  return months <= 0 ? 1 : months;
}

export function calculateDoiSoatTraPhong(input) {
  const tienCocBanDau = safeNumber(input.tienCocBanDau);
  const tienThueConNo = safeNumber(input.tienThueConNo);
  const tienDichVuConNo = safeNumber(input.tienDichVuConNo);
  const tongChiPhiSuaChua = safeNumber(input.tongChiPhiSuaChua);
  const tienPhat = safeNumber(input.tienPhat);

  if (
    tienCocBanDau < 0 ||
    tienThueConNo < 0 ||
    tienDichVuConNo < 0 ||
    tongChiPhiSuaChua < 0 ||
    tienPhat < 0
  ) {
    throw new Error('Các khoản tiền không được âm.');
  }

  let soThangLuuTru = 0;
  let tyLeHoanCocHienTai = 0;
  // D-040: which refund case applies; the rate comes from the tenant's locked policy when it has one.
  let truongHopHoan;

  if (input.loaiHoSo === LOAI_HO_SO_TRA_PHONG.DAT_COC_CHUA_KY_HOP_DONG) {
    tyLeHoanCocHienTai = 80;
    truongHopHoan = TRUONG_HOP_HOAN.CHUA_KY;
  } else {
    const ngayBatDau = toDate(input.ngayBatDau);
    const ngayKetThuc = toDate(input.ngayKetThuc);
    const ngayTraThucTe = toDate(input.ngayTraThucTe);

    if (!ngayBatDau || !ngayKetThuc || !ngayTraThucTe) {
      throw new Error('Thiếu ngày bắt đầu, ngày kết thúc hoặc ngày trả thực tế.');
    }

    soThangLuuTru = calculateStayMonths(ngayBatDau, ngayTraThucTe);

    if (ngayTraThucTe >= ngayKetThuc) {
      tyLeHoanCocHienTai = 100;
      truongHopHoan = TRUONG_HOP_HOAN.HET_HAN;
    } else if (soThangLuuTru < 6) {
      tyLeHoanCocHienTai = 50;
      truongHopHoan = TRUONG_HOP_HOAN.DUOI_6_THANG;
    } else {
      tyLeHoanCocHienTai = 70;
      truongHopHoan = TRUONG_HOP_HOAN.TU_6_THANG;
    }
  }

  const tyLeChinhSach = input.tyLeTheoChinhSach?.[truongHopHoan];
  const nguonTyLe = Number.isFinite(tyLeChinhSach) ? 'chinh-sach' : 'mac-dinh';
  if (nguonTyLe === 'chinh-sach') tyLeHoanCocHienTai = tyLeChinhSach;

  const tienCocDuocHoan = roundMoney(tienCocBanDau * tyLeHoanCocHienTai / 100);
  const tongKhauTru = roundMoney(
    tienThueConNo +
    tienDichVuConNo +
    tongChiPhiSuaChua +
    tienPhat
  );
  const chenhLech = tienCocDuocHoan - tongKhauTru;

  let soTienHoanThucTe = 0;
  let soTienKhachPhaiTT = 0;

  if (chenhLech > 0) {
    soTienHoanThucTe = chenhLech;
  } else if (chenhLech < 0) {
    soTienKhachPhaiTT = Math.abs(chenhLech);
  }

  const loaiQuyetToan = xacDinhLoaiQuyetToan(soTienHoanThucTe, soTienKhachPhaiTT);

  return {
    soThangLuuTru,
    tyLeHoanCocHienTai,
    truongHopHoan,
    nguonTyLe,
    tienCocDuocHoan,
    tienThueConNo,
    tienDichVuConNo,
    tongChiPhiSuaChua,
    tienPhat,
    tongKhauTru,
    soTienHoanThucTe,
    soTienKhachPhaiTT,
    loaiQuyetToan
  };
}
