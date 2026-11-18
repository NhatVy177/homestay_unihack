import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon.jsx';
import { availableTimes, calendarDays, localDay, pad, shiftMonth } from './dateControl.js';
import './formControlPopovers.css';

const INPUT_TYPES = ['date', 'time', 'datetime-local'];
const controlIds = new WeakMap();
let nextControlId = 0;
function controlKey(input) { if (!controlIds.has(input)) controlIds.set(input, ++nextControlId); return controlIds.get(input); }
function supported(element) {
  return element instanceof HTMLInputElement && INPUT_TYPES.includes(element.type)
    || element instanceof HTMLSelectElement && !element.multiple && element.size <= 1;
}
function constraints(input) {
  return { type: input.type, min: input.min, max: input.max, step: input.step, initialValue: input.getAttribute('value') || '' };
}
function validValue(input, value) {
  const probe = document.createElement('input');
  Object.assign(probe, constraints(input), { defaultValue: input.defaultValue, value });
  return Boolean(probe.value) && probe.validity.valid;
}
function setNativeValue(input, value) {
  const prototype = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function Options({ input, commit }) {
  const options = [...input.options];
  const initial = Math.max(0, options.findIndex(option => option.selected));
  const [focused, setFocused] = useState(initial);
  const refs = useRef([]);
  const typed = useRef({ value: '', time: 0 });
  function disabled(option) { return option.disabled || option.hidden || option.parentElement?.disabled || option.parentElement?.hidden; }
  function move(event) {
    let index = focused;
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const direction = event.key === 'ArrowUp' || event.key === 'End' ? -1 : 1;
      index = event.key === 'Home' ? -1 : event.key === 'End' ? options.length : focused;
      for (let count = 0; count < options.length; count++) {
        index = (index + direction + options.length) % options.length;
        if (!disabled(options[index])) break;
      }
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && event.key !== ' ') {
      event.preventDefault();
      const now = Date.now();
      typed.current = { value: (now - typed.current.time < 700 ? typed.current.value : '') + event.key.toLocaleLowerCase('vi'), time: now };
      const match = options.findIndex(option => !disabled(option) && option.label.toLocaleLowerCase('vi').startsWith(typed.current.value));
      if (match < 0) return;
      index = match;
    } else return;
    setFocused(index);
    refs.current[index]?.focus();
  }
  return <div className="ui-control-options" role="listbox" aria-label={input.getAttribute('aria-label') || input.labels?.[0]?.textContent || 'Chọn giá trị'} onKeyDown={move}>
    {options.map((option, index) => <React.Fragment key={index}>
      {option.parentElement instanceof HTMLOptGroupElement && option === option.parentElement.firstElementChild && <div className="ui-control-option-group">{option.parentElement.label}</div>}
      <button ref={node => { refs.current[index] = node; }} type="button" role="option" hidden={option.hidden || option.parentElement?.hidden} aria-selected={option.selected} disabled={disabled(option)} tabIndex={index === focused ? 0 : -1} data-autofocus={index === initial || undefined} onFocus={() => setFocused(index)} onClick={() => commit(option.value)}>
        <span>{option.label || 'Chưa chọn'}</span>{option.selected && <Icon name="check" />}
      </button>
    </React.Fragment>)}
  </div>;
}

