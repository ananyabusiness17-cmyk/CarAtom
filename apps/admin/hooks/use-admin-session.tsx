'use client';

import type { MeResponse } from '@caratom/contracts';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { apiClient, setStoredAccessToken } from '../lib/admin-api';
import { readE2eToken } from '../lib/e2e-token';
import { createSupabaseBrowser, supabaseConfigured } from '../lib/supabase';

type AuthContextValue = {
  profile: MeResponse | null;
  loading: boolean;
  configured: boolean;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadProfile = useCallback(async () => {
    const me = await apiClient.getMe();
    if (me.role !== 'admin') {
      setProfile(null);
      router.replace('/login?error=forbidden');
      throw new Error('This account is not an admin.');
    }
    setProfile(me);
    return me;
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowser();

    async function boot() {
      const e2e = readE2eToken();
      if (e2e) {
        setStoredAccessToken(e2e);
        try {
          if (!cancelled) await loadProfile();
        } catch {
          /* redirect handled in loadProfile */
        }
        if (!cancelled) setLoading(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      setStoredAccessToken(data.session?.access_token ?? null);
      if (data.session?.access_token && !cancelled) {
        try {
          await loadProfile();
        } catch {
          /* redirect handled in loadProfile */
        }
      }
      if (!cancelled) setLoading(false);
    }

    void boot();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setStoredAccessToken(session?.access_token ?? null);
      if (!session?.access_token) {
        setProfile(null);
        return;
      }
      setLoading(true);
      void loadProfile()
        .catch(() => undefined)
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      profile,
      loading,
      configured: supabaseConfigured,
      sendOtp: async (phone: string) => {
        if (!supabaseConfigured) {
          throw new Error('Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and ANON_KEY.');
        }
        const { error } = await createSupabaseBrowser().auth.signInWithOtp({ phone });
        if (error) throw error;
      },
      verifyOtp: async (phone: string, token: string) => {
        if (!supabaseConfigured) {
          throw new Error('Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and ANON_KEY.');
        }
        setLoading(true);
        try {
          const { data, error } = await createSupabaseBrowser().auth.verifyOtp({
            phone,
            token,
            type: 'sms',
          });
          if (error) throw error;
          const access = data.session?.access_token ?? null;
          setStoredAccessToken(access);
          if (!access) {
            throw new Error('Sign-in did not create a session. Try Send code again.');
          }
          await loadProfile();
        } finally {
          setLoading(false);
        }
      },
      signOut: async () => {
        await createSupabaseBrowser().auth.signOut();
        setStoredAccessToken(null);
        setProfile(null);
      },
    }),
    [loading, profile, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
