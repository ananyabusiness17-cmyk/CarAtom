import { formatInTimeZone } from 'date-fns-tz';

const IST = 'Asia/Kolkata';

export function formatIst(iso: string | Date | null | undefined, pattern = 'd MMM, HH:mm'): string {
  if (!iso) return '—';
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return '—';
  return formatInTimeZone(date, IST, pattern);
}

export function formatIstTime(iso: string | Date | null | undefined): string {
  return formatIst(iso, 'HH:mm');
}

export function todayIstDateInput(): string {
  return formatInTimeZone(new Date(), IST, 'yyyy-MM-dd');
}
