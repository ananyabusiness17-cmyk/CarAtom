import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@caratom/api-client';
import type { PriceResponse } from '@caratom/contracts';

import { FlowRail } from '../../../src/components/FlowRail';
import { FlowScreen } from '../../../src/components/FlowScreen';
import { InspectionFlowRail } from '../../../src/components/InspectionFlowRail';
import { PartsAdvanceSummary } from '../../../src/components/PartsAdvanceSummary';
import { QtyStepper } from '../../../src/components/QtyStepper';
import { SecondaryButton } from '../../../src/components/SecondaryButton';
import { PolicyNote } from '../../../src/components/home/PolicyNote';
import { HomeSkeleton } from '../../../src/components/home/HomeSkeleton';
import { InlineBanner } from '../../../src/components/home/InlineBanner';
import { PrimaryButton } from '../../../src/components/home/PrimaryButton';
import {
  hasRepairItems,
  nextRouteForJob,
  nextRepairRouteFromDecision,
  queryKeys,
} from '../../../src/coordinators/serviceRepairCoordinator';
import { routeFromInspectionRepairState } from '../../../src/coordinators/inspectionRepairCoordinator';
import { useEscapeBack } from '../../../src/hooks/useEscapeBack';
import { track } from '../../../src/lib/analytics';
import { apiClient } from '../../../src/lib/api';
import { firstParam } from '../../../src/lib/routeParam';
import { formatInr, newIdempotencyKey, partsAdvancePercent } from '../../../src/lib/formatMoney';
import { useAuth } from '../../../src/providers/AuthProvider';
import { StaleEstimateGuard } from '../../../src/recovery/StaleEstimateGuard';
import { CART_QTY_MAX } from '../../../src/stores/repairCartLogic';
import { useJobCardFlowStore } from '../../../src/stores/jobCardFlowStore';
import { useRepairCartStore } from '../../../src/stores/repairCartStore';
import { colors, type } from '../../../src/theme/tokens';

