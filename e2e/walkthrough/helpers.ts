import { test, type APIRequestContext } from '@playwright/test';

export const API_BASE = (process.env.E2E_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');

export async function requireApi(request: APIRequestContext): Promise<void> {
  try {
    const response = await request.get(`${API_BASE}/health`);
    if (!response.ok()) {
      test.skip(true, `API health ${response.status()} at ${API_BASE}`);
    }
  } catch {
    test.skip(true, `API not reachable at ${API_BASE}`);
  }
}

export function authHeaders(): Record<string, string> | null {
  const token = process.env.E2E_TOKEN;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}
