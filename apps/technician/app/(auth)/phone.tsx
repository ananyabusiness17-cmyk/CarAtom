import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InlineBanner } from '../../src/components/InlineBanner';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { useAuth } from '../../src/providers/AuthProvider';
import { colors, type } from '../../src/theme/tokens';

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (raw.startsWith('+')) return `+${digits}`;
  return `+91${digits}`;
}

export default function PhoneScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { sendOtp, configured } = useAuth();
  const [phone, setPhone] = useState('+91');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    const e164 = normalizePhone(phone);
    if (!/^\+91\d{10}$/.test(e164)) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setBusy(true);
    try {
      await sendOtp(e164);
      router.push({
        pathname: '/(auth)/otp',
        params: { phone: e164, ...(returnTo ? { returnTo } : {}) },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send OTP.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={styles.title}>Technician sign in</Text>
        <Text style={styles.body}>We’ll text a 6-digit code. Use a field technician account.</Text>
        {!configured ? (
          <InlineBanner message="Supabase keys are not configured. OTP cannot be sent until EXPO_PUBLIC_SUPABASE_URL and ANON_KEY are set." />
        ) : null}
        {error ? <InlineBanner message={error} /> : null}
        <TextInput
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          placeholder="+91 99000 11001"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          accessibilityLabel="Phone number"
        />
        <PrimaryButton label="Send code" onPress={() => void submit()} loading={busy} disabled={busy || !configured} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  screen: { flex: 1, padding: 24, gap: 14 },
  title: { ...type.navTitle, color: colors.textStrong },
  body: { ...type.body, color: colors.textMuted },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    color: colors.text,
  },
});
