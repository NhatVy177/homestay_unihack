const DEMO_ROOM_IMAGES = [
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1400&q=85'
];

export function formatMoney(value) {
  const amount = Number(value);
  if (value == null || value === '' || !Number.isFinite(amount) || amount <= 0) return 'Chưa cập nhật';
  return amount.toLocaleString('vi-VN') + 'đ/tháng';
}

export function formatServiceMoney(value, unit) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 'Chưa cập nhật';
  return `${amount.toLocaleString('vi-VN')}đ${unit ? `/${unit}` : ''}`;
}

export function getRoomFloor(maPhong) {
  const numberPart = String(maPhong || '').match(/\d+/)?.[0];
  const roomNumber = Number(numberPart);
  if (!Number.isFinite(roomNumber) || roomNumber < 100) return null;
  return Math.floor(roomNumber / 100);
}

export function getDemoRoomImage(maPhong, index = 0) {
  const numberPart = String(maPhong || '').match(/\d+/)?.[0];
  const offset = Number(numberPart || 0);
  return DEMO_ROOM_IMAGES[(offset + index) % DEMO_ROOM_IMAGES.length];
}

function unwrapApiPayload(payload) {
  if (payload && typeof payload === 'object' && !Array.isArray(payload) && payload.data && typeof payload.data === 'object') {
    return payload.data;
  }
  return payload || {};
}

function normalizeImageItems(source) {
  const rawImages = Array.isArray(source)
    ? source
    : (source?.hinhAnh || source?.hinhAnhs || source?.anh || source?.images || source?.danhSachAnh || []);
  const images = Array.isArray(rawImages) ? rawImages : [];

  return images
    .map((image, index) => {
      const urlAnh = image?.urlAnh || image?.urlImg || image?.UrlImg || image?.UrlAnh || image?.url || image?.duongDan;
      if (!urlAnh) return null;
      return {
        stt: image?.stt || image?.STTAnh || image?.sttAnh || image?.id || index + 1,
        urlAnh,
        moTa: image?.moTa || image?.MoTa || image?.alt || ''
      };
    })
    .filter(Boolean);
}

export function normalizeRoomDetail(payload, fallback = {}) {
  const raw = unwrapApiPayload(payload);
  const merged = { ...fallback, ...raw };
  const images = normalizeImageItems(merged);
  const fallbackImage = merged.anhDai || merged.urlImg || merged.urlAnh || merged.UrlImg || merged.UrlAnh;

  const maPhong = merged.maPhong || merged.MaPhong || merged.id || fallback.maPhong || fallback.MaPhong || fallback.id || '';
  const tenPhong = merged.tenPhong || merged.TenPhong || fallback.tenPhong || fallback.TenPhong || maPhong;
  const giaThue = merged.giaThue ?? merged.GiaThue ?? merged.giaThueHangThang ?? merged.giaThueTheoGiuong ?? fallback.giaThue ?? fallback.GiaThue ?? null;
  const normalizedImages = images.map((image, index) => ({
    ...image,
    fallbackUrl: image.fallbackUrl || getDemoRoomImage(maPhong, index)
  }));
  const demoImages = DEMO_ROOM_IMAGES.map((_, index) => ({
    stt: index + 1,
    urlAnh: getDemoRoomImage(maPhong, index),
    moTa: `${tenPhong} - ảnh minh họa ${index + 1}`,
    laAnhDemo: true
  }));
  const fallbackImages = fallbackImage
    ? [
        { stt: 1, urlAnh: fallbackImage, moTa: tenPhong || '', fallbackUrl: getDemoRoomImage(maPhong, 0) },
        ...DEMO_ROOM_IMAGES.slice(1).map((_, index) => ({
          stt: index + 2,
          urlAnh: getDemoRoomImage(maPhong, index + 1),
          moTa: `${tenPhong} - ảnh minh họa ${index + 2}`,
          laAnhDemo: true
        }))
      ]
    : demoImages;
  const hinhAnh = normalizedImages.length ? normalizedImages : fallbackImages;
  const tienNghi = Array.isArray(merged.tienNghi)
    ? merged.tienNghi
    : (Array.isArray(merged.taiSan) ? merged.taiSan : []);
  const dichVuUocTinh = Array.isArray(merged.dichVuUocTinh) ? merged.dichVuUocTinh : [];

  return {
    ...merged,
    id: merged.id || maPhong,
    maPhong,
    tenPhong,
    gioiTinhChoPhep: merged.gioiTinhChoPhep || merged.GioiTinhChoPhep || fallback.gioiTinhChoPhep || '',
    hinhThucThue: merged.hinhThucThue || merged.HinhThucThue || fallback.hinhThucThue || '',
    loaiPhong: merged.loaiPhong || merged.TenLoaiPhong || merged.loaiPhongYeuCau || fallback.loaiPhong || '',
    moTa: merged.moTa || merged.MoTa || fallback.moTa || '',
    sucChua: merged.sucChua ?? merged.SucChuaToiDa ?? merged.toiDa ?? fallback.sucChua ?? '',
    tang: merged.tang ?? merged.Tang ?? fallback.tang ?? getRoomFloor(maPhong),
    giaThue,
    giaThueTheoGiuong: merged.giaThueTheoGiuong ?? merged.GiaThueTheoGiuong ?? fallback.giaThueTheoGiuong,
    chiNhanh: merged.chiNhanh || merged.TenChiNhanh || fallback.chiNhanh || '',
    diaChi: merged.diaChi || merged.DiaChi || fallback.diaChi || '',
    anhDai: merged.anhDai || hinhAnh[0]?.urlAnh || fallback.anhDai,
    hinhAnh,
    tienNghi,
    dichVuUocTinh
  };
}
