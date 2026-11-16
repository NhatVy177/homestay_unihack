// Deliberately expose only room presentation data, not resident or internal asset-cost fields.
export function toPublicRoomDetail(room) {
  if (!room) return null;
  const keys = ['id', 'maPhong', 'tenPhong', 'loaiPhong', 'moTa', 'sucChua', 'gioiTinhChoPhep', 'chiNhanh', 'diaChi', 'giaTheoGiuong', 'giaThueTheoGiuong', 'giaNguyenPhong', 'giaThueNguyenPhong', 'giaThue', 'tang', 'soChoTrong', 'trangThaiQuanTam', 'anhDai', 'urlImg'];
  const result = Object.fromEntries(keys.filter(key => room[key] !== undefined).map(key => [key, room[key]]));
  const pick = (items, allowed) => (Array.isArray(items) ? items : []).map(item => Object.fromEntries(allowed.filter(key => item[key] !== undefined).map(key => [key, item[key]])));
  result.hinhAnh = pick(room.hinhAnh, ['stt', 'sttAnh', 'urlAnh', 'urlImg', 'moTa']);
  result.tienNghi = pick(room.tienNghi, ['maTaiSan', 'tenTaiSan', 'tenTienNghi', 'soLuong']);
  result.dichVuUocTinh = pick(room.dichVuUocTinh, ['maDichVu', 'tenDichVu', 'donGia', 'donViTinh']);
  return result;
}
