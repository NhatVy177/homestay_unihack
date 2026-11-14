export const endedViewing = row => ['Đã xem','Đã hủy','Khách không đến'].includes(row.trangThai);
export function viewingState(row){
  const states={'Đã xem':['Đã hoàn thành','success'],'Đã hủy':['Đã hủy','danger'],'Khách không đến':['Khách không đến','neutral'],'Yêu cầu đổi lịch':['Chờ xử lý đổi lịch','warning'],'Yêu cầu hủy':['Chờ xử lý hủy','warning']};
  return states[row.trangThai] || (row.khachDaXacNhanLich?['Đã xác nhận','success']:['Chờ xác nhận','warning']);
}
export function viewingDate(value){const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleDateString('vi-VN'):'Chưa cập nhật ngày';}
export function viewingTime(value){const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}):'Chưa cập nhật giờ';}
export function viewingDay(value){const d=new Date(value);return Number.isFinite(d.getTime())?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:'';}
export const viewingRoom = row => row.phongXem || row.danhSachPhong || row.maPhong || 'Lịch xem phòng';
export const asViewingAppointment = row => ({id:row.id,roomName:viewingRoom(row),rawSchedule:row});
