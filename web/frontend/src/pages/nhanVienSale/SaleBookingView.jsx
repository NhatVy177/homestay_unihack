import React from 'react';
import { Icon } from '../../components/common/Icon.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';

// Presentation of the existing booking controller; does not create or validate a schedule itself.
// D-043: một trang — phòng khách đã chọn (bỏ phòng không phù hợp), phòng phù hợp khác, rồi chọn giờ ở cột phải.
// Ghi chú phiếu là chuỗi dài do form khách ghép lại: tách thành từng mục có nhãn, danh sách thành viên nhóm riêng cho dễ đọc.
function NoteBlocks({ text }) {
  const rows = [];
  String(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean).forEach((line) => {
    const group = line.match(/^(Nhóm \d+ người):\s*(.*)$/);
    if (group) { rows.push({ label: group[1], members: group[2].split(/;\s*(?=\d+\))/).map((item) => item.replace(/^\d+\)\s*/, '').replace(/\.$/, '')) }); return; }
    line.split(/\.\s+(?=[A-ZÀ-Ỹ])/).forEach((part) => {
      const [label, ...rest] = part.replace(/\.$/, '').split(/:\s*/);
      rows.push(rest.length ? { label, value: rest.join(': ') } : { value: label });
    });
  });
  return <div className="sale-booking-note">{rows.map((row, index) => <div className="sale-note-row" key={index}>
    {row.label && <span className="sale-note-label">{row.label}</span>}
    {row.members ? <ul>{row.members.map((member) => <li key={member}>{member}</li>)}</ul> : <span className="sale-note-value">{row.value}</span>}
  </div>)}</div>;
}

