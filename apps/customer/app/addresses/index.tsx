import { ApiError } from '@caratom/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text } from 'react-native';

import { AddressCard } from '../../src/components/account/AddressCard';
import { AddressForm } from '../../src/components/account/AddressForm';
import { FlowScreen } from '../../src/components/FlowScreen';
import { HomeSkeleton } from '../../src/components/home/HomeSkeleton';
import { InlineBanner } from '../../src/components/home/InlineBanner';
import { PrimaryButton } from '../../src/components/home/PrimaryButton';
import { SecondaryButton } from '../../src/components/SecondaryButton';
import { apiClient } from '../../src/lib/api';
import { useAuth } from '../../src/providers/AuthProvider';
import { colors, type } from '../../src/theme/tokens';

const RETURN_TO = '/addresses';

export default function AddressesScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const client = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ['addresses'],
    queryFn: () => apiClient.listAddresses(),
    enabled: Boolean(session),
  });
  const save = useMutation({
    mutationFn: (values: {
      line1: string;
      locality: string;
      city: string;
      postal_code: string;
      latitude?: number;
      longitude?: number;
    }) =>
      apiClient.createAddress({
        ...values,
        latitude: values.latitude ?? 12.9352,
        longitude: values.longitude ?? 77.6245,
        is_default: (query.data?.items.length ?? 0) === 0,
      }),
    onSuccess: async () => {
      setAdding(false);
      setError(null);
      await client.invalidateQueries({ queryKey: ['addresses'] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not save address.');
    },
  });

  if (!session) {
    return (
      <FlowScreen>
        <Text style={styles.body}>Log in to manage saved addresses.</Text>
        <PrimaryButton
          label="Log in"
          onPress={() => router.push({ pathname: '/(auth)/phone', params: { returnTo: RETURN_TO } })}
        />
      </FlowScreen>
    );
  }

  return (
    <FlowScreen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
      >
        {error ? <InlineBanner message={error} /> : null}
        {query.isLoading ? <HomeSkeleton /> : null}
        {query.isError ? (
          <InlineBanner
            message="Could not load addresses."
            actionLabel="Retry"
            onAction={() => void query.refetch()}
          />
        ) : null}
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {query.data?.items.length === 0 ? (
            <Text style={styles.empty}>No addresses yet</Text>
          ) : null}
          {query.data?.items.map((address) => (
            <AddressCard key={address.id} address={address} />
          ))}
          {adding ? (
            <AddressForm submitting={save.isPending} onSubmit={(values) => save.mutate(values)} />
          ) : (
            <SecondaryButton label="Add address" onPress={() => setAdding(true)} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { gap: 12, paddingBottom: 24 },
  empty: { ...type.body, color: colors.textMuted },
});
