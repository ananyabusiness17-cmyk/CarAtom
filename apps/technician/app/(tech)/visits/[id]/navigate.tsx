import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { InlineBanner } from '../../../../src/components/InlineBanner';
import { MapPreview } from '../../../../src/components/MapPreview';
import { OfflineBanner } from '../../../../src/components/OfflineBanner';
import { PrimaryButton } from '../../../../src/components/PrimaryButton';
import { VisitScreen } from '../../../../src/components/VisitScreen';
import { nextRouteForVisit } from '../../../../src/coordinators/fieldVisitCoordinator';
import { useVisitMutations } from '../../../../src/hooks/useVisitMutations';
import { useVisitDetail } from '../../../../src/hooks/useVisitQueries';
import { technicianApi } from '../../../../src/lib/api';
import { newEventId } from '../../../../src/lib/ids';
import { requestVisitCoords } from '../../../../src/lib/location';
import { colors, radius, type } from '../../../../src/theme/tokens';

export default function NavigateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const query = useVisitDetail(id);
  const mutations = useVisitMutations(id ?? '');
  const [denied, setDenied] = useState(false);
  const detail = query.data;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      const { coords, permissionDenied } = await requestVisitCoords();
      if (cancelled) return;
      setDenied(permissionDenied);
      if (permissionDenied || coords.lat == null || coords.lng == null) return;
      try {
        await technicianApi.locationPing({
          visit_id: id,
          lat: coords.lat,
          lng: coords.lng,
          accuracy_m: coords.accuracy_m,
          recorded_at: new Date().toISOString(),
          client_event_id: newEventId(),
          force: true,
        });
      } catch {
        // Throttle or offline — check-in still works without a ping.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) return null;

  async function arrive() {
    const { coords, permissionDenied } = await requestVisitCoords();
    setDenied(permissionDenied);
    await mutations.checkIn({ ...coords, force: true });
    const next = await query.refetch();
    if (next.data) {
      router.replace(nextRouteForVisit(next.data));
    }
  }

  return (
    <View style={styles.flex}>
      <OfflineBanner />
      <VisitScreen step={3}>
        <MapPreview
          latitude={detail?.latitude ?? 12.9352}
          longitude={detail?.longitude ?? 77.6245}
          label="OpenStreetMap"
          height={280}
        />
        <View style={styles.card}>
          <Text style={styles.address}>{detail?.address_full || 'Address not available'}</Text>
          <Text style={styles.eta}>
            {detail?.distance_km != null ? `${detail.distance_km} km` : 'En route'}
          </Text>
        </View>
        {denied ? (
          <InlineBanner
            tone="warning"
            message="Location is off. You can still check in — arrival will not include GPS."
          />
        ) : (
          <Text style={styles.rationale}>
            CARATOM uses your location to navigate to customer addresses and record arrival.
          </Text>
        )}
        {mutations.error ? <InlineBanner message={mutations.error} /> : null}
        <PrimaryButton
          label="Arrived · on site"
          loading={mutations.busy}
          onPress={() => void arrive()}
        />
      </VisitScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.canvas },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 14,
    gap: 4,
  },
  address: { ...type.bodyMedium, color: colors.textStrong },
  eta: { ...type.caption, color: colors.textMuted },
  rationale: { ...type.caption, color: colors.textMuted },
});
