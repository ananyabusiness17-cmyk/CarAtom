import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';

import { FlowScreen } from '../../../src/components/FlowScreen';
import { InspectionFlowRail } from '../../../src/components/InspectionFlowRail';
import { InlineBanner } from '../../../src/components/home/InlineBanner';
import { PrimaryButton } from '../../../src/components/home/PrimaryButton';
import { queryKeys } from '../../../src/coordinators/generalServiceCoordinator';
import { routeFromInspectionRepairState } from '../../../src/coordinators/inspectionRepairCoordinator';
import { apiClient } from '../../../src/lib/api';
import { colors, type } from '../../../src/theme/tokens';

export default function AwaitingFindingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const query = useQuery({
    queryKey: queryKeys.jobCard(id),
    queryFn: () => apiClient.getJobCard(id),
    enabled: Boolean(id),
    refetchInterval: 8000,
  });

  const progress = query.data?.job_card.customer_progress;
  const body =
    progress === 'ESTIMATE_PENDING'
      ? "Findings received. We're preparing your repair estimate."
      : "Your technician is inspecting the car. We'll notify you when findings are ready.";

  useEffect(() => {
    const envelope = query.data;
    if (!envelope) return;
    if (envelope.job_card.customer_progress === 'ESTIMATE_APPROVAL_REQUIRED') {
      router.replace(
        routeFromInspectionRepairState({
          jobCard: envelope.job_card,
          flowDecision: envelope.flow_decision,
        }),
      );
    }
  }, [query.data, router]);

  return (
    <FlowScreen>
      <InspectionFlowRail currentStep={10} />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => void query.refetch()} />}
      >
        <Text style={styles.title}>Inspection in progress</Text>
        <Text style={styles.copy}>{body}</Text>
        {query.isError ? (
          <InlineBanner message="Could not refresh status." actionLabel="Retry" onAction={() => void query.refetch()} />
        ) : null}
      </ScrollView>
      <PrimaryButton
        label="View booking"
        onPress={() => {
          const bookingId = query.data?.job_card.booking_id;
          if (bookingId) router.push(`/booking/${bookingId}?phase=visit1`);
        }}
      />
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingBottom: 16 },
  title: { ...type.navTitle, color: colors.textStrong },
  copy: { ...type.body, color: colors.textMuted },
});
