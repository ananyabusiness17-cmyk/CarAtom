import { ApiError } from '@caratom/api-client';
import { useQuery } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InlineBanner } from '../../../src/components/home/InlineBanner';
import { PrimaryButton } from '../../../src/components/home/PrimaryButton';
import { apiClient } from '../../../src/lib/api';
import { DELETE_ACCOUNT_MAILTO, LEGAL_URLS } from '../../../src/lib/legal';
import { useAuth } from '../../../src/providers/AuthProvider';
import { colors, type } from '../../../src/theme/tokens';

const RETURN_TO = '/(customer)/(tabs)/profile';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, session, signOut, refreshProfile, loading } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [meError, setMeError] = useState<string | null>(null);

  useEffect(() => {
    setName(profile?.full_name ?? '');
  }, [profile?.full_name]);

  useEffect(() => {
    if (!session) {
      setMeError(null);
      return;
    }
    void refreshProfile().catch((err) => {
      setMeError(err instanceof ApiError ? err.message : 'Could not load profile.');
    });
  }, [refreshProfile, session]);

  async function saveName() {
    const next = name.trim();
    if (!next) {
      setError('Enter a name between 1 and 120 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await apiClient.patchMe({ full_name: next });
      await refreshProfile();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save name.');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await signOut();
    router.replace('/(customer)/(tabs)/home');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={styles.title}>Profile</Text>
        {loading ? (
          <Text style={styles.body}>Loading profile…</Text>
        ) : session && profile ? (
          <>
            <Text style={styles.name}>{profile.full_name || name || 'Your name'}</Text>
            <Text style={styles.meta}>{profile.phone}</Text>
            {meError ? <InlineBanner message={meError} /> : null}
            {error ? <InlineBanner message={error} /> : null}
            {saved ? <Text style={styles.success}>Name saved.</Text> : null}
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.textMuted}
              maxLength={120}
              autoComplete="name"
              style={styles.input}
              accessibilityLabel="Full name"
            />
            <PrimaryButton label="Save name" onPress={() => void saveName()} disabled={busy} />
            <GarageHistory />
            <HubRow label="Your orders" onPress={() => router.push('/(customer)/(tabs)/orders')} />
            <HubRow label="Notifications" onPress={() => router.push('/notifications')} />
            <HubRow label="Addresses" onPress={() => router.push('/addresses')} />
            <LegalBlock includeDeletion />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Log out"
              onPress={() => void logout()}
              style={styles.signOutWrap}
            >
              <Text style={styles.signOut}>Log out</Text>
            </Pressable>
          </>
        ) : session ? (
          <>
            <InlineBanner message={meError ?? 'Could not load your profile.'} />
            <PrimaryButton label="Retry" onPress={() => void refreshProfile()} />
            <LegalBlock includeDeletion />
          </>
        ) : (
          <>
            <Text style={styles.body}>Log in with your phone to manage your profile.</Text>
            <PrimaryButton
              label="Log in"
              onPress={() =>
                router.push({ pathname: '/(auth)/phone', params: { returnTo: RETURN_TO } })
              }
            />
            <LegalBlock />
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

}

function GarageHistory() {
  const vehicles = useQuery({
    queryKey: ['me', 'vehicles'],
    queryFn: () => apiClient.listVehicles(),
  });
  const firstId = vehicles.data?.items[0]?.id;
  const history = useQuery({
    queryKey: ['me', 'vehicle-history', firstId],
    queryFn: () => apiClient.getVehicleHistory(firstId!),
    enabled: Boolean(firstId),
  });
  if (vehicles.isLoading) {
    return <Text style={styles.meta}>Loading garage…</Text>;
  }
  if (!vehicles.data?.items.length) {
    return <Text style={styles.meta}>No saved vehicles yet.</Text>;
  }
  return (
    <>
      <Text style={styles.section}>Garage</Text>
      {vehicles.data.items.map((vehicle) => (
        <Text key={vehicle.id} style={styles.body}>
          {vehicle.make} {vehicle.model}
          {vehicle.mileage_km != null ? ` · ${vehicle.mileage_km} km` : ''}
        </Text>
      ))}
      {(history.data?.items ?? []).slice(0, 3).map((row) => (
        <Text key={row.id} style={styles.meta}>
          {row.offering_slug ?? 'Service'}
          {row.odometer_km != null ? ` · ${row.odometer_km} km` : ''}
        </Text>
      ))}
    </>
  );
}

function LegalBlock({ includeDeletion = false }: { includeDeletion?: boolean }) {
  return (
    <>
      <Text style={styles.section}>Legal</Text>
      <HubRow
        label="Privacy Policy"
        accessibilityRole="link"
        onPress={() => void Linking.openURL(LEGAL_URLS.privacy())}
      />
      <HubRow
        label="Terms of Service"
        accessibilityRole="link"
        onPress={() => void Linking.openURL(LEGAL_URLS.terms())}
      />
      <HubRow
        label="Grievance officer"
        accessibilityRole="link"
        onPress={() => void Linking.openURL(LEGAL_URLS.grievance())}
      />
      {includeDeletion ? (
        <HubRow
          label="Request account deletion"
          accessibilityRole="link"
          onPress={() => void Linking.openURL(DELETE_ACCOUNT_MAILTO)}
        />
      ) : null}
    </>
  );
}

function HubRow({
  label,
  onPress,
  accessibilityRole = 'button',
}: {
  label: string;
  onPress: () => void;
  accessibilityRole?: 'button' | 'link';
}) {
  return (
    <Pressable accessibilityRole={accessibilityRole} accessibilityLabel={label} onPress={onPress} style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.chevron}>→</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  screen: { flex: 1, padding: 24, gap: 12 },
  title: { ...type.navTitle, color: colors.textStrong },
  name: { ...type.bodyMedium, color: colors.textStrong, fontSize: 18 },
  body: { ...type.body, color: colors.text },
  meta: { ...type.caption, color: colors.textMuted },
  success: { ...type.caption, color: colors.success },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: { ...type.bodyMedium, color: colors.textStrong },
  chevron: { ...type.body, color: colors.textMuted },
  section: { ...type.caption, color: colors.textMuted, marginTop: 8 },
  signOutWrap: { minHeight: 44, justifyContent: 'center' },
  signOut: {
    ...type.bodyMedium,
    color: colors.brandStrong,
  },
});
