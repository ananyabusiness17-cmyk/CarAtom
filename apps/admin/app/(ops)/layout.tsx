'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { OpsShell } from '@/components/ops-shell';
import { useAuth } from '@/hooks/use-admin-session';

export default function OpsLayout({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !profile) router.replace('/login');
  }, [loading, profile, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-muted">
        Checking desk access…
      </div>
    );
  }
  if (!profile) return null;
  return <OpsShell>{children}</OpsShell>;
}
