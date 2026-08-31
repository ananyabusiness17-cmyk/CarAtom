'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { Banner, PrimaryButton, TextField } from '@/components/ui';
import { useAuth } from '@/hooks/use-admin-session';

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (raw.startsWith('+')) return `+${digits}`;
  return `+91${digits}`;
}

function LoginForm() {
  const { sendOtp, verifyOtp, configured } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const forbidden = params.get('error') === 'forbidden';
  const [phone, setPhone] = useState('+91');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [error, setError] = useState<string | null>(forbidden ? 'This account is not an admin.' : null);
  const [busy, setBusy] = useState(false);

  async function send() {
    setError(null);
    const e164 = normalizePhone(phone);
    if (!/^\+91\d{10}$/.test(e164)) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setBusy(true);
    try {
      await sendOtp(e164);
      setPhone(e164);
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send OTP.');
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setError(null);
    setBusy(true);
    try {
      await verifyOtp(phone, code.trim());
      router.replace('/inventory');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify code.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <p className="text-sm font-semibold text-brand-strong">CARATOM Ops</p>
      <h1 className="mt-2 text-2xl font-bold text-strong">Desk sign in</h1>
      <p className="mt-1 text-sm text-muted">We’ll text a 6-digit code. Use an admin account.</p>
      {!configured ? (
        <Banner tone="muted">Supabase keys are not configured. OTP cannot be sent until NEXT_PUBLIC_SUPABASE_URL and ANON_KEY are set.</Banner>
      ) : null}
      {error ? <Banner>{error}</Banner> : null}
      {step === 'phone' ? (
        <div className="mt-6 space-y-4">
          <TextField
            label="Phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            inputMode="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
          />
          <PrimaryButton onClick={() => void send()} disabled={busy || !configured}>
            {busy ? 'Sending…' : 'Send code'}
          </PrimaryButton>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <TextField
            label="Code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit code"
          />
          <PrimaryButton onClick={() => void verify()} disabled={busy || code.trim().length < 6}>
            {busy ? 'Checking…' : 'Continue'}
          </PrimaryButton>
        </div>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="p-8 text-sm text-muted">Loading…</main>}>
      <LoginForm />
    </Suspense>
  );
}
