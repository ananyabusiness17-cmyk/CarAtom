import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { FlowScreen } from '../../src/components/FlowScreen';
import { HomeSkeleton } from '../../src/components/home/HomeSkeleton';
import { InlineBanner } from '../../src/components/home/InlineBanner';
import { PrimaryButton } from '../../src/components/home/PrimaryButton';
import { SosMap } from '../../src/components/sos/SosMap';
import { sosQueryKeys } from '../../src/coordinators/sosCoordinator';
import { useLiveLocation } from '../../src/hooks/useLiveLocation';
import { apiClient } from '../../src/lib/api';
import { useSosSessionStore } from '../../src/stores/sosSessionStore';
import { colors, radius, type } from '../../src/theme/tokens';

export default function SosDispatchedScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const stored = useSosSessionStore((s) => s.activeTicketId);
  const ticketId = id ?? stored ?? '';
  const location = useLiveLocation();
  const query = useQuery({
    queryKey: sosQueryKeys.ticket(ticketId),
    queryFn: () => apiClient.getSupportTicket(ticketId),
    enabled: Boolean(ticketId),
  });

  const ticket = query.data;
  const phone = ticket?.ops_phone_e164;
  const partner =
    ticket?.dispatched_partner_label ?? 'Roadside partner · ETA ~25 min · tyre assist';
  const eta = ticket?.eta_minutes ? `ETA ~${ticket.eta_minutes} min` : 'ETA shared by ops';

  return (
    <FlowScreen>
      {query.isLoading ? <HomeSkeleton /> : null}
      {query.isError ? (
        <InlineBanner
          message="Could not load this request."
          actionLabel="Retry"
          onAction={() => void query.refetch()}
        />
      ) : null}
      <View style={styles.chip}>
        <Text style={styles.chipText}>Help dispatched</Text>
      </View>
      <Text style={styles.partner}>{partner}</Text>
      <Text style={styles.eta}>{eta} · tyre assist</Text>
      <SosMap
        latitude={ticket?.latitude ?? location.latitude}
        longitude={ticket?.longitude ?? location.longitude}
      />
      <PrimaryButton
        tone="sos"
        label="Call ops again"
        disabled={!phone}
        onPress={() => {
          if (!phone) return;
          void Linking.openURL(`tel:${phone}`);
        }}
      />
      <PrimaryButton label="Back home" onPress={() => router.replace('/(customer)/(tabs)/home')} />
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.successSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { ...type.caption, color: colors.success, fontWeight: '700' },
  partner: { ...type.bodyMedium, color: colors.textStrong },
  eta: { ...type.caption, color: colors.textMuted },
});
