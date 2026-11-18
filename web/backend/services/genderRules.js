// Luật giới tính khi chọn phòng (J-C105): chặn từ lúc đăng ký/quan tâm/giữ chỗ, không đợi tới lúc khai cư trú.
// Phòng trống hẳn có GioiTinhChoPhep = "Không phân biệt"; phòng đã có người cọc/ở bị khóa "Nam" hoặc "Nữ".
const norm = (value) => String(value ?? '').trim().toLocaleLowerCase('vi-VN');
const UNRESTRICTED = ['', 'không phân biệt', 'nam và nữ', 'khác', 'hỗn hợp'];

// Giới tính của hồ sơ: 'Nam' | 'Nữ' | 'Hỗn hợp' (có cả nam và nữ) | null (chưa rõ).
export function loaiGioiTinhHoSo({ gioiTinh, soNam, soNu } = {}) {
  const nam = Number(soNam) || 0;
  const nu = Number(soNu) || 0;
  if (nam > 0 && nu > 0) return 'Hỗn hợp';
  if (nam > 0) return 'Nam';
  if (nu > 0) return 'Nữ';
  const own = norm(gioiTinh);
  if (own === 'nam') return 'Nam';
  if (own === 'nữ') return 'Nữ';
  return null;
}

// Trả chuỗi lý do nếu phòng không hợp giới tính hồ sơ, rỗng nếu hợp.
export function checkRoomGender(profileGender, roomGender, roomName = 'Phòng này') {
  if (!profileGender || UNRESTRICTED.includes(norm(roomGender))) return '';
  if (profileGender === 'Hỗn hợp') {
    return `${roomName} chỉ dành cho ${roomGender}. Nhóm có cả nam và nữ chỉ chọn được phòng không phân biệt giới tính.`;
  }
  if (norm(profileGender) !== norm(roomGender)) {
    return `${roomName} chỉ dành cho ${roomGender}, không phù hợp giới tính của hồ sơ (${profileGender}).`;
  }
  return '';
}

export function checkRoomForRentGroup(profileGender, room, people) {
  const name = room.tenPhong || room.maPhong || 'Phòng này';
  const issue = checkRoomGender(profileGender, room.gioiTinhChoPhep, name);
  if (issue) return issue;
  if (profileGender === 'Hỗn hợp' && room.coTheThueNguyenPhong === false) {
    return `Nhóm có cả nam và nữ cần thuê nguyên phòng. ${name} chưa trống toàn bộ giường.`;
  }
  if (people > 1 && Number(room.sucChua) > 0 && people > Number(room.sucChua)) {
    return `${name} chỉ có sức chứa tối đa ${room.sucChua} người.`;
  }
  if (people > 1 && room.soGiuongTrong != null && Number(room.soGiuongTrong) < people) {
    return `${name} chưa có đủ giường trống cho ${people} người.`;
  }
  return '';
}

// Người ở khai ở bước cư trú không được nhiều hơn số nam/số nữ đã đăng ký.
export function checkResidentsGender(members = [], { soNam, soNu } = {}) {
  const nam = Number(soNam) || 0;
  const nu = Number(soNu) || 0;
  if (nam + nu === 0) return '';
  const countNam = members.filter((member) => member.gioiTinh === 'Nam').length;
  const countNu = members.filter((member) => member.gioiTinh === 'Nữ').length;
  if (countNam > nam || countNu > nu) {
    return `Giới tính người ở không khớp phiếu đăng ký (${nam} nam, ${nu} nữ). Vui lòng kiểm tra lại giới tính từng người.`;
  }
  return '';
}
