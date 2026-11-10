import React from 'react';
import { Icon } from '../../components/common/Icon.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';

// Presentation of the existing booking controller; does not create or validate a schedule itself.
export default function SaleBookingView({ profile, onBack, rooms, selectedRoomIds, selectedRooms, loadingRooms, regionValid, roomError,
  step, setStep, formDate, setFormDate, formTime, setFormTime, formNote, setFormNote, saving, createdSchedule,
  selectionPlan, minScheduleDate, toggleRoom, handleCreateSchedule, formatMoney, formatGender, getAvailableSlots, isWholeRoomOption }) {
  return <div className="sale-view sale-booking">
    <div className="sale-section-heading"><div><p className="sale-eyebrow">LỊCH HẸN MỚI</p><h2>Lập lịch xem phòng cho {profile?.maDangKy}</h2><p>{profile?.hoTenKhach || profile?.customerName || 'Khách hàng'} · {profile?.sdtKhach || profile?.sdt || ''} · {formatGender(profile)}</p></div><button type="button" className="ui-btn ui-btn--secondary" onClick={onBack}><Icon name="arrow_back" /> Quay lại</button></div>
    <div className="sale-stepper" aria-label="Các bước lập lịch">{['rooms', 'time'].map((item, i) => <span className={step === item ? 'is-active' : ''} key={item}><strong>{i + 1}</strong>{item === 'rooms' ? 'Chọn phòng' : 'Thời gian hẹn'}</span>)}</div>
    <section className="sale-booking-summary" aria-label="Nhu cầu thuê">
      <div><span>Khu vực</span><strong>{profile?.khuVucMongMuon || 'Chưa có'}</strong></div>
      <div><span>Loại phòng mong muốn</span><strong>{profile?.loaiPhongYeuCau || 'Chưa có'}</strong></div>
      <div><span>Người ở</span><strong>{profile?.soNguoiO || profile?.soNguoiDuKienO || 0} người · {formatGender(profile)}</strong></div>
      <div><span>Mức giá tối đa</span><strong>{formatMoney(profile?.mucGia || profile?.mucGiaToiDa) || 'Chưa có'}</strong></div>
    </section>
    {step === 'rooms' && <>
      {!regionValid && <div className="sale-alert" role="status"><Icon name="warning" /> Khu vực mong muốn chưa khớp chi nhánh đang hoạt động. Cần liên hệ lại khách trước khi lập lịch.</div>}
      {loadingRooms && <p role="status">Đang tải danh sách phòng phù hợp...</p>}
      {!loadingRooms && roomError && <p className="sale-alert sale-alert--danger" role="alert">{roomError}</p>}
      {!loadingRooms && !roomError && rooms.length === 0 && <EmptyState message="Không có phòng/giường phù hợp để lập lịch cho phiếu này." />}
      {!loadingRooms && rooms.length > 0 && <div className="sale-room-grid">{rooms.map(room => {
        const selected = selectedRoomIds.includes(room.maPhong);
        return <article className={`ktp-detail-card ui-card sale-room-card ${selected ? 'is-selected' : ''}`} key={room.maPhong} onClick={() => toggleRoom(room.maPhong)}>
          <div className="sale-room-image">{room.urlImg ? <img src={room.urlImg} alt={room.tenPhong} /> : <Icon name="meeting_room" />}</div>
          <div className="sale-room-body"><div className="sale-section-heading"><div><h3>{room.tenPhong}</h3><p>{room.loaiPhong}</p></div><input type="checkbox" aria-label={`Chọn ${room.tenPhong}`} checked={selected} onChange={() => toggleRoom(room.maPhong)} onClick={e => e.stopPropagation()} /></div>
            <p>{isWholeRoomOption(room) ? 'Nguyên phòng' : 'Ghép giường'}</p><dl className="sale-definition"><div><dt>Chi nhánh</dt><dd>{room.tenChiNhanh || room.diaChi || '—'}</dd></div><div><dt>Giới tính</dt><dd>{room.gioiTinhChoPhep || 'Không phân biệt'}</dd></div><div><dt>Giường trống</dt><dd>{room.soGiuongTrong ?? room.soGiuongDuKienXep ?? 0}</dd></div><div><dt>Số chỗ có thể xếp</dt><dd>{getAvailableSlots(room)} chỗ</dd></div></dl>
            {room.danhSachGiuong?.length > 0 && <p>Giường: {room.danhSachGiuong.join(', ')}</p>}<div className="sale-room-footer"><span className="ui-badge ui-badge--success">{room.tinhTrang || 'Khả dụng'}</span><strong>{formatMoney(room.giaThue)}</strong></div>
          </div>
        </article>;
      })}</div>}
      {selectedRooms.length > 0 && <div className={`sale-alert ${selectionPlan.valid ? 'sale-selection-valid' : 'sale-alert--danger'}`} role="status"><Icon name={selectionPlan.valid ? 'check_circle' : 'warning'} /><span>{selectionPlan.message}</span></div>}
      <div className="sale-actions sale-booking-footer"><button className="ui-btn ui-btn--primary" disabled={!selectionPlan.valid} onClick={() => setStep('time')}>Tiếp tục <Icon name="arrow_forward" /></button></div>
    </>}
    {step === 'time' && <div className="sale-booking-time"><section className="ui-card sale-panel"><h3>Thời gian xem phòng</h3><div className="sale-form-grid">
      <label className="ui-form-field">Ngày xem phòng<input className="ui-input" type="date" min={minScheduleDate} value={formDate} onChange={e => setFormDate(e.target.value)} /></label>
      <label className="ui-form-field">Giờ hẹn<input className="ui-input" type="time" min="07:00" max="17:00" step="900" value={formTime} onChange={e => setFormTime(e.target.value)} /></label>
      <label className="ui-form-field sale-form-wide">Ghi chú<textarea className="ui-textarea" rows="3" value={formNote} onChange={e => setFormNote(e.target.value)} placeholder="VD: Khách muốn xem phòng vào cổng chính..." /></label>
    </div><div className="sale-actions sale-booking-footer"><button className="ui-btn ui-btn--secondary" onClick={() => setStep('rooms')}>Quay lại chọn phòng</button><button className="ui-btn ui-btn--primary" disabled={!formDate || !formTime || saving} onClick={handleCreateSchedule}>{saving ? 'Đang lưu...' : 'Lưu lịch hẹn'}</button></div></section>
      <aside className="ui-card sale-panel"><h3>Phòng đã chọn</h3><p>Một buổi xem · {selectedRooms.length} phòng</p>{selectedRooms.map(room => <div className="sale-record" key={room.maPhong}><strong>{room.tenPhong}</strong><span>{room.tenChiNhanh || room.diaChi}</span></div>)}</aside>
    </div>}
    {createdSchedule && <div className="ktp-modal-overlay sale-modal"><div className="ktp-modal sale-success" role="dialog" aria-modal="true" aria-labelledby="sale-booking-success"><div className="ktp-modal-body"><Icon name="check_circle" /><h3 id="sale-booking-success">Đã lập lịch xem phòng</h3><p>Lịch {createdSchedule.id || profile.maDangKy} đã được lưu cho phiếu {profile.maDangKy}.</p><button className="ui-btn ui-btn--primary" onClick={onBack}>Hoàn tất</button></div></div></div>}
  </div>;
}