function Calendar({ input, commit }) {
  const today = localDay();
  const dateTime = input.type === 'datetime-local', timeOnly = input.type === 'time';
  const rawDay = (dateTime ? input.value.split('T')[0] : !timeOnly && input.value) || today;
  const minDay = input.min?.slice(0, 10), maxDay = input.max?.slice(0, 10);
  const currentDay = !timeOnly && minDay && rawDay < minDay ? minDay : !timeOnly && maxDay && rawDay > maxDay ? maxDay : rawDay;
  const [day, setDay] = useState(currentDay);
  const [month, setMonth] = useState(currentDay.slice(0, 7));
  const [view, setView] = useState('days');
  const [time, setTime] = useState(timeOnly ? input.value : input.value.split('T')[1] || '');
  const dates = useRef(null);
  const timePanel = useRef(null);
  const times = dateTime || timeOnly ? availableTimes(constraints(input), day) : [];
  const chosenTime = times.includes(time) ? time : times[0] || '';
  const hours = [...new Set(times.map(value => value.slice(0, 2)))];
  const minutes = [...new Set(times.filter(value => value.startsWith(chosenTime.slice(0, 2))).map(value => value.slice(3, 5)))];
  const seconds = times.filter(value => value.slice(0, 5) === chosenTime.slice(0, 5));
  const showSeconds = times.some(value => value.length > 5);
  const monthDays = calendarDays(month);
  useLayoutEffect(() => {
    timePanel.current?.querySelectorAll('[aria-pressed="true"]').forEach(button => button.scrollIntoView({ block: 'nearest' }));
  }, [chosenTime]);
  function blocked(value) {
    return minDay && value < minDay || maxDay && value > maxDay || (!dateTime && !validValue(input, value));
  }
  function choose(value) {
    if (blocked(value)) return;
    if (dateTime) { setDay(value); setMonth(value.slice(0, 7)); } else commit(value);
  }
  const tabDay = monthDays.includes(day) && !blocked(day) ? day : monthDays.find(value => value.startsWith(month) && !blocked(value));
  function moveDate(event) {
    const value = event.target.dataset.date;
    if (!value) return;
    const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const date = new Date(`${value}T12:00:00`);
    if (event.key in offsets) date.setDate(date.getDate() + offsets[event.key]);
    else if (event.key === 'PageUp' || event.key === 'PageDown') date.setMonth(date.getMonth() + (event.key === 'PageUp' ? -1 : 1));
    else if (event.key === 'Home' || event.key === 'End') date.setDate(date.getDate() + (event.key === 'Home' ? -(date.getDay() + 6) % 7 : 6 - (date.getDay() + 6) % 7));
    else return;
    event.preventDefault();
    const next = localDay(date);
    if (blocked(next)) return;
    setMonth(next.slice(0, 7));
    requestAnimationFrame(() => dates.current?.querySelector(`[data-date="${next}"]`)?.focus());
  }
  const [year, monthNumber] = month.split('-').map(Number);
  const firstYear = minDay ? Number(minDay.slice(0, 4)) : Math.min(1900, year);
  const lastYear = maxDay ? Number(maxDay.slice(0, 4)) : Math.max(new Date().getFullYear() + 20, year);
  const years = Array.from({ length: Math.max(0, lastYear - firstYear + 1) }, (_, index) => lastYear - index);
  function unavailableMonth(candidate) { return minDay && candidate < minDay.slice(0, 7) || maxDay && candidate > maxDay.slice(0, 7); }
  function selectTime(part, value) {
    const prefix = part === 'hour' ? value : `${chosenTime.slice(0, 2)}:${value}`;
    setTime(times.find(item => item.startsWith(prefix)) || '');
  }
  return <>
    {!timeOnly && <>
      <div className="ui-calendar-heading">
        <button type="button" className="ui-calendar-arrow" aria-label="Tháng trước" disabled={unavailableMonth(shiftMonth(month, -1))} onClick={() => setMonth(shiftMonth(month, -1))}><Icon name="chevron_left" /></button>
        <div className="ui-calendar-title"><button type="button" aria-label="Chọn tháng" aria-expanded={view === 'months'} onClick={() => setView(view === 'months' ? 'days' : 'months')}>Tháng {monthNumber}<Icon name="expand_more" /></button><button type="button" aria-label="Chọn năm" aria-expanded={view === 'years'} onClick={() => setView(view === 'years' ? 'days' : 'years')}>{year}<Icon name="expand_more" /></button></div>
        <button type="button" className="ui-calendar-arrow" aria-label="Tháng sau" disabled={unavailableMonth(shiftMonth(month, 1))} onClick={() => setMonth(shiftMonth(month, 1))}><Icon name="chevron_right" /></button>
      </div>
      {view === 'days' ? <>
        <div className="ui-calendar-weekdays" aria-hidden="true">{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(label => <span key={label}>{label}</span>)}</div>
        <div className="ui-calendar-days" ref={dates} role="group" aria-label={`Tháng ${monthNumber} năm ${year}`} onKeyDown={moveDate}>
          {monthDays.map(value => <button type="button" key={value} data-date={value} data-autofocus={value === tabDay || undefined} tabIndex={value === tabDay ? 0 : -1} className={`${value.slice(0, 7) !== month ? 'is-outside ' : ''}${value === today ? 'is-today' : ''}`} disabled={Boolean(blocked(value))} aria-label={value.split('-').reverse().join('/')} aria-pressed={value === day} aria-current={value === today ? 'date' : undefined} onClick={() => choose(value)}>{Number(value.slice(-2))}</button>)}
        </div>
      </> : <div className="ui-calendar-choices" role="group" aria-label={view === 'months' ? 'Tháng' : 'Năm'}>
        {(view === 'months' ? Array.from({ length: 12 }, (_, index) => index + 1) : years).map(value => <button type="button" key={value} aria-pressed={view === 'months' ? value === monthNumber : value === year} disabled={view === 'months' && Boolean(unavailableMonth(`${year}-${pad(value)}`))} onClick={() => { const candidate = view === 'months' ? `${year}-${pad(value)}` : `${value}-${pad(monthNumber)}`; setMonth(minDay && candidate < minDay.slice(0, 7) ? minDay.slice(0, 7) : maxDay && candidate > maxDay.slice(0, 7) ? maxDay.slice(0, 7) : candidate); setView(view === 'years' ? 'months' : 'days'); }}>{view === 'months' ? `Tháng ${value}` : value}</button>)}
      </div>}
    </>}
    {(dateTime || timeOnly) && <div className="ui-time-picker" ref={timePanel}>
      <div className="ui-time-heading"><Icon name="schedule" /><strong>Chọn giờ</strong><output>{chosenTime || 'Chưa có giờ phù hợp'}</output></div>
      <div className={`ui-time-columns${showSeconds ? ' has-seconds' : ''}`}>
        <div><span>Giờ</span><div role="group" aria-label="Giờ">{hours.map(value => <button type="button" key={value} data-autofocus={value === chosenTime.slice(0, 2) || undefined} aria-pressed={value === chosenTime.slice(0, 2)} onClick={() => selectTime('hour', value)}>{value}</button>)}</div></div>
        <div><span>Phút</span><div role="group" aria-label="Phút">{minutes.map(value => <button type="button" key={value} aria-pressed={value === chosenTime.slice(3, 5)} onClick={() => selectTime('minute', value)}>{value}</button>)}</div></div>
        {showSeconds && <div><span>Giây</span><div role="group" aria-label="Giây">{seconds.map(value => <button type="button" key={value} aria-pressed={value === chosenTime} onClick={() => setTime(value)}>{value.slice(6)}</button>)}</div></div>}
      </div>
      <button type="button" className="ui-time-confirm" disabled={!chosenTime || !validValue(input, timeOnly ? chosenTime : `${day}T${chosenTime}`)} onClick={() => commit(timeOnly ? chosenTime : `${day}T${chosenTime}`)}>Chọn {chosenTime}</button>
    </div>}
    <div className="ui-calendar-footer">
      {!timeOnly && <button type="button" disabled={Boolean(blocked(today))} onClick={() => choose(today)}>Hôm nay</button>}
      <button type="button" onClick={() => commit('')}>Xóa chọn</button>
    </div>
  </>;
}

