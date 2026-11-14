// Diễn giải cách tính tiền cọc do backend trả về (services/tienCoc.js).
const vnd = (value) => `${Math.round(Number(value) || 0).toLocaleString('vi-VN')}đ`;

export function moTaCachTinhCoc(cachTinh) {
  if (!cachTinh?.dong?.length) return '';
  const parts = cachTinh.dong.map((dong) => (dong.donVi === 'phòng'
    ? `${vnd(dong.donGia)}/tháng (nguyên phòng)`
    : `${vnd(dong.donGia)}/giường × ${dong.soLuong} giường`));
  const motThang = parts.length > 1 ? `(${parts.join(' + ')})` : parts[0];
  return `${motThang} × ${cachTinh.soThang} tháng = ${vnd(cachTinh.tong)}`;
}
