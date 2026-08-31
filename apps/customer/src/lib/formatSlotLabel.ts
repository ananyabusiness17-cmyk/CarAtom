export function formatSlotLabel(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const weekday = start.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'Asia/Kolkata' });
  const day = start.toLocaleDateString('en-IN', { day: 'numeric', timeZone: 'Asia/Kolkata' });
  const startTime = start.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  });
  const endTime = end.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  });
  return `${weekday} ${day} · ${startTime} – ${endTime}`;
}

function localIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function rollingSlotWindow(days = 3): { from: string; to: string; dates: string[] } {
  const dates: string[] = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i += 1) {
    const next = new Date(start);
    next.setDate(start.getDate() + i);
    dates.push(localIsoDate(next));
  }
  return { from: dates[0], to: dates[dates.length - 1], dates };
}

export function dateStripLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 6, 0, 0));
  const weekday = date.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'Asia/Kolkata' });
  return `${weekday} ${day}`;
}
