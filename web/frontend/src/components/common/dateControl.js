const DAY = 86400000;
export const pad = value => String(value).padStart(2, '0');
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
export function dayNumber(value) {
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  return Date.UTC(year, month - 1, day) / DAY;
}
export function calendarDays(month) {
  const first = new Date(`${month}-01T12:00:00`);
  const start = new Date(first);
  start.setDate(1 - (first.getDay() + 6) % 7);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return localDay(date);
  });
}
export function shiftMonth(month, amount) {
  const date = new Date(`${month}-01T12:00:00`);
  date.setMonth(date.getMonth() + amount);
  return localDay(date).slice(0, 7);
}
function seconds(value) {
  const [hours = 0, minutes = 0, secs = 0] = String(value || '').split(':').map(Number);
  return hours * 3600 + minutes * 60 + secs;
}
function stamp(value, type) {
  if (!value) return null;
  return type === 'time' ? seconds(value) : dayNumber(value) * 86400 + seconds(value.split('T')[1]);
}
// Match native min/max/step rules; calculate in local calendar units, without UTC conversion.
export function availableTimes({ type, min = '', max = '', step = '', initialValue = '' }, day) {
  const interval = step === 'any' ? 1 : Math.max(1, Number(step) || 60);
  const start = type === 'time' ? 0 : dayNumber(day) * 86400;
  const base = stamp(min || initialValue, type) ?? 0;
  const lower = stamp(min, type), upper = stamp(max, type);
  const overnight = type === 'time' && lower != null && upper != null && lower > upper;
  const offset = ((base - start) % interval + interval) % interval;
  const times = [];
  for (let value = offset; value < 86400; value += interval) {
    const total = start + value;
    if (overnight ? total < lower && total > upper : (lower != null && total < lower) || (upper != null && total > upper)) continue;
    const hour = Math.floor(value / 3600), minute = Math.floor(value / 60) % 60, second = Math.floor(value % 60);
    times.push(`${pad(hour)}:${pad(minute)}${interval % 60 || second ? `:${pad(second)}` : ''}`);
  }
  return times;
}
