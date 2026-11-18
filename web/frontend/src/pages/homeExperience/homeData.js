export const ROOM_IMAGES = {
  LP0001: '/images/home/dorm.jpg', LP0002: '/images/home/hero.jpg',
  LP0003: '/images/home/room.jpg', LP0004: '/images/home/living.jpg',
};
export const CONTACT_PHONE = '0795749721';
export const imageFor = room => room?.UrlImg || ROOM_IMAGES[room?.MaLoaiPhong] || ROOM_IMAGES.LP0001;
export const priceFor = room => Number(room?.GiaThueTheoGiuong || room?.GiaThueNguyenPhong || 0);
export const money = value => Number(value).toLocaleString('vi-VN') + 'đ';
export const unitFor = room => room?.GiaThueTheoGiuong ? 'giường/tháng' : 'phòng/tháng';
export function imageFallback(event) {
  if (event.currentTarget.getAttribute('src') !== ROOM_IMAGES.LP0001) event.currentTarget.src = ROOM_IMAGES.LP0001;
}
export function normalizeRoom(room) {
  return {
    ...room, MaPhong: room.MaPhong || room.maPhong || room.id,
    TenPhong: room.TenPhong || room.tenPhong, TenLoaiPhong: room.TenLoaiPhong || room.loaiPhong,
    GioiTinhChoPhep: room.gioiTinhChoPhep ?? room.GioiTinhChoPhep,
    GiaThueTheoGiuong: room.GiaThueTheoGiuong ?? room.giaTheoGiuong,
    GiaThueNguyenPhong: room.GiaThueNguyenPhong ?? room.giaNguyenPhong,
    TenChiNhanh: room.TenChiNhanh || room.chiNhanh, DiaChi: room.DiaChi || room.diaChi,
    UrlImg: room.UrlImg || room.urlImg, SucChuaToiDa: room.SucChuaToiDa ?? room.sucChua,
  };
}
// Area reference points from OpenStreetMap/Nominatim, queried 2026-11-17.
// Public place reference points, not geocoded building entrances; the map labels them accordingly.
const AREAS = [
  { match: /quận 1\b/i, center: [106.6996264, 10.7753939], name: 'Quận 1' },
  { match: /bình thạnh/i, center: [106.7033938, 10.8111809], name: 'Bình Thạnh' },
  { match: /thủ đức/i, center: [106.7716521, 10.8464061], name: 'Thủ Đức' },
];
export function groupBranches(rooms, branches = []) {
  const names = new Set([...branches.map(b => b.tenChiNhanh), ...rooms.map(r => r.TenChiNhanh)].filter(Boolean));
  return [...names].map(name => {
    const branchRooms = rooms.filter(room => room.TenChiNhanh === name);
    const address = branches.find(b => b.tenChiNhanh === name)?.diaChi || branchRooms[0]?.DiaChi || '';
    const area = AREAS.find(item => item.match.test(address + ' ' + name));
    return { name, address, rooms: branchRooms, center: area?.center, area: area?.name, image: imageFor(branchRooms[0]) };
  });
}
