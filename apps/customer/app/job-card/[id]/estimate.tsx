import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@caratom/api-client';
import type { PriceResponse } from '@caratom/contracts';

import { FlowRail } from '../../../src/components/FlowRail';
import { FlowScreen } from '../../../src/components/FlowScreen';
import { InspectionFlowRail } from '../../../src/components/InspectionFlowRail';
import { PartsAdvanceSummary } from '../../../src/components/PartsAdvanceSummary';
import { SecondaryButton } from '../../../src/components/SecondaryButton';
import { PolicyNote } from '../../../src/components/home/PolicyNote';
import { HomeSkeleton } from '../../../src/components/home/HomeSkeleton';
import { InlineBanner } from '../../../src/components/home/InlineBanner';
import { PrimaryButton } from '../../../src/components/home/PrimaryButton';
import { queryKeys } from '../../../src/coordinators/generalServiceCoordinator';
import { routeFromInspectionRepairState } from '../../../src/coordinators/inspectionRepairCoordinator';
import { hasRepairItems, nextRouteForJob } from '../../../src/coordinators/serviceRepairCoordinator';
import { track } from '../../../src/lib/analytics';
import { apiClient } from '../../../src/lib/api';
import { firstParam } from '../../../src/lib/routeParam';
import { formatInr, newIdempotencyKey, partsAdvancePercent } from '../../../src/lib/formatMoney';
import { useAuth } from '../../../src/providers/AuthProvider';
import { StaleEstimateGuard } from '../../../src/recovery/StaleEstimateGuard';
import { useJobCardFlowStore } from '../../../src/stores/jobCardFlowStore';
import { colors, type } from '../../../src/theme/tokens';

