import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FlowScreen } from '../../../src/components/FlowScreen';
import { InspectionFlowRail } from '../../../src/components/InspectionFlowRail';
import { InlineBanner } from '../../../src/components/home/InlineBanner';
import { PrimaryButton } from '../../../src/components/home/PrimaryButton';
import { queryKeys } from '../../../src/coordinators/generalServiceCoordinator';
import { routeFromInspectionRepairState } from '../../../src/coordinators/inspectionRepairCoordinator';
import { apiClient } from '../../../src/lib/api';
import { colors, radius, type } from '../../../src/theme/tokens';

const CHIP: Record<string, string> = {
  RECOMMENDED: 'Ordered',
  ORDERED: 'Ordered',
  IN_TRANSIT: 'In transit',
  READY: 'Ready',
};

export default function PartsPendingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const jobQuery = useQuery({
    queryKey: queryKeys.jobCard(id),
    queryFn: () => apiClient.getJobCard(id),
    enabled: Boolean(id),
    refetchInterval: 30000,
  });
  const partsQuery = useQuery({
    queryKey: ['parts-status', id],
    queryFn: () => apiClient.getPartsStatus(id),
    enabled: Boolean(id),
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (partsQuery.data?.all_ready && jobQuery.data) {
      router.replace(
        routeFromInspectionRepairState({
          jobCard: {
            ...jobQuery.data.job_card,
            parts_status: { all_ready: true },
          },
          flowDecision: jobQuery.data.flow_decision,
        }),
      );
    }
  }, [partsQuery.data, jobQuery.data, router]);

  const advance = jobQuery.data?.job_card.parts_status?.parts_advance_captured;

  return (
    <FlowScreen>
      <InspectionFlowRail currentStep={13} />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={partsQuery.isFetching}
            onRefresh={() => {
              void partsQuery.refetch();
              void jobQuery.refetch();
            }}
          />
        }
      >
        <Text style={styles.title}>Preparing your parts</Text>
        <Text style={styles.sub}>
          {"We've ordered the parts for your repair. You'll be able to book visit 2 when they're ready."}
        </Text>
        {advance ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Parts advance paid</Text>
          </View>
        ) : null}
        {(partsQuery.data?.parts ?? []).map((part) => (
          <View key={part.id} style={styles.row}>
            <Text style={styles.part}>{part.description}</Text>
            <Text style={styles.chip}>{CHIP[part.readiness_status] ?? part.readiness_status}</Text>
            {part.eta_label ? <Text style={styles.eta}>{part.eta_label}</Text> : null}
          </View>
        ))}
        {partsQuery.isSuccess && !(partsQuery.data?.parts ?? []).length ? (
          <Text style={styles.footer}>No parts listed yet.</Text>
        ) : null}
        {partsQuery.isError ? (
          <InlineBanner
            message="Could not load parts status."
            actionLabel="Retry"
            onAction={() => void partsQuery.refetch()}
          />
        ) : null}
        <Text style={styles.footer}>{"We'll notify you when you can book the repair visit."}</Text>
      </ScrollView>
      <PrimaryButton
        label="Refresh status"
        onPress={() => {
          void partsQuery.refetch();
          void jobQuery.refetch();
        }}
      />
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingBottom: 16 },
  title: { ...type.navTitle, color: colors.textStrong },
  sub: { ...type.body, color: colors.textMuted },
  badge: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.card,
    padding: 10,
  },
  badgeText: { ...type.caption, color: colors.success, fontWeight: '700' },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  part: { ...type.bodyMedium, color: colors.textStrong },
  chip: { ...type.caption, color: colors.warning },
  eta: { ...type.caption, color: colors.textMuted },
  footer: { ...type.caption, color: colors.textMuted },
});
