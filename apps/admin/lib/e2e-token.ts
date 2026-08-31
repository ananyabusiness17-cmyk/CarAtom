export const E2E_TOKEN_KEY = 'caratom_e2e_token';

export function readE2eToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(E2E_TOKEN_KEY) ?? window.localStorage.getItem(E2E_TOKEN_KEY);
}