export default function EstimateScreen() {
  const params = useLocalSearchParams<{ id: string; source?: string }>();
  const id = firstParam(params.id);
  const source = firstParam(params.source) || undefined;
  useEscapeBack();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const flowKind = useJobCardFlowStore((s) => s.flowKind);
  const setFlowKind = useJobCardFlowStore((s) => s.setFlowKind);
  const incrementCart = useRepairCartStore((s) => s.increment);
  const decrementCart = useRepairCartStore((s) => s.decrement);
  const removeFromCart = useRepairCartStore((s) => s.remove);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const returnTo = `/job-card/${id}/estimate`;

  const jobQuery = useQuery({
    queryKey: queryKeys.jobCard(id),
    queryFn: () => apiClient.getJobCard(id),
    enabled: Boolean(id),
    refetchOnMount: 'always',
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
    refetchOnMount: 'always',
  });

  useFocusEffect(
    useCallback(() => {
      if (!id || isIr) return;
      void jobQuery.refetch();
      void estimateQuery.refetch();
    }, [estimateQuery, id, isIr, jobQuery]),
  );

  useEffect(() => {
    const envelope = jobQuery.data;
    if (!envelope || isIr) return;
    const action = envelope.flow_decision.required_next_action;
    if (action === 'ACCEPT_ESTIMATE' || action === 'REQUEST_ESTIMATE') return;
    const href = nextRouteForJob(
      envelope.flow_decision,
      { jobCardId: id },
      envelope.job_card.items,
    );
    if (href && href !== `/job-card/${id}/estimate`) {
      router.replace(href);
    }
  }, [id, isIr, jobQuery.data, router]);

  const irSummary = findingsQuery.data?.estimate_summary;
  const repairs = hasRepairItems(estimateQuery.data?.estimate.line_items);
  const lines = isIr ? (irSummary?.line_items ?? []) : (estimateQuery.data?.estimate.line_items ?? []);
  const totalMinor = isIr
    ? (irSummary?.total.amount_minor ?? 0)
    : (estimateQuery.data?.estimate.total.amount_minor ?? 0);
  const linesTotal = lines.reduce(
    (sum, line) => sum + ('is_included' in line && line.is_included ? 0 : line.amount_minor),
    0,
  );
  const displayTotal = totalMinor > 0 ? totalMinor : linesTotal;
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

  const adjustLine = useMutation({
    mutationFn: async ({
      line,
      delta,
    }: {
      line: { label: string; kind: string; repair_offering_slug?: string | null };
      delta: 1 | -1;
    }) => {
      const items = jobQuery.data?.job_card.items ?? (await apiClient.getJobCard(id)).job_card.items;
      const match = items.find(
        (item) =>
          item.kind === 'REPAIR' &&
          (line.repair_offering_slug
            ? item.repair_offering_slug === line.repair_offering_slug
            : item.label === line.label),
      );
      if (!match) throw new Error('Could not find that repair on the job card.');
      const current = match.quantity ?? 1;
      if (delta > 0) {
        const slug = match.repair_offering_slug ?? line.repair_offering_slug;
        if (!slug) throw new Error('Could not find that repair on the job card.');
        if (current >= CART_QTY_MAX) return apiClient.priceJobCard(id);
        await apiClient.addJobCardItem(id, {
          kind: 'REPAIR',
          repair_offering_slug: slug,
          quantity: 1,
        });
        incrementCart(slug);
        return apiClient.priceJobCard(id);
      }
      if (current <= 1) {
        await apiClient.deleteJobCardItem(id, match.id);
        if (match.repair_offering_slug) removeFromCart(match.repair_offering_slug);
      } else {
        await apiClient.patchJobCardItem(id, match.id, { quantity: current - 1 });
        if (match.repair_offering_slug) decrementCart(match.repair_offering_slug);
      }
      return apiClient.priceJobCard(id);
    },
    onSuccess: (priced) => {
      queryClient.setQueryData(queryKeys.estimate(id), priced);
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobCard(id) });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not update cart.');
    },
  });

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
      const envelope = await apiClient.getJobCard(id);
      const action = envelope.flow_decision.required_next_action;
      if (action === 'CREATE_ADVISOR_CASE') {
        if (!session) {
          router.push({ pathname: '/(auth)/phone', params: { returnTo } });
          throw new Error('AUTH_REDIRECT');
        }
        return apiClient.createAdvisorCase(id, newIdempotencyKey(`advisor-${id}`));
      }
      if (
        action === 'WAIT_FOR_ADVISOR' ||
        action === 'VIEW_ADVISOR_STATUS' ||
        action === 'ACCEPT_REVISED_ESTIMATE' ||
        action === 'REJECT_REVISED_ESTIMATE'
      ) {
        throw new Error(`FLOW_REDIRECT:${action}`);
      }
      if (action !== 'ACCEPT_ESTIMATE') {
        throw new Error(`FLOW_REDIRECT:${action}`);
      }
      const priced = await apiClient.priceJobCard(id);
      queryClient.setQueryData(queryKeys.estimate(id), priced);
      const estimate = priced.estimate;
      if (estimate.status !== 'READY') {
        throw new Error('STALE_ESTIMATE');
      }
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
    onError: async (err) => {
      if (err instanceof Error && err.message === 'AUTH_REDIRECT') return;
      if (err instanceof Error && err.message === 'STALE_ESTIMATE') {
        setStale(true);
        void estimateQuery.refetch();
        return;
      }
      if (err instanceof Error && err.message.startsWith('FLOW_REDIRECT:')) {
        const action = err.message.slice('FLOW_REDIRECT:'.length);
        const href = nextRepairRouteFromDecision(
          {
            policy: jobQuery.data?.flow_decision.policy ?? 'GENERAL_SERVICE',
            advisor_requirement: jobQuery.data?.flow_decision.advisor_requirement ?? 'NOT_REQUIRED',
            estimate_requirement: jobQuery.data?.flow_decision.estimate_requirement ?? 'PRE_BOOKING',
            required_next_action: action,
            allowed_actions: [],
            blocking_reasons: [],
          },
          { jobCardId: id },
        );
        if (href) router.replace(href);
        return;
      }
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
      if (
        err instanceof ApiError &&
        err.problem?.code === 'INVALID_STATE_TRANSITION' &&
        /not ready to accept/i.test(err.message)
      ) {
        const envelope = await apiClient.getJobCard(id).catch(() => null);
        if (envelope) {
          const href = nextRouteForJob(
            envelope.flow_decision,
            { jobCardId: id },
            envelope.job_card.items,
          );
          if (href && href !== `/job-card/${id}/estimate`) {
            router.replace(href);
            return;
          }
        }
        setStale(true);
        void estimateQuery.refetch();
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
  const nextAction = jobQuery.data?.flow_decision.required_next_action;
  const submitLabel = isIr
    ? 'Accept estimate'
    : nextAction === 'CREATE_ADVISOR_CASE'
      ? 'Request advisor callback'
      : repairs
        ? 'Submit estimate & request callback'
        : 'Accept estimate';

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
        {lines.map((line) => {
          const editable = Boolean(repairs && !isIr && line.kind === 'REPAIR' && !line.is_included);
          const offeringSlug =
            'repair_offering_slug' in line && typeof line.repair_offering_slug === 'string'
              ? line.repair_offering_slug
              : undefined;
          const jobItem = jobQuery.data?.job_card.items.find(
            (item) =>
              item.kind === 'REPAIR' &&
              (offeringSlug
                ? item.repair_offering_slug === offeringSlug
                : item.label === line.label),
          );
          const quantity = jobItem?.quantity ?? 1;
          return (
            <View key={`${line.label}-${line.kind}`} style={styles.line}>
              <View style={styles.lineCopy}>
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
              {editable ? (
                <QtyStepper
                  label={line.label}
                  quantity={quantity}
                  minusDisabled={adjustLine.isPending}
                  plusDisabled={quantity >= CART_QTY_MAX || adjustLine.isPending}
                  onMinus={() =>
                    void adjustLine.mutate({
                      line: { label: line.label, kind: line.kind, repair_offering_slug: offeringSlug },
                      delta: -1,
                    })
                  }
                  onPlus={() =>
                    void adjustLine.mutate({
                      line: { label: line.label, kind: line.kind, repair_offering_slug: offeringSlug },
                      delta: 1,
                    })
                  }
                />
              ) : null}
            </View>
          );
        })}
        {isIr && advanceMinor > 0 ? (
          <PartsAdvanceSummary
            partsSubtotalMinor={partsSubtotal}
            advanceMinor={advanceMinor}
            balanceMinor={Math.max(totalMinor - advanceMinor, 0)}
            percent={partsAdvancePercent(partsSubtotal, advanceMinor)}
          />
        ) : null}
        {lines.length > 0 ? (
          <View style={[styles.line, styles.total]}>
            <Text style={styles.totalLabel}>{isIr ? 'Total repair estimate' : 'Estimated total'}</Text>
            <Text
              style={styles.totalValue}
              accessibilityRole="text"
              accessibilityLabel={`Total ${formatInr(displayTotal)}`}
            >
              {formatInr(displayTotal)}
            </Text>
          </View>
        ) : null}
      </ScrollView>
      <PrimaryButton
        label={submitLabel}
        loading={accept.isPending}
        disabled={isIr ? !irSummary : !estimateQuery.data?.estimate && nextAction === 'ACCEPT_ESTIMATE'}
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
      ) : repairs ? (
        <SecondaryButton label="Edit cart" onPress={() => router.push(`/job-card/${id}/repairs-cart`)} />
      ) : (
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
    gap: 8,
  },
  lineCopy: { flex: 1, paddingRight: 8, gap: 2 },
  lineLabel: { ...type.body, color: colors.text, flexShrink: 1 },
  price: { ...type.bodyMedium, color: colors.textStrong },
  included: { ...type.caption, color: colors.success, fontWeight: '700' },
  total: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 14 },
  totalLabel: { ...type.bodyMedium, color: colors.textStrong },
  totalValue: { ...type.price, color: colors.textStrong },
});