export default function SaleBookingView({ unfitInterested = [], viewingPreference = null, profile, onBack, rooms, selectedRoomIds, selectedRooms, loadingRooms, regionValid, roomError,
  formDate, setFormDate, formTime, setFormTime, formNote, setFormNote, saving, createdSchedule,
  selectionPlan, minScheduleDate, toggleRoom, handleCreateSchedule, formatMoney, formatGender, getAvailableSlots, isWholeRoomOption }) {
  // Phòng đã chọn lên đầu danh sách; còn lại giữ thứ tự hệ thống gợi ý.
  const sortedRooms = [...rooms].sort((x, y) => Number(selectedRoomIds.includes(y.maPhong)) - Number(selectedRoomIds.includes(x.maPhong)));
  const canSubmit = selectionPlan.valid && formDate && formTime && !saving;

  const renderRoom = (room) => {
    const selected = selectedRoomIds.includes(room.maPhong);
    const freeBeds = room.soGiuongTrong ?? room.soGiuongDuKienXep ?? 0;
    return <article className={`sale-room-card sale-room-row ${selected ? 'is-selected' : ''}`} key={room.maPhong} onClick={() => toggleRoom(room.maPhong)}>
      <div className="sale-room-thumb">{room.urlImg ? <img src={room.urlImg} alt={room.tenPhong} /> : <Icon name="meeting_room" />}</div>
      <div className="sale-room-info">
        <div className="sale-room-title">
          <h3>{room.tenPhong}</h3>
          {selected && <Icon name="check_circle" />}
          {room.khachQuanTam && <span className="ui-badge ui-badge--success">Khách quan tâm</span>}
        </div>
        <div className="sale-room-chips">
          <span>{room.tenChiNhanh || room.diaChi || '—'}</span>
          {room.loaiPhong && <span>{room.loaiPhong}</span>}
          <span>{isWholeRoomOption(room) ? 'Nguyên phòng' : 'Ghép giường'}</span>
          <span>{room.gioiTinhChoPhep || 'Không phân biệt'}</span>
          <span>{formatMoney(room.giaThue)}</span>
          {room.sucChua ? <span>Tối đa {room.sucChua} người</span> : null}
          <span className="sale-room-free">{freeBeds > 0 ? `Còn ${freeBeds} giường` : (room.tinhTrang || 'Khả dụng')}</span>
        </div>
      </div>
      <input type="checkbox" aria-label={`Chọn ${room.tenPhong}`} checked={selected} onChange={() => toggleRoom(room.maPhong)} onClick={(e) => e.stopPropagation()} />
    </article>;
  };

  return <div className="sale-view sale-booking">
    <div className="sale-section-heading">
      <div><p className="sale-eyebrow">LỊCH HẸN MỚI</p><h2>Lập lịch xem phòng cho {profile?.maDangKy}</h2><p>{profile?.hoTenKhach || profile?.customerName || 'Khách hàng'} · {profile?.sdtKhach || profile?.sdt || ''} · {formatGender(profile)}</p></div>
      <button type="button" className="ui-btn ui-btn--secondary" onClick={onBack}><Icon name="arrow_back" /> Quay lại</button>
    </div>

    <div className="sale-booking-layout">
      <div className="sale-booking-main">
        <section className="ui-card sale-panel sale-booking-profile" aria-label="Nhu cầu thuê">
          <dl className="sale-booking-facts">
            <div><dt>Khu vực</dt><dd>{profile?.khuVucMongMuon || 'Chưa có'}</dd></div>
            <div><dt>Loại phòng</dt><dd>{profile?.loaiPhongYeuCau || 'Chưa có'}</dd></div>
            <div><dt>Số người</dt><dd>{profile?.soNguoiO || profile?.soNguoiDuKienO || 0} người · {formatGender(profile)}</dd></div>
            <div><dt>Mức giá tối đa</dt><dd>{formatMoney(profile?.mucGia || profile?.mucGiaToiDa) || 'Chưa có'}</dd></div>
            <div><dt>Ngày khách muốn xem</dt><dd>{viewingPreference?.dateLabel || 'Chưa chọn'}</dd></div>
            <div><dt>Khung giờ rảnh</dt><dd>{viewingPreference?.slot || 'Chưa chọn'}</dd></div>
          </dl>
          {profile?.ghiChu && <NoteBlocks text={profile.ghiChu} />}
        </section>

        {!regionValid && <div className="sale-alert" role="status"><Icon name="warning" /> Khu vực mong muốn chưa khớp chi nhánh đang hoạt động. Cần liên hệ lại khách trước khi lập lịch.</div>}
        {loadingRooms && <p role="status">Đang tải danh sách phòng phù hợp...</p>}
        {!loadingRooms && roomError && <p className="sale-alert sale-alert--danger" role="alert">{roomError}</p>}

        {!loadingRooms && !roomError && <section className="ui-card sale-panel">
          <div className="sale-section-heading"><h3>Chọn phòng dẫn khách xem</h3><span className="ui-badge ui-badge--neutral">Đã chọn {selectedRooms.length} / {rooms.length}</span></div>
          <p className="sale-panel-hint">Phòng khách đã quan tâm được chọn sẵn và nằm trên cùng. Bỏ chọn phòng không còn phù hợp, hoặc tích thêm phòng khác trong danh sách.</p>
          {unfitInterested.length > 0 && <div className="sale-alert sale-alert--danger" role="status"><Icon name="warning" /> Đã bỏ ra vì không đủ điều kiện: {unfitInterested.map((room) => `${room.tenPhong} (${room.chiNhanh})`).join(', ')}. Lý do có thể là hết giường, không hợp giới tính/số người, vượt mức giá hoặc khác chi nhánh của bạn; báo khách khi gọi xác nhận lịch.</div>}
          {rooms.length === 0
            ? <EmptyState message="Không có phòng/giường phù hợp để lập lịch cho phiếu này." />
            : <div className="sale-room-list">{sortedRooms.map(renderRoom)}</div>}
          {selectedRooms.length > 0 && <div className={`sale-alert ${selectionPlan.valid ? 'sale-selection-valid' : 'sale-alert--danger'}`} role="status"><Icon name={selectionPlan.valid ? 'check_circle' : 'warning'} /><span>{selectionPlan.message}</span></div>}
        </section>}
      </div>

      <aside className="ui-card sale-panel sale-booking-aside">
        <h3><Icon name="event_note" /> Lập lịch xem phòng</h3>
        <div className="sale-booking-picked">
          <div><span>Khách hàng</span><strong>{profile?.hoTenKhach || profile?.customerName || profile?.maDangKy}</strong></div>
          <div><span>Phòng đã chọn</span><strong>{selectedRooms.length ? selectedRooms.map((room) => room.tenPhong).join(', ') : 'Chưa chọn'}</strong></div>
        </div>
        {viewingPreference?.summary && <p className="sale-panel-hint">Khách mong muốn: {viewingPreference.summary}</p>}
        <label className="ui-form-field">Ngày xem phòng<input className="ui-input" type="date" min={minScheduleDate} value={formDate} onChange={(e) => setFormDate(e.target.value)} /></label>
        <label className="ui-form-field">Giờ hẹn<input className="ui-input" type="time" min="07:00" max="17:00" step="900" value={formTime} onChange={(e) => setFormTime(e.target.value)} /></label>
        <label className="ui-form-field">Ghi chú gửi khách<textarea className="ui-textarea" rows="3" value={formNote} onChange={(e) => setFormNote(e.target.value)} placeholder="VD: Khách đến cổng chính, gọi Sale khi tới nơi..." /></label>
        <button className="ui-btn ui-btn--primary sale-booking-submit" disabled={!canSubmit} onClick={handleCreateSchedule}>
          {saving ? 'Đang lưu...' : <>Tạo lịch hẹn &amp; gửi cho khách <Icon name="arrow_forward" /></>}
        </button>
        {!selectionPlan.valid && selectedRooms.length > 0 && <p className="sale-panel-hint">Sửa danh sách phòng trước khi tạo lịch.</p>}
      </aside>
    </div>

    {createdSchedule && <div className="ktp-modal-overlay sale-modal"><div className="ktp-modal sale-success" role="dialog" aria-modal="true" aria-labelledby="sale-booking-success"><div className="ktp-modal-body"><span className="sale-success-mark"><Icon name="check_circle" /></span><h3 id="sale-booking-success">Đã lập lịch xem phòng</h3><p>Lịch {createdSchedule.id || profile.maDangKy} đã được lưu cho phiếu {profile.maDangKy}.</p><button className="ui-btn ui-btn--primary" onClick={onBack}>Hoàn tất</button></div></div></div>}
  </div>;
}
