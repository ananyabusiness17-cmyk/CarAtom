import type { MeResponse } from '@caratom/contracts';
import type { Session } from '@supabase/supabase-js';
import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { apiClient } from '../lib/api';
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
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
  }, []);

  useEffect(() => {
    if (!session?.access_token) {
      setProfile(null);
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

  useEffect(() => {
    if (!session?.access_token) return;
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      void apiClient
        .getMe()
        .then(setProfile)
        .catch(() => setProfile(null));
    });
    return () => sub.remove();
  }, [session?.access_token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      profileLoading,
      configured: supabaseConfigured,
      sendOtp: async (phone: string) => {
        if (!supabaseConfigured) {
          throw new Error('Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and ANON_KEY.');
        }
        const { error } = await supabase.auth.signInWithOtp({ phone });
        if (error) throw error;
      },
      verifyOtp: async (phone: string, token: string) => {
        const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
        if (error) throw error;
      },
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
      },
      refreshProfile: async () => {
        try {
          setProfile(await apiClient.getMe());
        } catch {
          setProfile(null);
        }
      },
    }),
    [loading, profile, profileLoading, session],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
