import type { MeResponse } from '@caratom/contracts';
import type { Session } from '@supabase/supabase-js';

export const DEV_LOCAL_PHONE = '+919900011001';
export const DEV_LOCAL_OTP = '123456';
export const DEV_LOCAL_TOKEN_PREFIX = 'caratom-dev-local.';
export const DEV_LOCAL_PROFILE_ID = '2bd8b9a3-3a76-5c7f-8998-f04e54134941';

export function isDevLocalAuthEnabled(): boolean {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return false;
  return process.env.EXPO_PUBLIC_DEV_LOCAL_AUTH !== '0';
}

export function isDevLocalToken(token: string | null | undefined): boolean {
  return Boolean(token?.startsWith(DEV_LOCAL_TOKEN_PREFIX));
}

export function assertDevLocalPhone(phone: string): void {
  if (phone !== DEV_LOCAL_PHONE) {
    throw new Error('Local login is only for Imran · +91 99000 11001.');
  }
}

export function assertDevLocalOtp(code: string): void {
  if (code !== DEV_LOCAL_OTP) {
    throw new Error('Use 123456 for local technician login.');
  }
}

export const DEV_LOCAL_PROFILE: MeResponse = {
  id: DEV_LOCAL_PROFILE_ID,
  role: 'technician',
  phone: DEV_LOCAL_PHONE,
  full_name: 'Imran',
  phone_verified: true,
  created_at: '2024-01-01T00:00:00.000Z',
};

export function dummyDevLocalSession(): Session {
  return {
    access_token: `${DEV_LOCAL_TOKEN_PREFIX}imran`,
    refresh_token: `${DEV_LOCAL_TOKEN_PREFIX}refresh`,
    expires_in: 60 * 60 * 12,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 12,
    token_type: 'bearer',
    user: {
      id: DEV_LOCAL_PROFILE_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: undefined,
      phone: DEV_LOCAL_PHONE,
      app_metadata: { provider: 'dev-local' },
      user_metadata: { full_name: 'Imran' },
      created_at: DEV_LOCAL_PROFILE.created_at,
    },
  } as Session;
}

export function sessionFromLocalLogin(accessToken: string, userId: string, phone: string): Session {
  return {
    access_token: accessToken,
    refresh_token: `${DEV_LOCAL_TOKEN_PREFIX}refresh`,
    expires_in: 60 * 60 * 12,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 12,
    token_type: 'bearer',
    user: {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      phone,
      app_metadata: { provider: 'dev-local' },
      user_metadata: { full_name: 'Imran' },
      created_at: DEV_LOCAL_PROFILE.created_at,
    },
  } as Session;
}
