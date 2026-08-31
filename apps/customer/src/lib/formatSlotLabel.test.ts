import { dateStripLabel, formatSlotLabel, rollingSlotWindow } from './formatSlotLabel';

const label = formatSlotLabel('2026-08-19T05:30:00.000Z', '2026-08-19T07:30:00.000Z');
if (!label.includes('11:00') || !label.includes('13:00')) {
  throw new Error(`Expected 11:00–13:00 IST in "${label}"`);
}
if (!label.includes('Wed') || !label.includes('19')) {
  throw new Error(`Expected Wednesday 19 in "${label}"`);
}

if (dateStripLabel('2026-08-19') !== 'Wed 19') {
  throw new Error(`Unexpected date strip ${dateStripLabel('2026-08-19')}`);
}

const window = rollingSlotWindow(3);
if (window.dates.length !== 3 || window.from !== window.dates[0] || window.to !== window.dates[2]) {
  throw new Error('rollingSlotWindow must return three local dates');
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(window.from)) {
  throw new Error(`from date ${window.from} is not ISO calendar format`);
}

console.log('formatSlotLabel OK');
