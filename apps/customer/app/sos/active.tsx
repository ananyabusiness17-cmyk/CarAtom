import { ApiError } from '@caratom/api-client';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { FlowScreen } from '../../src/components/FlowScreen';
import { InlineBanner } from '../../src/components/home/InlineBanner';
import { SecondaryButton } from '../../src/components/SecondaryButton';
import { SosMap } from '../../src/components/sos/SosMap';
import { nextSosRoute, pollTicketUntilDispatched } from '../../src/coordinators/sosCoordinator';
import { useLiveLocation } from '../../src/hooks/useLiveLocation';
import { apiClient } from '../../src/lib/api';
import { newIdempotencyKey } from '../../src/lib/formatMoney';
import { useSosSessionStore } from '../../src/stores/sosSessionStore';
import { colors, type } from '../../src/theme/tokens';

export default function SosActiveScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const stored = useSosSessionStore((s) => s.activeTicketId);
  const setActive = useSosSessionStore((s) => s.setActiveTicketId);
  const ticketId = id ?? stored ?? '';
  const location = useLiveLocation();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigated = useRef(false);

  useEffect(() => {
    if (!ticketId) return;
    const controller = new AbortController();
    void pollTicketUntilDispatched(
      (nextId) => apiClient.getSupportTicket(nextId),
      ticketId,
      controller.signal,
      3000,
    )
      .then((ticket) => {
        if (navigated.current) return;
        navigated.current = true;
        if (ticket.status === 'CANCELLED') {
          setActive(null);
          router.replace('/(customer)/(tabs)/home');
          return;
        }
        router.replace(nextSosRoute(ticket.status, ticket.id));
      })
      .catch((err) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof ApiError ? err.message : 'Still trying to reach ops…');
      });
    return () => {
      controller.abort();
    };
  }, [router, setActive, ticketId]);

  async function cancel() {
    if (!ticketId) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient.cancelSupportTicket(ticketId, newIdempotencyKey(`sos-cancel-${ticketId}`));
      setActive(null);
      router.replace('/(customer)/(tabs)/home');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <FlowScreen>
      <Text style={styles.title}>Calling CARATOM ops</Text>
      <Text style={styles.sub}>Sharing location + issue type</Text>
      {error ? <InlineBanner message={error} /> : null}
      <SosMap latitude={location.latitude} longitude={location.longitude} />
      <Text style={styles.poll}>Waiting for ops…</Text>
      <SecondaryButton label="Cancel call" disabled={busy} onPress={() => void cancel()} />
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.navTitle, color: colors.textStrong },
  sub: { ...type.body, color: colors.textMuted },
  poll: { ...type.caption, color: colors.textMuted, textAlign: 'center' },
});