// Enhance existing native controls, including forms mounted later. Keep their values,
// validity, labels, refs and React handlers; only replace the browser-owned popup.
export default function FormControlPopovers() {
  const [input, setInput] = useState(null);
  const popup = useRef(null);
  const active = useRef(null);
  const close = useCallback((restore = false) => {
    if (restore && input?.isConnected) input.focus({ preventScroll: true });
    active.current = null;
    setInput(null);
  }, [input]);
  useEffect(() => {
    function open(event) {
      const element = event.target;
      if (!supported(element) || element.disabled || element.readOnly) return;
      if (event.type === 'keydown' && !(event.key === ' ' || event.key === 'Enter' || event.key === 'ArrowDown' && event.altKey || element instanceof HTMLSelectElement && ['ArrowDown', 'ArrowUp'].includes(event.key))) return;
      event.preventDefault();
      if (active.current === element) return;
      element.focus({ preventScroll: true });
      active.current = element;
      setInput(element);
    }
    document.addEventListener('pointerdown', open, true);
    document.addEventListener('click', open, true);
    document.addEventListener('keydown', open, true);
    return () => {
      document.removeEventListener('pointerdown', open, true);
      document.removeEventListener('click', open, true);
      document.removeEventListener('keydown', open, true);
    };
  }, []);
  useLayoutEffect(() => {
    if (!input || !popup.current) return undefined;
    const panel = popup.current;
    function position() {
      if (!input.isConnected || input.disabled || input.readOnly) { close(); return; }
      const rect = input.getBoundingClientRect();
      panel.style.setProperty('--control-popover-width', `${input instanceof HTMLSelectElement ? Math.min(Math.max(rect.width, 200), innerWidth - 24) : Math.min(360, innerWidth - 24)}px`);
      const below = innerHeight - rect.bottom - 20, above = rect.top - 20;
      const placeBelow = below >= Math.min(panel.scrollHeight, 320) || below >= above;
      panel.style.setProperty('--control-popover-height', `${Math.max(120, placeBelow ? below : above)}px`);
      const height = panel.getBoundingClientRect().height, width = panel.getBoundingClientRect().width;
      const top = placeBelow ? Math.min(rect.bottom + 8, innerHeight - height - 12) : rect.top - height - 8;
      panel.style.setProperty('--control-popover-left', `${Math.max(12, Math.min(rect.left, innerWidth - width - 12))}px`);
      panel.style.setProperty('--control-popover-top', `${Math.max(12, top)}px`);
    }
    position();
    const resize = new ResizeObserver(position);
    resize.observe(panel);
    window.addEventListener('resize', position);
    const scroll = event => { if (!panel.contains(event.target)) position(); };
    window.addEventListener('scroll', scroll, true);
    const attributes = ['aria-expanded', 'aria-controls', 'aria-haspopup'];
    const previous = attributes.map(name => input.getAttribute(name));
    input.setAttribute('aria-expanded', 'true'); input.setAttribute('aria-controls', 'ui-control-popover'); input.setAttribute('aria-haspopup', input instanceof HTMLSelectElement ? 'listbox' : 'dialog');
    const focus = panel.querySelector('[data-autofocus]:not(:disabled)') || panel.querySelector('button:not(:disabled)');
    focus?.focus({ preventScroll: true });
    focus?.scrollIntoView({ block: 'nearest' });
    function outside(event) { if (event.target !== input && !panel.contains(event.target) && !(supported(event.target) && !event.target.disabled && !event.target.readOnly)) close(); }
    function keys(event) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
      // Close after the browser moves focus, so Tab keeps its usual form navigation.
      if (event.key === 'Tab') requestAnimationFrame(() => { if (!panel.contains(document.activeElement) && document.activeElement !== input) close(); });
    }
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', keys, true);
    const observer = new MutationObserver(() => { if (!input.isConnected) close(); });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      resize.disconnect(); observer.disconnect(); window.removeEventListener('resize', position); window.removeEventListener('scroll', scroll, true);
      document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', keys, true);
      attributes.forEach((name, index) => { if (previous[index] == null) input.removeAttribute(name); else input.setAttribute(name, previous[index]); });
    };
  }, [input, close]);
  if (!input) return null;
  function commit(value) { if (!input.isConnected || input.disabled || input.readOnly) { close(); return; } setNativeValue(input, value); close(true); }
  return createPortal(<div id="ui-control-popover" className={`ui-control-popover${input instanceof HTMLSelectElement ? ' is-select' : ''}`} ref={popup} role={input instanceof HTMLSelectElement ? undefined : 'dialog'} aria-label={input instanceof HTMLSelectElement ? undefined : input.type === 'time' ? 'Chọn giờ' : 'Chọn ngày'} onMouseDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
    {input instanceof HTMLSelectElement ? <Options key={controlKey(input)} input={input} commit={commit} /> : <Calendar key={controlKey(input)} input={input} commit={commit} />}
  </div>, document.body);
}
