import React from 'react';
import { Icon } from '../../components/common/Icon.jsx';
import { dateLabel, timeLabel } from './salePresentation.js';

export function UpcomingAppointments({ schedules, loading, error, onSelect }) {
  const now = Date.now();
  const upcoming = schedules.filter(schedule => {
    const time = new Date(schedule.thoiGianHen).getTime();
    return time >= now && time <= now + 24 * 60 * 60 * 1000
      && !['Đã hủy', 'Đã xem', 'Khách không đến'].includes(schedule.trangThai);
  }).sort((a, b) => new Date(a.thoiGianHen) - new Date(b.thoiGianHen));

  return <section className="ui-card sale-upcoming-card" aria-label="Lịch hẹn 24 giờ tới">
    <div className="sale-section-heading"><h2>Lịch hẹn 24h tới</h2><Icon name="event_note" /></div>
    {loading ? <p role="status">Đang tải lịch hẹn...</p> : error ? <p>Chưa tải được lịch hẹn. Vui lòng bấm Làm mới.</p>
      : upcoming.length ? <div className="sale-upcoming-list">{upcoming.map(schedule => <button key={schedule.id} type="button" onClick={() => onSelect(schedule.id)}>
        <strong>{schedule.hoTenKhach}</strong><span>{timeLabel(schedule.thoiGianHen)} · {dateLabel(schedule.thoiGianHen)}</span><small>{schedule.danhSachPhong || schedule.maPhong || 'Chưa có phòng'}</small>
      </button>)}</div>
      : <div className="sale-upcoming-empty"><Icon name="event_note" /><p>Không có lịch hẹn sắp tới</p></div>}
  </section>;
}

export function AppointmentProgress({ schedule }) {
  const viewed = schedule.trangThai === 'Đã xem';
  const stopped = ['Đã hủy', 'Khách không đến'].includes(schedule.trangThai);
  const waitingConfirm = !schedule.khachDaXacNhanLich && !viewed && !stopped;
  return <ol className="sale-appointment-progress" aria-label="Tiến trình lịch hẹn">
    <li className="is-complete"><strong>Lên lịch</strong><p>Hẹn lúc {timeLabel(schedule.thoiGianHen)} · {dateLabel(schedule.thoiGianHen)}</p>{schedule.tenNhanVienSale && <small>Sale phụ trách: {schedule.tenNhanVienSale}</small>}</li>
    <li className={schedule.khachDaXacNhanLich?'is-complete':waitingConfirm?'is-current':''}><strong>Xác nhận lịch</strong><p>{schedule.khachDaXacNhanLich?'Khách đã xác nhận':viewed||stopped?'Chưa có thông tin xác nhận':'Chờ khách xác nhận'}</p>{schedule.thoiGianKhachXacNhan&&<small>{timeLabel(schedule.thoiGianKhachXacNhan)} · {dateLabel(schedule.thoiGianKhachXacNhan)}</small>}</li>
    <li className={viewed ? 'is-complete' : stopped ? 'is-stopped' : waitingConfirm ? '' : 'is-current'}><strong>Buổi xem</strong><p>{schedule.trangThai || 'Chưa cập nhật trạng thái'}</p></li>
    <li className={schedule.daGuiYeuCauDatCoc ? 'is-complete' : ''}><strong>Giữ chỗ</strong><p>{schedule.daGuiYeuCauDatCoc ? 'Đã gửi yêu cầu đặt cọc' : 'Chưa có yêu cầu giữ chỗ'}</p></li>
  </ol>;
}
