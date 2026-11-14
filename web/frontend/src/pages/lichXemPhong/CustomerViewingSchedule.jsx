import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../../components/common/Icon.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ResultModal from '../../components/common/ResultModal.jsx';
import CustomerAppointmentCard from './CustomerAppointmentCard.jsx';
import ViewingMonthCalendar from './ViewingMonthCalendar.jsx';
import { RescheduleModal, CancelModal } from './ViewingRequestModals.jsx';
import { endedViewing, viewingDay } from './viewingPresentation.js';
import { lichXemPhongApi } from './lichXemPhong.api.js';
import './customerViewingSchedule.css';

const EMPTY_SCHEDULES=[];
export default function CustomerViewingSchedule({schedules=EMPTY_SCHEDULES,onViewRoomDetail,onReschedule,onCancel}){
  const [rows,setRows]=useState(schedules),[draft,setDraft]=useState(''),[query,setQuery]=useState(''),[group,setGroup]=useState('active'),[selectedDay,setSelectedDay]=useState('');
  const [reschedule,setReschedule]=useState(null),[cancel,setCancel]=useState(null),[busy,setBusy]=useState(''),[loading,setLoading]=useState(false),[error,setError]=useState(''),[result,setResult]=useState(null);
  const confirming=useRef(false);
  useEffect(()=>{setRows(schedules);},[schedules]);
  const searched=rows.filter(row=>[row.id,row.maDangKy,row.hoTenKhach,row.sdtKhach,row.emailKhach,row.phongXem,row.danhSachPhong,row.maPhong,row.tenNhanVienSale].filter(Boolean).join(' ').toLocaleLowerCase('vi-VN').includes(query.toLocaleLowerCase('vi-VN')));
  const groups={all:searched,active:searched.filter(row=>!endedViewing(row)),past:searched.filter(endedViewing),done:searched.filter(row=>row.trangThai==='Đã xem'),cancelled:searched.filter(row=>row.trangThai==='Đã hủy')};
  const visible=(groups[group]||groups.active).filter(row=>!selectedDay||viewingDay(row.thoiGianHen)===selectedDay).sort((a,b)=>new Date(a.thoiGianHen)-new Date(b.thoiGianHen));
  async function refresh(){
    setLoading(true);setError('');
    try{const response=await lichXemPhongApi.getAll();setRows(response.data||[]);}
    catch(err){setError(err.response?.data?.message||'Không tải được lịch hẹn. Vui lòng thử lại.');}
    finally{setLoading(false);}
  }
  async function confirm(row){
    if(confirming.current)return;confirming.current=true;setBusy(row.id);let saved=false;
    try{
      await lichXemPhongApi.xacNhan(row.id,row.phienBanLich);saved=true;
      const response=await lichXemPhongApi.getAll();setRows(response.data||[]);
      setResult({type:'success',title:'Đã xác nhận lịch xem phòng',message:'Nhân viên đã nhận được xác nhận của bạn. Vui lòng đến đúng ngày giờ hẹn.'});
    }catch(err){
      if(!saved&&err.response?.status===409){try{const response=await lichXemPhongApi.getAll();setRows(response.data||[]);}catch{ /* Keep the visible version until a refresh succeeds. */ }}
      setResult({type:saved?'success':'error',title:saved?'Đã lưu xác nhận lịch':'Chưa thể xác nhận lịch',message:saved?'Xác nhận đã được lưu, nhưng chưa tải lại được danh sách. Vui lòng bấm Làm mới để xem trạng thái mới.':err.response?.data?.message||'Không xác nhận được lịch. Vui lòng thử lại.'});
    }finally{confirming.current=false;setBusy('');}
  }
  return <div className="lxp-page customer-viewing-page">
    <section className="ui-card customer-viewing-search-panel"><div className="customer-viewing-heading"><div><h2>Tra cứu lịch xem phòng</h2><p>Quản lý các cuộc hẹn xem phòng của bạn.</p></div><button className="ui-btn ui-btn--ghost" type="button" onClick={refresh} disabled={loading||Boolean(busy)}><Icon name="refresh"/>Làm mới</button></div>
      <form onSubmit={event=>{event.preventDefault();setQuery(draft.trim());}}><label htmlFor="customer-viewing-search">Tra cứu theo mã lịch, phòng, email hoặc số điện thoại</label><div className="customer-viewing-search-row"><div><Icon name="search"/><input id="customer-viewing-search" className="ui-input" value={draft} onChange={event=>setDraft(event.target.value)} placeholder="Nhập mã lịch, tên phòng hoặc thông tin liên hệ..."/></div><button type="submit" className="ui-btn ui-btn--primary">Tìm kiếm lịch hẹn</button></div></form>
    </section>
    <section className="customer-viewing-stats" aria-label="Tổng quan lịch xem phòng">{[['all','Tổng cộng'],['active','Sắp tới'],['done','Hoàn thành'],['cancelled','Đã hủy']].map(([key,label])=><button type="button" className={`ui-card ${group===key?'is-active':''}`} key={key} onClick={()=>setGroup(key)} aria-pressed={group===key}><strong>{String(groups[key].length).padStart(2,'0')}</strong><span>{label}</span></button>)}</section>
    {error&&<p className="customer-viewing-error" role="alert">{error}</p>}
    {loading&&<p role="status">Đang tải lịch xem phòng...</p>}
    <div className="customer-viewing-layout"><section className="customer-viewing-results" aria-label="Danh sách lịch hẹn">
      <div className="customer-viewing-tabs" role="group" aria-label="Nhóm lịch hẹn"><button type="button" aria-pressed={group==='active'} onClick={()=>setGroup('active')}>Sắp tới ({groups.active.length})</button><button type="button" aria-pressed={group==='past'} onClick={()=>setGroup('past')}>Đã qua ({groups.past.length})</button></div>
      {(query||selectedDay)&&<div className="customer-viewing-filter-note"><span>{visible.length} lịch hẹn phù hợp{selectedDay?` · ${selectedDay.split('-').reverse().join('/')}`:''}</span><button className="ui-btn ui-btn--ghost ui-btn--sm" type="button" onClick={()=>{setDraft('');setQuery('');setSelectedDay('');}}>Xóa lọc</button></div>}
      {!loading&&!visible.length&&<div className="ui-card customer-viewing-empty"><EmptyState message="Không có lịch hẹn trong mục này."/><p>Thử chọn mục khác, ngày khác hoặc xóa bộ lọc.</p><button className="ui-btn ui-btn--secondary" type="button" onClick={refresh}>Tải lại lịch hẹn</button></div>}
      {visible.map(row=><CustomerAppointmentCard key={row.id} row={row} busy={busy===row.id} onConfirm={confirm} onReschedule={setReschedule} onCancel={setCancel} onViewDetail={onViewRoomDetail}/>)}
    </section><ViewingMonthCalendar schedules={searched} selectedDay={selectedDay} onDay={setSelectedDay}/></div>
    <p className="customer-viewing-hint">Nếu có thay đổi, hãy gửi yêu cầu đổi lịch trước giờ hẹn ít nhất 2 tiếng. Nhân viên sẽ kiểm tra và phản hồi.</p>
    {reschedule&&<RescheduleModal appt={reschedule} onClose={()=>setReschedule(null)} onSubmit={onReschedule}/>}
    {cancel&&<CancelModal appt={cancel} onClose={()=>setCancel(null)} onSubmit={onCancel}/>}
    <ResultModal open={Boolean(result)} type={result?.type} title={result?.title} message={result?.message} confirmText="Đã hiểu" onClose={()=>setResult(null)}/>
  </div>;
}
