const HOME = '/(tech)/(tabs)/today';

export function safeReturnTo(raw?: string | string[]): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('://')) {
    return HOME;
  }
  return value;
}
