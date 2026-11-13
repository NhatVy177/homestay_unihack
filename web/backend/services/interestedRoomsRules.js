// D-043: luật thêm/gỡ phòng quan tâm của một hồ sơ đăng ký (không chạm DB, dễ kiểm thử).
export const MAX_INTERESTED_ROOMS = 5;
export const EDITABLE_PROFILE_STATUSES = ['Chờ tiếp nhận', 'Đã tiếp nhận'];

// Hồ sơ chỉ sửa danh sách phòng được khi chưa có lịch xem còn hiệu lực (lịch "Đã hủy" không tính).
export function checkProfileEditable({ trangThai, coLichXemConHieuLuc }) {
  if (!EDITABLE_PROFILE_STATUSES.includes(trangThai)) {
    return 'Hồ sơ này không còn ở trạng thái cho phép thêm hoặc gỡ phòng.';
  }
  if (coLichXemConHieuLuc) {
    return 'Hồ sơ đã được lập lịch xem phòng. Vui lòng nhắn nhân viên Sale hoặc gửi yêu cầu điều chỉnh lịch.';
  }
  return '';
}

// currentRooms: [{ maPhong, maChiNhanh }]; newRoom: { maPhong, maChiNhanh }.
export function checkRoomCanJoin(currentRooms, newRoom) {
  if (currentRooms.some((room) => room.maPhong === newRoom.maPhong)) return 'Phòng này đã có trong hồ sơ của bạn.';
  if (currentRooms.length >= MAX_INTERESTED_ROOMS) return `Mỗi hồ sơ chỉ quan tâm tối đa ${MAX_INTERESTED_ROOMS} phòng.`;
  if (currentRooms.length && currentRooms.some((room) => room.maChiNhanh !== newRoom.maChiNhanh)) {
    return 'Hồ sơ của bạn đang ở chi nhánh khác. Hãy gửi hồ sơ riêng cho chi nhánh này sau khi xem phòng.';
  }
  return '';
}
