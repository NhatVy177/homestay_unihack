import assert from 'node:assert/strict';
import { test } from 'node:test';
import { availableTimes, calendarDays, dayNumber, shiftMonth } from '../src/components/common/dateControl.js';

test('calendar begins Monday and retains leap days and year boundaries', () => {
  assert.equal(calendarDays('2024-02')[0], '2024-01-29');
  assert.ok(calendarDays('2024-02').includes('2024-02-29'));
  assert.equal(calendarDays('2026-11').length, 42);
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(dayNumber('2024-03-01') - dayNumber('2024-02-28'), 2);
});
test('viewing hours keep inclusive min/max and 15 minute steps', () => {
  const times = availableTimes({ type: 'time', min: '07:00', max: '17:00', step: '900' });
  assert.equal(times.length, 41);
  assert.equal(times[0], '07:00');
  assert.equal(times.at(-1), '17:00');
  assert.equal(times.includes('07:10'), false);
});
test('datetime limits include the date and preserve the step phase', () => {
  const props = { type: 'datetime-local', min: '2026-11-18T14:10', max: '2026-11-19T09:10', step: '900' };
  assert.equal(availableTimes(props, '2026-11-18')[0], '14:10');
  assert.equal(availableTimes(props, '2026-11-19').at(-1), '09:10');
  assert.deepEqual(availableTimes(props, '2026-11-20'), []);
});
test('overnight ranges, seconds, any step and initial-value step base', () => {
  const overnight = availableTimes({ type: 'time', min: '23:00', max: '01:00', step: '1800' });
  assert.deepEqual(overnight, ['00:00', '00:30', '01:00', '23:00', '23:30']);
  assert.deepEqual(availableTimes({ type: 'time', min: '09:00:15', max: '09:00:45', step: '15' }), ['09:00:15', '09:00:30', '09:00:45']);
  assert.equal(availableTimes({ type: 'time', initialValue: '07:10', step: '900' })[0], '00:10');
  assert.equal(availableTimes({ type: 'time', min: '09:00:01', max: '09:00:02', step: 'any' }).length, 2);
});
