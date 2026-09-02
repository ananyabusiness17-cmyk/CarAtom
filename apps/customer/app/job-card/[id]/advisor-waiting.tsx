import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@caratom/api-client';

import { FlowRail } from '../../../src/components/FlowRail';
import { FlowScreen } from '../../../src/components/FlowScreen';
import { HomeSkeleton } from '../../../src/components/home/HomeSkeleton';
import { InlineBanner } from '../../../src/components/home/InlineBanner';
import { PrimaryButton } from '../../../src/components/home/PrimaryButton';
import { nextRepairRouteFromDecision } from '../../../src/coordinators/serviceRepairCoordinator';
import { useAdvisorCasePoll } from '../../../src/hooks/useAdvisorCasePoll';
import { track } from '../../../src/lib/analytics';
import { apiClient } from '../../../src/lib/api';
import { formatInr } from '../../../src/lib/formatMoney';
import { colors, radius, type } from '../../../src/theme/tokens';

const TERMINAL_BAD = ['DECLINED', 'CANCELLED', 'UNREACHABLE'];

export default function AdvisorWaitingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [simError, setSimError] = useState<string | null>(null);
  const caseQuery = useAdvisorCasePoll(id, Boolean(id));
  const advisor = caseQuery.data?.advisor_case;

  useEffect(() => {
    track('advisor_waiting_viewed', { id });
  }, [id]);

  useEffect(() => {
    if (!advisor) return;
    if (advisor.status === 'CUSTOMER_CONFIRMATION_DUE') {
      const href = nextRepairRouteFromDecision(
        caseQuery.data?.flow_decision ?? {
          policy: 'GENERAL_SERVICE',
          advisor_requirement: 'REQUIRED_NOW',
          estimate_requirement: 'PRE_BOOKING',
          required_next_action: 'ACCEPT_REVISED_ESTIMATE',
          allowed_actions: [],
          blocking_reasons: [],
        },
        { jobCardId: id },
      );
      router.replace(href ?? `/job-card/${id}/advisor-revised`);
    }
  }, [advisor, caseQuery.data?.flow_decision, id, router]);

  const simulate = useMutation({
    mutationFn: () => apiClient.simulateAdvisorEstimate(id),
    onSuccess: () => {
      void caseQuery.refetch();
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 404 && err.message === 'Not found.') {
        setSimError(
          'Dev simulate is off on this server. Set ENABLE_DEV_SIMULATE=true on the Railway api service, redeploy api, then reload the app.',
        );
        return;
      }
      setSimError(err instanceof ApiError ? err.message : 'Could not simulate the advisor estimate.');
    },
  });

  const failed = advisor && TERMINAL_BAD.includes(advisor.status);
  const statusLabel = advisor?.safe_status_label ?? 'Callback requested';

  return (
    <FlowScreen>
      <FlowRail currentStep={9} variant="gpr" />
      {caseQuery.isLoading ? <HomeSkeleton /> : null}
      {caseQuery.isError ? (
        <InlineBanner
          message="Could not load callback status."
          actionLabel="Retry"
          onAction={() => void caseQuery.refetch()}
        />
      ) : null}
      {failed ? (
        <InlineBanner message="This callback ended without a new estimate. Adjust your cart or contact support." />
      ) : null}
      {simError ? <InlineBanner message={simError} /> : null}
      <View style={styles.center}>
        <View style={styles.icon} accessibilityLabel="Call in progress">
          <Text style={styles.iconText}>CALL</Text>
        </View>
        <View style={styles.chip}>
          <Text style={styles.chipText}>Callback in progress</Text>
        </View>
        <Text style={styles.title}>{advisor?.advisor_display_name ?? 'Your advisor'} is calling you</Text>
        <Text style={styles.body}>
          {
            "Your sales advisor may add or remove repairs on the call. The estimate lands in your app while you're still talking — it might stay the same."
          }
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Submitted total</Text>
        <Text style={styles.rowValue}>
          {advisor ? formatInr(advisor.submitted_total_minor) : '—'}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Status</Text>
        <View style={styles.statusChip} accessibilityLiveRegion="polite">
          <Text style={styles.statusText}>{statusLabel === 'Callback in progress' ? 'On call' : statusLabel}</Text>
        </View>
      </View>
      <Text style={styles.hint}>Watch for ⑩ on your app — Accept or Deny when the estimate arrives.</Text>
      {typeof __DEV__ !== 'undefined' && __DEV__ ? (
        <PrimaryButton
          label="Simulate advisor estimate"
          loading={simulate.isPending}
          onPress={() => void simulate.mutate()}
        />
      ) : null}
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: 12, paddingVertical: 16 },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { ...type.caption, color: colors.warning, fontWeight: '700', letterSpacing: 1 },
  chip: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { ...type.caption, color: colors.warning, fontWeight: '700' },
  title: { ...type.navTitle, fontSize: 22, color: colors.textStrong, textAlign: 'center' },
  body: { ...type.body, color: colors.textMuted, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowLabel: { ...type.body, color: colors.textMuted },
  rowValue: { ...type.bodyMedium, color: colors.textStrong },
  statusChip: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: { ...type.caption, color: colors.warning, fontWeight: '700' },
  hint: { ...type.caption, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
});
