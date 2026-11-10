import React from 'react';
import { Icon } from '../../components/common/Icon.jsx';
import { dateKey, timeLabel } from './salePresentation.js';

export default function SaleCalendar({ month, onMonth, schedules, selectedDay, onDay }) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (start.getDay() + 6) % 7;
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const total = Math.ceil((offset + last) / 7) * 7;
  const today = dateKey(new Date());
  return <section className="ui-card sale-calendar" aria-label="Lịch tháng">
    <div className="sale-calendar-heading"><h2>{month.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</h2><div className="sale-actions">
      <button className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => onMonth(new Date())}>Hôm nay</button>
      <button className="ui-btn ui-btn--secondary ui-btn--sm" aria-label="Tháng trước" onClick={() => onMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><Icon name="chevron_left" /></button>
      <button className="ui-btn ui-btn--secondary ui-btn--sm" aria-label="Tháng sau" onClick={() => onMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><Icon name="chevron_right" /></button>
    </div></div>
    <div className="sale-calendar-grid" role="group" aria-label="Chọn ngày xem lịch">
      {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => <span className="sale-calendar-weekday" key={d}>{d}</span>)}
      {Array.from({ length: total }, (_, i) => {
        const date = new Date(month.getFullYear(), month.getMonth(), i - offset + 1), key = dateKey(date);
        const outside = date.getMonth() !== month.getMonth();
        const events = schedules.filter(s => dateKey(s.thoiGianHen) === key);
        return <button type="button" key={key} aria-label={`${key}, ${events.length} lịch hẹn`} aria-pressed={selectedDay === key}
          className={`sale-calendar-day ${outside ? 'is-outside' : ''} ${key === today ? 'is-today' : ''} ${key === selectedDay ? 'is-selected' : ''}`} onClick={() => onDay(key)}>
          <span className="sale-calendar-number">{date.getDate()}</span>
          <span className="sale-calendar-events" aria-hidden="true">{events.slice(0, 2).map(s => <span className={`sale-calendar-event ${s.trangThai === 'Đã hủy' ? 'is-cancelled' : ''}`} key={s.id}>{timeLabel(s.thoiGianHen)} <span>{s.hoTenKhach}</span></span>)}{events.length > 2 && <small>+{events.length - 2} lịch</small>}</span>
          {!!events.length && <span className="sale-calendar-dot" aria-hidden="true">{events.length}</span>}
        </button>;
      })}
    </div>
    <p className="sale-calendar-hint">Chọn một ngày để xem lịch hẹn và thông tin khách.</p>
  </section>;
}
