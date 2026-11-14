// Luật giới tính khi chọn phòng (khớp backend services/genderRules.js, J-C105).
const norm = (value) => String(value ?? '').trim().toLocaleLowerCase('vi-VN');
const UNRESTRICTED = ['', 'không phân biệt', 'nam và nữ', 'khác', 'hỗn hợp'];

// 'Nam' | 'Nữ' | 'Hỗn hợp' | null (chưa rõ). Đọc số nam/nữ trước, rồi giới tính thuê.
export function loaiGioiTinhHoSo({ gioiTinhThue, gioiTinh, soNam, soNu } = {}) {
  const nam = Number(soNam) || 0;
  const nu = Number(soNu) || 0;
  if (nam > 0 && nu > 0) return 'Hỗn hợp';
  if (nam > 0) return 'Nam';
  if (nu > 0) return 'Nữ';
  const own = norm(gioiTinhThue || gioiTinh);
  if (own === 'nam') return 'Nam';
  if (own === 'nữ') return 'Nữ';
  return null;
}

export function lyDoPhongKhongHopGioiTinh(profileGender, roomGender, roomName = 'Phòng này') {
  if (!profileGender || UNRESTRICTED.includes(norm(roomGender))) return '';
  if (profileGender === 'Hỗn hợp') return `${roomName} chỉ dành cho ${roomGender}. Nhóm có cả nam và nữ chỉ chọn được phòng không phân biệt giới tính.`;
  if (norm(profileGender) !== norm(roomGender)) return `${roomName} chỉ dành cho ${roomGender}, không phù hợp giới tính đã chọn (${profileGender}).`;
  return '';
}

// Người ở khai ở bước cư trú không được nhiều hơn số nam/số nữ đã đăng ký.
export function checkResidentsGender(members = [], { soNam, soNu } = {}) {
  const nam = Number(soNam) || 0;
  const nu = Number(soNu) || 0;
  if (nam + nu === 0) return '';
  const countNam = members.filter((member) => member.gioiTinh === 'Nam').length;
  const countNu = members.filter((member) => member.gioiTinh === 'Nữ').length;
  if (countNam > nam || countNu > nu) return `Giới tính người ở không khớp phiếu đăng ký (${nam} nam, ${nu} nữ). Vui lòng kiểm tra lại giới tính từng người.`;
  return '';
}
