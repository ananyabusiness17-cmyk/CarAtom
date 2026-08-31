export function todayIstDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function formatJobsHeader(date: string, count: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const weekday = utc.toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' });
  const monthLabel = utc.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
  const jobWord = count === 1 ? 'job' : 'jobs';
  return `${weekday} ${day} ${monthLabel} · ${count} ${jobWord}`;
}