export default function EstimateScreen() {
  const params = useLocalSearchParams<{ id: string; source?: string }>();
  const id = firstParam(params.id);
  const source = firstParam(params.source) || undefined;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const flowKind = useJobCardFlowStore((s) => s.flowKind);
  const setFlowKind = useJobCardFlowStore((s) => s.setFlowKind);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const returnTo = `/job-card/${id}/estimate`;

  const jobQuery = useQuery({
    queryKey: queryKeys.jobCard(id),
    queryFn: () => apiClient.getJobCard(id),
    enabled: Boolean(id),
  });
  const isIr =
    source === 'inspection' ||
    flowKind === 'ir' ||
    jobQuery.data?.job_card.flow_policy === 'INSPECTION_REPAIR';

  const findingsQuery = useQuery({
    queryKey: ['inspection-findings', id],
    queryFn: () => apiClient.getInspectionFindings(id),
    enabled: Boolean(id) && isIr,
  });

  const cached = queryClient.getQueryData<PriceResponse>(queryKeys.estimate(id));
  const estimateQuery = useQuery({
    queryKey: queryKeys.estimate(id),
    queryFn: () => apiClient.priceJobCard(id),
    enabled: Boolean(id) && !cached && !isIr,
    initialData: cached,
  });

  const irSummary = findingsQuery.data?.estimate_summary;
  const repairs = hasRepairItems(estimateQuery.data?.estimate.line_items);
  const lines = isIr ? (irSummary?.line_items ?? []) : (estimateQuery.data?.estimate.line_items ?? []);
  const totalMinor = isIr
    ? (irSummary?.total.amount_minor ?? 0)
    : (estimateQuery.data?.estimate.total.amount_minor ?? 0);
  const advanceMinor = irSummary?.parts_advance.amount_minor ?? 0;
  const partsSubtotal = lines
    .filter((line) => line.kind === 'PART')
    .reduce((sum, line) => sum + line.amount_minor, 0);

  useEffect(() => {
    track('estimate_viewed', { id });
  }, [id]);

  useEffect(() => {
    if (repairs && !isIr) setFlowKind('gpr');
  }, [repairs, isIr, setFlowKind]);

  const accept = useMutation({
    mutationFn: async () => {
      if (isIr) {
        if (!irSummary) throw new Error('Missing estimate');
        return apiClient.acceptEstimate(
          id,
          irSummary.estimate_id,
          {
            expected_total_minor: irSummary.total.amount_minor,
            expected_content_hash: irSummary.content_hash,
          },
          newIdempotencyKey(`accept-${id}`),
        );
      }
      const estimate = estimateQuery.data?.estimate;
      if (!estimate) throw new Error('Missing estimate');
      if (repairs && !session) {
        router.push({ pathname: '/(auth)/phone', params: { returnTo } });
        throw new Error('AUTH_REDIRECT');
      }
      const accepted = await apiClient.acceptEstimate(
        id,
        estimate.id,
        {
          expected_total_minor: estimate.total.amount_minor,
          expected_content_hash: estimate.content_hash,
        },
        newIdempotencyKey(`accept-${id}`),
      );
      if (repairs) {
        return apiClient.createAdvisorCase(id, newIdempotencyKey(`advisor-${id}`));
      }
      return accepted;
    },
    onSuccess: async (result) => {
      track(isIr ? 'estimate_accepted' : repairs ? 'advisor_case_created' : 'estimate_accepted', { id });
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobCard(id) });
      if (isIr) {
        const envelope = await apiClient.getJobCard(id);
        const href = routeFromInspectionRepairState({
          jobCard: envelope.job_card,
          flowDecision: envelope.flow_decision,
        });
        router.replace(href);
        return;
      }
      try {
        const href = nextRouteForJob(result.flow_decision, { jobCardId: id }, lines);
        if (href) router.push(href);
      } catch (navErr) {
        setError(navErr instanceof Error ? navErr.message : 'Could not continue from this estimate.');
      }
    },
    onError: (err) => {
      if (err instanceof Error && err.message === 'AUTH_REDIRECT') return;
      if (err instanceof ApiError && err.problem?.code === 'AUTH_REQUIRED') {
        router.push({ pathname: '/(auth)/phone', params: { returnTo } });
        return;
      }
      if (
        err instanceof ApiError &&
        err.problem?.code === 'INVALID_STATE_TRANSITION' &&
        /does not match/i.test(err.message)
      ) {
        setStale(true);
        return;
      }
      const allowed =
        err instanceof ApiError && err.problem?.allowed_actions?.length
          ? ` Allowed: ${err.problem.allowed_actions.join(', ')}`
          : '';
      setError((err instanceof ApiError ? err.message : 'Could not accept estimate.') + allowed);
    },
  });

  const reject = useMutation({
    mutationFn: async () => {
      if (!irSummary) throw new Error('Missing estimate');
      return apiClient.rejectEstimate(id, irSummary.estimate_id, newIdempotencyKey(`reject-${id}`));
    },
    onSuccess: () => {
      track('estimate_rejected', { id });
      router.replace('/(customer)/(tabs)/home');
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not reject estimate.');
    },
  });

  const loading = isIr ? findingsQuery.isLoading : estimateQuery.isLoading;
  const loadError = isIr ? findingsQuery.isError : estimateQuery.isError;

  return (
    <FlowScreen>
      {isIr ? (
        <InspectionFlowRail currentStep={12} />
      ) : (
        <FlowRail currentStep={repairs ? 8 : 7} variant={repairs ? 'gpr' : 'gs'} />
      )}
      {loading ? <HomeSkeleton /> : null}
      {error ? <InlineBanner message={error} /> : null}
      <StaleEstimateGuard
        visible={stale}
        onReview={() => {
          setStale(false);
          void (isIr ? findingsQuery.refetch() : estimateQuery.refetch());
        }}
        onEdit={() => router.push(`/job-card/${id}`)}
      />
      {loadError ? (
        <InlineBanner
          message="Could not load estimate."
          actionLabel="Retry"
          onAction={() => void (isIr ? findingsQuery.refetch() : estimateQuery.refetch())}
        />
      ) : null}
      <ScrollView contentContainerStyle={styles.body}>
        {isIr ? (
          <PolicyNote>Based on inspection findings · valid 14 days</PolicyNote>
        ) : repairs ? (
          <Text style={styles.intro}>
            Review your cart total. A sales advisor will call to confirm scope on the app.
          </Text>
        ) : (
          <PolicyNote>Indicative total · accept to continue booking</PolicyNote>
        )}
        {lines.map((line) => (
          <View key={`${line.label}-${line.kind}`} style={styles.line}>
            <Text style={styles.lineLabel} numberOfLines={2}>
              {line.label}
            </Text>
            {'is_included' in line && line.is_included ? (
              <Text style={styles.included}>Included</Text>
            ) : (
              <Text
                style={styles.price}
                accessibilityRole="text"
                accessibilityLabel={`Amount ${formatInr(line.amount_minor)}`}
              >
                {formatInr(line.amount_minor)}
              </Text>
            )}
          </View>
        ))}
        {isIr && advanceMinor > 0 ? (
          <PartsAdvanceSummary
            partsSubtotalMinor={partsSubtotal}
            advanceMinor={advanceMinor}
            balanceMinor={Math.max(totalMinor - advanceMinor, 0)}
            percent={partsAdvancePercent(partsSubtotal, advanceMinor)}
          />
        ) : null}
        {totalMinor ? (
          <View style={[styles.line, styles.total]}>
            <Text style={styles.totalLabel}>{isIr ? 'Total repair estimate' : repairs ? 'Indicative total' : 'Total'}</Text>
            <Text
              style={styles.totalValue}
              accessibilityRole="text"
              accessibilityLabel={`Total ${formatInr(totalMinor)}`}
            >
              {formatInr(totalMinor)}
            </Text>
          </View>
        ) : null}
      </ScrollView>
      <PrimaryButton
        label={isIr ? 'Accept estimate' : repairs ? 'Submit estimate & request callback' : 'Accept estimate'}
        loading={accept.isPending}
        disabled={isIr ? !irSummary : !estimateQuery.data?.estimate}
        onPress={() => void accept.mutate()}
      />
      {isIr ? (
        <>
          <SecondaryButton
            label="Reject estimate"
            onPress={() =>
              Alert.alert('Reject this estimate?', 'We will not book a repair visit.', [
                { text: 'Keep estimate', style: 'cancel' },
                { text: 'Reject', style: 'destructive', onPress: () => void reject.mutate() },
              ])
            }
          />
          <SecondaryButton label="View findings" onPress={() => router.push(`/job-card/${id}/findings`)} />
        </>
      ) : repairs ? null : (
        <SecondaryButton label="Change job card" onPress={() => router.push(`/job-card/${id}`)} />
      )}
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  body: { gap: 10, paddingBottom: 16 },
  intro: { ...type.body, color: colors.textMuted, marginBottom: 4 },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  lineLabel: { ...type.body, color: colors.text, flex: 1, paddingRight: 12 },
  price: { ...type.bodyMedium, color: colors.textStrong },
  included: { ...type.caption, color: colors.success, fontWeight: '700' },
  total: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 14 },
  totalLabel: { ...type.bodyMedium, color: colors.textStrong },
  totalValue: { ...type.price, color: colors.textStrong },
});
