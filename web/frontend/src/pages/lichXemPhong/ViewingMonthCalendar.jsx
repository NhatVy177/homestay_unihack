import React, { useState } from 'react';
import { Icon } from '../../components/common/Icon.jsx';
import { viewingDay } from './viewingPresentation.js';
export default function ViewingMonthCalendar({schedules,selectedDay,onDay}){
  const [month,setMonth]=useState(new Date());
  const start=new Date(month.getFullYear(),month.getMonth(),1),offset=(start.getDay()+6)%7;
  const total=Math.ceil((offset+new Date(month.getFullYear(),month.getMonth()+1,0).getDate())/7)*7;
  return <aside className="ui-card customer-viewing-calendar" aria-label="Lịch tháng xem phòng">
    <div className="customer-viewing-calendar-head"><h3>{month.toLocaleDateString('vi-VN',{month:'long',year:'numeric'})}</h3><div>
      <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" aria-label="Tháng trước" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}><Icon name="chevron_left"/></button>
      <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" aria-label="Tháng sau" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}><Icon name="chevron_right"/></button>
    </div></div>
    <div className="customer-viewing-month-grid" role="group" aria-label="Chọn ngày hẹn">
      {['T2','T3','T4','T5','T6','T7','CN'].map(day=><span key={day}>{day}</span>)}
      {Array.from({length:total},(_,i)=>{
        const date=new Date(month.getFullYear(),month.getMonth(),i-offset+1),key=viewingDay(date),count=schedules.filter(row=>viewingDay(row.thoiGianHen)===key).length;
        return <button key={key} type="button" aria-label={`${key}, ${count} lịch hẹn`} aria-pressed={key===selectedDay} className={`${date.getMonth()!==month.getMonth()?'is-outside':''} ${key===viewingDay(new Date())?'is-today':''} ${key===selectedDay?'is-selected':''}`} onClick={()=>onDay(key)}>
          {date.getDate()}{count>0&&<i aria-hidden="true"/>}
        </button>;
      })}
    </div>
    <p className="customer-viewing-calendar-legend"><i aria-hidden="true"/> Lịch xem phòng của bạn</p>
    {selectedDay&&<button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={()=>onDay('')}>Tất cả ngày</button>}
  </aside>;
}
