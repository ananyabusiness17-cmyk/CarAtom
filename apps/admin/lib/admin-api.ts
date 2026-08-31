'use client';

import { ApiClient } from '@caratom/api-client';

import { readE2eToken } from './e2e-token';

let accessToken: string | null = null;

export function setStoredAccessToken(token: string | null): void {
  accessToken = token;
}

export function getStoredAccessToken(): string | null {
  return readE2eToken() ?? accessToken;
}

export const apiClient = new ApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000',
  getAccessToken: async () => getStoredAccessToken(),
});
