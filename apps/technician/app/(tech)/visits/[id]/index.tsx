import { ApiError } from '@caratom/api-client';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useLayoutEffect } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { InlineBanner } from '../../../../src/components/InlineBanner';
import { MapPreview } from '../../../../src/components/MapPreview';
import { OfflineBanner } from '../../../../src/components/OfflineBanner';
import { PrimaryButton } from '../../../../src/components/PrimaryButton';
import { ScopeChecklist } from '../../../../src/components/ScopeChecklist';
import { SecondaryButton } from '../../../../src/components/SecondaryButton';
import { VisitScreen } from '../../../../src/components/VisitScreen';
import { canRaiseException } from '../../../../src/coordinators/fieldVisitCoordinator';
import { useVisitMutations } from '../../../../src/hooks/useVisitMutations';
import { useVisitDetail } from '../../../../src/hooks/useVisitQueries';
import { requestVisitCoords } from '../../../../src/lib/location';
import { colors, radius, type } from '../../../../src/theme/tokens';

export default function VisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const query = useVisitDetail(id);
  const mutations = useVisitMutations(id ?? '');
  const detail = query.data;

  useLayoutEffect(() => {
    navigation.setOptions({ title: detail?.job_card_ref ?? 'Job' });
  }, [navigation, detail?.job_card_ref]);

  if (!id) return null;

  return (
    <View style={styles.flex}>
      <OfflineBanner />
      <VisitScreen step={2}>
        {query.isError ? (
          <InlineBanner
            message={
              query.error instanceof ApiError && query.error.status === 403
                ? 'You do not have access to this visit.'
                : 'Could not load this job card.'
            }
            actionLabel="Retry"
            onAction={() => void query.refetch()}
          />
        ) : null}
        {query.isLoading ? <Text style={styles.muted}>Loading job card…</Text> : null}
        {detail ? (
          <>
            {detail.status === 'SUPPORT_REQUIRED' ? (
              <InlineBanner
                tone="warning"
                message="Advisor review requested. Visit may pause until scope is re-approved."
              />
            ) : null}
            <View style={styles.tags}>
              {detail.tags.map((tag) => (
                <View
                  key={tag.code}
                  style={[styles.chip, tag.code === 'APPROVED' ? styles.okChip : styles.neutralChip]}
                >
                  <Text style={[styles.chipText, tag.code === 'APPROVED' ? styles.okText : null]}>
                    {tag.label}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.card}>
              <View style={styles.photo} accessibilityLabel="Vehicle photo placeholder" />
              <Text style={styles.vehicle}>{detail.vehicle_label}</Text>
              <Text style={styles.muted}>
                {[detail.plate, detail.scheduled_label].filter(Boolean).join(' · ')}
              </Text>
            </View>
            {detail.concerns ? (
              <View style={styles.card}>
                <Text style={styles.label}>Customer concerns</Text>
                <Text style={styles.body}>{detail.concerns}</Text>
              </View>
            ) : null}
            <Text style={styles.section}>Approved work (from job card)</Text>
            <ScopeChecklist lines={detail.scope_lines} mode="scope" />
            <Text style={styles.disclaimer}>
              Selling prices hidden · estimate edits are advisor-only on admin
            </Text>
            {detail.advisor_note ? (
              <View style={styles.card}>
                <Text style={styles.label}>Advisor note</Text>
                <Text style={styles.body}>{detail.advisor_note}</Text>
              </View>
            ) : null}
            <View style={styles.card}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Call ${detail.customer_name}`}
                onPress={() => void Linking.openURL('tel:')}
                style={styles.row}
              >
                <Text style={styles.body}>{detail.customer_name}</Text>
                <Text style={styles.link}>Call</Text>
              </Pressable>
              <Text style={styles.muted}>{detail.address_full || detail.address_short}</Text>
              {detail.parking_notes ? <Text style={styles.muted}>{detail.parking_notes}</Text> : null}
            </View>
            <MapPreview
              latitude={detail.latitude}
              longitude={detail.longitude}
              label="OpenStreetMap"
            />
            {mutations.error ? <InlineBanner message={mutations.error} /> : null}
            {canRaiseException(detail) ? (
              <SecondaryButton
                label="Raise exception"
                onPress={() => router.push(`/visits/${id}/exception`)}
              />
            ) : null}
            {detail.allowed_actions.includes('EN_ROUTE') ? (
              <SecondaryButton
                label="I'm on the way"
                onPress={() => {
                  void (async () => {
                    const { coords } = await requestVisitCoords();
                    await mutations.enRoute(coords);
                  })();
                }}
              />
            ) : null}
            <PrimaryButton
              label="Open navigation"
              loading={mutations.busy}
              onPress={() => router.push(`/visits/${id}/navigate`)}
            />
          </>
        ) : null}
      </VisitScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.canvas },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 4 },
  okChip: { backgroundColor: colors.successSoft },
  neutralChip: { backgroundColor: colors.surfaceSubtle },
  chipText: { ...type.caption, color: colors.text },
  okText: { color: colors.success },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 14,
    gap: 6,
  },
  photo: {
    height: 88,
    borderRadius: radius.control,
    backgroundColor: colors.surfaceSubtle,
  },
  vehicle: { ...type.bodyMedium, color: colors.textStrong },
  label: { ...type.caption, color: colors.textMuted },
  body: { ...type.body, color: colors.text },
  section: { ...type.bodyMedium, color: colors.textStrong },
  disclaimer: { ...type.caption, color: colors.textMuted },
  muted: { ...type.caption, color: colors.textMuted },
  row: { minHeight: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { ...type.bodyMedium, color: colors.brandStrong },
});
