import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InlineBanner } from '../../src/components/InlineBanner';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { useAuth } from '../../src/providers/AuthProvider';
import { colors, type } from '../../src/theme/tokens';

export default function OtpScreen() {
  const router = useRouter();
  const { phone, returnTo } = useLocalSearchParams<{ phone: string; returnTo?: string }>();
  const { verifyOtp } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!phone) {
      setError('Missing phone number.');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await verifyOtp(phone, code);
      const next = typeof returnTo === 'string' && returnTo.startsWith('/') ? returnTo : '/(tech)/(tabs)/today';
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify code.');
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
        <Text style={styles.title}>Enter code</Text>
        <Text style={styles.body}>Sent to {phone}</Text>
        {error ? <InlineBanner message={error} /> : null}
        <TextInput
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          accessibilityLabel="One-time code"
        />
        <PrimaryButton label="Verify" onPress={() => void submit()} loading={busy} disabled={busy} />
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
    letterSpacing: 6,
  },
});
