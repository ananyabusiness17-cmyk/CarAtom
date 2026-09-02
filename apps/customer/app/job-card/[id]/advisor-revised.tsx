import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@caratom/api-client';

import { FlowRail } from '../../../src/components/FlowRail';
import { FlowScreen } from '../../../src/components/FlowScreen';
import { HomeSkeleton } from '../../../src/components/home/HomeSkeleton';
import { InlineBanner } from '../../../src/components/home/InlineBanner';
import { PrimaryButton } from '../../../src/components/home/PrimaryButton';
import { SecondaryButton } from '../../../src/components/SecondaryButton';
import { formatInr, newIdempotencyKey } from '../../../src/lib/formatMoney';
import { track } from '../../../src/lib/analytics';
import { apiClient } from '../../../src/lib/api';
import { nextRepairRouteFromDecision, queryKeys } from '../../../src/coordinators/serviceRepairCoordinator';
import { useAdvisorCasePoll } from '../../../src/hooks/useAdvisorCasePoll';
import { colors, radius, type } from '../../../src/theme/tokens';

export default function AdvisorRevisedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const caseQuery = useAdvisorCasePoll(id, Boolean(id));

  useEffect(() => {
    track('revised_estimate_viewed', { id });
  }, [id]);

  const estimate = caseQuery.data?.advisor_case.pending_estimate;

  const accept = useMutation({
    mutationFn: async () => {
      const latest = await caseQuery.refetch();
      const pending = latest.data?.advisor_case.pending_estimate;
      if (!pending) throw new Error('Missing estimate');
      if (pending.status !== 'READY') {
        throw new Error('STALE_ESTIMATE');
      }
      return apiClient.acceptEstimate(
        id,
        pending.id,
        {
          expected_total_minor: pending.total.amount_minor,
          expected_content_hash: pending.content_hash,
        },
        newIdempotencyKey(`accept-v2-${id}`),
      );
    },
    onSuccess: (result) => {
      track('revised_estimate_accepted', { id });
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobCard(id) });
      const href = nextRepairRouteFromDecision(result.flow_decision, { jobCardId: id });
      router.push(href ?? `/checkout/details?jobCardId=${id}`);
    },
    onError: (err) => {
      if (err instanceof Error && err.message === 'STALE_ESTIMATE') {
        setError('This estimate was updated. Pull to refresh and try again.');
        void caseQuery.refetch();
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Could not accept this estimate.');
    },
  });

  const deny = useMutation({
    mutationFn: () => {
      if (!estimate) throw new Error('Missing estimate');
      return apiClient.rejectEstimate(id, estimate.id, newIdempotencyKey(`reject-${id}`));
    },
    onSuccess: (result) => {
      track('revised_estimate_denied', { id });
      const href = nextRepairRouteFromDecision(result.flow_decision, { jobCardId: id });
      router.replace(href ?? `/job-card/${id}/repairs-cart?mode=deny`);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not decline this estimate.');
    },
  });

  return (
    <FlowScreen>
      <FlowRail currentStep={10} variant="gpr" />
      {caseQuery.isLoading ? <HomeSkeleton /> : null}
      {error ? <InlineBanner message={error} /> : null}
      {caseQuery.isError ? (
        <InlineBanner
          message="Could not load the revised estimate."
          actionLabel="Retry"
          onAction={() => void caseQuery.refetch()}
        />
      ) : null}
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.okChip}>
          <Text style={styles.okChipText}>Sent during your call</Text>
        </View>
        <Text style={styles.intro}>
          The advisor updated this during your call. Accept or Deny on the app — field technician
          does not change your bill.
        </Text>
        {(estimate?.line_items ?? []).map((line) => {
          const added = line.change_type === 'ADDED';
          const revised = Boolean(line.was_amount_minor && line.was_amount_minor !== line.amount_minor);
          return (
            <View key={`${line.label}-${line.kind}-${line.repair_offering_slug ?? ''}`} style={styles.line}>
              <View style={styles.lineMeta}>
                <Text style={styles.lineLabel} numberOfLines={2}>
                  {line.label}
                </Text>
                {added ? (
                  <Text style={styles.addedChip} accessibilityLabel={`${line.label}, added on call`}>
                    Added on call
                  </Text>
                ) : null}
                {revised && line.was_amount_minor ? (
                  <Text
                    style={styles.was}
                    accessibilityLabel={`Was ${formatInr(line.was_amount_minor)}, now ${formatInr(line.amount_minor)}`}
                  >
                    Was {formatInr(line.was_amount_minor)}
                  </Text>
                ) : null}
              </View>
              {line.is_included ? (
                <Text style={styles.included}>Included</Text>
              ) : (
                <Text style={styles.price}>{formatInr(line.amount_minor)}</Text>
              )}
            </View>
          );
        })}
        {estimate ? (
          <View style={[styles.line, styles.total]}>
            <Text style={styles.totalLabel}>Total on app</Text>
            <Text
              style={styles.totalValue}
              accessibilityLabel={`Total ${formatInr(estimate.total.amount_minor)}`}
            >
              {formatInr(estimate.total.amount_minor)}
            </Text>
          </View>
        ) : null}
        <Text style={styles.hint}>Accept → ⑪ Slot · Deny → repairs cart to remove items and go back.</Text>
      </ScrollView>
      <PrimaryButton
        label="Accept"
        loading={accept.isPending}
        disabled={!estimate}
        onPress={() => void accept.mutate()}
      />
      <SecondaryButton
        label="Deny"
        disabled={!estimate || deny.isPending}
        onPress={() => void deny.mutate()}
      />
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingBottom: 16 },
  okChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.successSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  okChipText: { ...type.caption, color: colors.success, fontWeight: '700' },
  intro: { ...type.body, color: colors.textMuted },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    gap: 12,
  },
  lineMeta: { flex: 1, gap: 4 },
  lineLabel: { ...type.body, color: colors.text },
  addedChip: {
    alignSelf: 'flex-start',
    ...type.caption,
    color: colors.textMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  was: { ...type.caption, color: colors.textMuted, textDecorationLine: 'line-through' },
  price: { ...type.bodyMedium, color: colors.textStrong },
  included: { ...type.caption, color: colors.success, fontWeight: '700' },
  total: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 14 },
  totalLabel: { ...type.bodyMedium, color: colors.textStrong },
  totalValue: { ...type.price, color: colors.textStrong },
  hint: { ...type.caption, color: colors.textMuted, textAlign: 'center' },
});
