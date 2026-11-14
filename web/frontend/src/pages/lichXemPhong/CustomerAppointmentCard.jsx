import React, { useState } from 'react';
import { Icon } from '../../components/common/Icon.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { canUseReschedule } from './ViewingRequestModals.jsx';
import { endedViewing, viewingDate, viewingTime, viewingRoom, viewingState, asViewingAppointment } from './viewingPresentation.js';
export default function CustomerAppointmentCard({row,busy,onConfirm,onReschedule,onCancel,onViewDetail}){
  const [failedImage,setFailedImage]=useState(false);
  const roomCode=String(row.maPhong||'').split(',')[0].trim();
  const image=row.hinhAnhPhong||(roomCode?`/images/phong/${roomCode}/cover.jpg`:null);
  const [label,tone]=viewingState(row),ended=endedViewing(row),appointment=asViewingAppointment(row);
  const ready=row.xacNhanLichSanSang===true&&Number.isInteger(row.phienBanLich);
  const confirmable=!ended&&row.trangThai==='Chờ xem'&&!row.khachDaXacNhanLich&&ready;
  const phone=String(row.sdtNhanVienSale||row.soDienThoaiNhanVienSale||'').replace(/[^\d+]/g,'');
  return <article className="ui-card customer-viewing-card" aria-label={`Lịch ${row.id}`}>
    <div className="customer-viewing-card-head">
      <div className="customer-viewing-room-image">{image&&!failedImage?<img src={image} alt={viewingRoom(row)} onError={()=>setFailedImage(true)}/>:<Icon name="meeting_room"/>}</div>
      <div className="customer-viewing-card-title"><button type="button" onClick={()=>onViewDetail?.(row)}>{viewingRoom(row)}</button><small>Mã lịch: {row.id}</small></div>
      <StatusBadge status={label} tone={tone}/>
    </div>
    <ul className="customer-viewing-info"><li><Icon name="map"/>{row.tenChiNhanh||row.diaChi||row.maChiNhanh||'Chi nhánh sẽ được nhân viên thông báo'}</li><li><Icon name="event_note"/>{viewingDate(row.thoiGianHen)} lúc {viewingTime(row.thoiGianHen)}</li><li><Icon name="person"/>{row.tenNhanVienSale||'Chưa cập nhật nhân viên hướng dẫn'}</li></ul>
    <ol className="customer-viewing-steps" aria-label="Tiến trình lịch xem phòng">
      <li className="is-complete"><span><Icon name="event_note"/></span><strong>Đã lên lịch</strong></li>
      <li className={row.khachDaXacNhanLich?'is-complete':''}><span><Icon name="check_circle"/></span><strong>{row.khachDaXacNhanLich?'Đã xác nhận':ended?'Chưa có thông tin xác nhận':'Chờ xác nhận'}</strong></li>
      <li className={ended?'is-complete':''}><span><Icon name={row.trangThai==='Đã hủy'?'cancel':'hourglass_empty'}/></span><strong>{ended?row.trangThai:'Hoàn tất'}</strong></li>
    </ol>
    {row.khachDaXacNhanLich&&row.thoiGianKhachXacNhan&&<p className="customer-viewing-hint">Đã xác nhận lúc {viewingTime(row.thoiGianKhachXacNhan)} · {viewingDate(row.thoiGianKhachXacNhan)}</p>}
    {!ended&&<div className="customer-viewing-card-actions">
      <button type="button" className={`ui-btn ${row.khachDaXacNhanLich?'ui-btn--secondary':'ui-btn--primary'}`} disabled={!confirmable||busy} onClick={()=>onConfirm(row)}><Icon name="check_circle"/>{busy?'Đang xác nhận...':row.khachDaXacNhanLich?'Đã xác nhận':'Xác nhận lịch'}</button>
      <button type="button" className="ui-btn ui-btn--secondary" disabled={busy||row.trangThai!=='Chờ xem'||!canUseReschedule(appointment)} onClick={()=>onReschedule(appointment)} title="Yêu cầu đổi lịch trước giờ hẹn ít nhất 2 tiếng"><Icon name="event_repeat"/>Đổi lịch hẹn</button>
      <button type="button" className="ui-btn ui-btn--danger" disabled={busy||row.trangThai==='Yêu cầu hủy'} onClick={()=>onCancel(appointment)}><Icon name="cancel"/>Hủy lịch</button>
      {phone?<a className="ui-btn ui-btn--secondary" href={`tel:${phone}`}><Icon name="call"/>Liên hệ NV</a>:<button className="ui-btn ui-btn--secondary" type="button" disabled title="Chưa cập nhật số điện thoại nhân viên"><Icon name="call"/>Liên hệ NV</button>}
    </div>}
    {!ended&&!ready&&<p className="customer-viewing-hint">Chức năng xác nhận lịch chưa sẵn sàng. Vui lòng liên hệ nhân viên để được hỗ trợ.</p>}
    {!ended&&row.trangThai==='Chờ xem'&&!row.khachDaXacNhanLich&&ready&&<p className="customer-viewing-hint">Vui lòng xác nhận ngày giờ hẹn. Nếu lịch được đổi, bạn cần xác nhận lại.</p>}
  </article>;
}
