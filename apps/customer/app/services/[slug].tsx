import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '@caratom/api-client';
import type { ServiceDetail } from '@caratom/contracts';

import { FlowRail } from '../../src/components/FlowRail';
import { FlowScreen } from '../../src/components/FlowScreen';
import { HomeSkeleton } from '../../src/components/home/HomeSkeleton';
import { IncludedList } from '../../src/components/home/IncludedList';
import { InlineBanner } from '../../src/components/home/InlineBanner';
import { PrimaryButton } from '../../src/components/home/PrimaryButton';
import { apiClient } from '../../src/lib/api';
import { formatInr } from '../../src/lib/formatMoney';
import { useJobCardFlowStore } from '../../src/stores/jobCardFlowStore';
import { useVehicleDraftStore } from '../../src/stores/vehicleDraftStore';
import { colors, radius, type } from '../../src/theme/tokens';

const BODY: Record<string, string> = {
  'bulb-headlight': 'Fit H4 / LED bulb at your doorstep. Parts priced if non-standard.',
};

export default function ServiceDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const setJobCard = useJobCardFlowStore((s) => s.setJobCard);
  const setFlowKind = useJobCardFlowStore((s) => s.setFlowKind);
  const [detail, setDetail] = useState<ServiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      setError('Missing service.');
      return;
    }
    setLoading(true);
    setError(null);
    void apiClient
      .getService(slug)
      .then(setDetail)
      .catch((err) => {
        setDetail(null);
        setError(err instanceof ApiError ? err.message : 'Service not found.');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const oneMan = detail?.flow_policy === 'ONE_MAN';
  const price = detail?.display_price
    ? formatInr(detail.display_price.amount_minor)
    : '';
  const duration = detail?.duration_minutes ? `~${detail.duration_minutes} min` : '';

  async function bookOneMan() {
    if (!detail) return;
    setBooking(true);
    setError(null);
    try {
      const draft = useVehicleDraftStore.getState();
      const created = await apiClient.createJobCard({
        service_offering_slug: detail.slug,
        vehicle_context: {
          make: draft.make ?? 'Honda',
          model: draft.model ?? 'City',
          year: draft.year ?? 2019,
          fuel_type: draft.fuelType ?? 'PETROL',
          transmission: draft.transmission ?? 'MANUAL',
        },
        concerns: [],
      });
      setFlowKind('oneman');
      setJobCard(created.job_card.id, detail.slug);
      router.push({
        pathname: '/oneman/vehicle',
        params: { jobCardId: created.job_card.id },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start this job.');
    } finally {
      setBooking(false);
    }
  }

  return (
    <FlowScreen>
      {oneMan ? <FlowRail currentStep={2} variant="oneman" /> : null}
      {loading ? <HomeSkeleton /> : null}
      {error ? (
        <InlineBanner message={error} actionLabel="Back" onAction={() => router.back()} />
      ) : null}
      {detail ? (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.hero} accessibilityLabel="Service photo">
            <View style={styles.heroFill} />
          </View>
          <Text style={styles.title}>{detail.name}</Text>
          <Text style={styles.meta}>
            {[duration, '1 technician', price].filter(Boolean).join(' · ')}
          </Text>
          <Text style={styles.copy}>
            {BODY[detail.slug] ?? `${detail.name} at your doorstep. Tech arrives with basic parts.`}
          </Text>
          {detail.included_items.length ? (
            <>
              <Text style={styles.section}>Included</Text>
              <IncludedList items={detail.included_items} />
            </>
          ) : null}
          {detail.disclosures.map((item) => (
            <Text key={item} style={styles.disclosure}>
              {item}
            </Text>
          ))}
        </ScrollView>
      ) : null}
      {detail ? (
        <PrimaryButton
          label={oneMan ? 'Book this job' : 'Booking in a later phase'}
          disabled={!oneMan || booking}
          loading={booking}
          onPress={() => {
            if (oneMan) void bookOneMan();
          }}
        />
      ) : null}
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingBottom: 16 },
  hero: {
    height: 140,
    borderRadius: radius.card,
    backgroundColor: colors.surfaceSubtle,
    overflow: 'hidden',
  },
  heroFill: {
    flex: 1,
    margin: 28,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  title: { ...type.navTitle, color: colors.textStrong },
  meta: { ...type.caption, color: colors.textMuted },
  copy: { ...type.body, color: colors.text },
  section: { ...type.sectionTitle, color: colors.textStrong },
  disclosure: { ...type.caption, color: colors.textMuted },
});
