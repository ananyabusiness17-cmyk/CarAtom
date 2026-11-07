import { ApiError } from '@caratom/api-client';
import type { MeResponse } from '@caratom/contracts';
import type { Session } from '@supabase/supabase-js';
import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { apiBaseUrl, apiClient } from '../lib/api';
import {
  assertDevLocalOtp,
  assertDevLocalPhone,
  DEV_LOCAL_PROFILE,
  dummyDevLocalSession,
  isDevLocalAuthEnabled,
  isDevLocalToken,
  sessionFromLocalLogin,
} from '../lib/devLocalAuth';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { setStoredAccessToken } from './sessionToken';

type AuthContextValue = {
  session: Session | null;
  profile: MeResponse | null;
  loading: boolean;
  profileLoading: boolean;
  configured: boolean;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function requestLocalLogin(phone: string, code: string): Promise<Session | null> {
  try {
    const response = await fetch(`${apiBaseUrl()}/v1/dev/local-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code }),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { access_token?: string; user_id?: string; phone?: string };
    if (!body.access_token || !body.user_id) return null;
    return sessionFromLocalLogin(body.access_token, body.user_id, body.phone ?? phone);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const localAuth = isDevLocalAuthEnabled();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (localAuth) {
      setLoading(false);
      return () => {
        mounted = false;
      };
    }
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        setStoredAccessToken(data.session?.access_token ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setLoading(false);
      });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setStoredAccessToken(next?.access_token ?? null);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [localAuth]);

  useEffect(() => {
    if (!session?.access_token) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    if (isDevLocalToken(session.access_token)) {
      setProfile(DEV_LOCAL_PROFILE);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    void apiClient
      .getMe()
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setProfileLoading(false));
  }, [session?.access_token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      profileLoading,
      configured: supabaseConfigured || localAuth,
      sendOtp: async (phone: string) => {
        if (localAuth) {
          assertDevLocalPhone(phone);
          return;
        }
        if (!supabaseConfigured) {
          throw new Error('Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and ANON_KEY.');
        }
        const { error } = await supabase.auth.signInWithOtp({ phone });
        if (error) throw error;
      },
      verifyOtp: async (phone: string, token: string) => {
        if (localAuth) {
          assertDevLocalPhone(phone);
          assertDevLocalOtp(token);
          const fromApi = await requestLocalLogin(phone, token);
          const next = fromApi ?? dummyDevLocalSession();
          setStoredAccessToken(next.access_token);
          setSession(next);
          return;
        }
        const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
        if (error) throw error;
      },
      signOut: async () => {
        if (localAuth) {
          setStoredAccessToken(null);
          setSession(null);
          setProfile(null);
          return;
        }
        await supabase.auth.signOut();
        setProfile(null);
      },
      refreshProfile: async () => {
        if (isDevLocalToken(session?.access_token)) {
          setProfile(DEV_LOCAL_PROFILE);
          return;
        }
        try {
          setProfile(await apiClient.getMe());
        } catch (err) {
          if (err instanceof ApiError) setProfile(null);
        }
      },
    }),
    [loading, localAuth, profile, profileLoading, session],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
