export function legalBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_LEGAL_BASE_URL ?? 'https://admin.caratom.in';
  return raw.replace(/\/$/, '');
}

export const LEGAL_URLS = {
  privacy: () => `${legalBaseUrl()}/legal/privacy`,
  terms: () => `${legalBaseUrl()}/legal/terms`,
  grievance: () => `${legalBaseUrl()}/legal/grievance`,
};

export const DELETE_ACCOUNT_MAILTO =
  'mailto:grievance@caratom.in?subject=Delete%20my%20CARATOM%20account';
