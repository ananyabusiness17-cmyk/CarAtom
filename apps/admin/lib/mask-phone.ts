export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '+91••••';
  return `+91••••${digits.slice(-4)}`;
}
