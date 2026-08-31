const HOME = '/(customer)/(tabs)/home';

export function safeReturnTo(raw?: string | string[]): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('://')) {
    return HOME;
  }
  return value;
}
