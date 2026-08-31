import Constants from 'expo-constants';
import { ApiClient } from '@caratom/api-client';

import { getStoredAccessToken } from '../providers/sessionToken';

function metroHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.linkingUri ?? '';
  const host = hostUri.replace(/^[a-z]+:\/\//i, '').split('/')[0]?.split(':')[0];
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  return host;
}

function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
  const isLoopback = fromEnv?.includes('localhost') || fromEnv?.includes('127.0.0.1');
  if (fromEnv && !isLoopback) return fromEnv;
  const host = metroHost();
  if (host) return `http://${host}:8000`;
  return fromEnv ?? 'http://localhost:8000';
}

export const apiClient = new ApiClient({
  baseUrl: resolveApiBaseUrl(),
  getAccessToken: getStoredAccessToken,
  clientSurface: 'admin_mobile',
});
