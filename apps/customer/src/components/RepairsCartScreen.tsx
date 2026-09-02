import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@caratom/api-client';

import { AddonTile } from './AddonTile';
import { FlowRail } from './FlowRail';
import { FlowScreen } from './FlowScreen';
import { HomeSkeleton } from './home/HomeSkeleton';
import { InlineBanner } from './home/InlineBanner';
import { PrimaryButton } from './home/PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { VehicleSummaryCard } from './VehicleSummaryCard';
import { nextRouteForJob, queryKeys } from '../coordinators/serviceRepairCoordinator';
import { useRepairOfferings } from '../hooks/useRepairOfferings';
import { track } from '../lib/analytics';
import { apiClient } from '../lib/api';
import { createFlowJobCard } from '../lib/createFlowJobCard';
import { formatInr } from '../lib/formatMoney';
import { gprVehicleParams, nextVehicleGate } from '../lib/presentVehicle';
import { pickVehicleDraft, vehicleSummaryLine } from '../lib/vehicleDraft';
import { CART_QTY_MAX, totalCartQty } from '../stores/repairCartLogic';
import { useJobCardFlowStore } from '../stores/jobCardFlowStore';
import { useRepairCartStore } from '../stores/repairCartStore';
import { useVehicleDraftStore } from '../stores/vehicleDraftStore';
import { colors, type } from '../theme/tokens';

export function RepairsCartScreen({
  jobCardId,
  mode,
}: {
  jobCardId?: string;
  mode?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const denyMode = mode === 'deny';
  const offerings = useRepairOfferings();
  const quantities = useRepairCartStore((s) => s.quantities);
  const increment = useRepairCartStore((s) => s.increment);
  const decrement = useRepairCartStore((s) => s.decrement);
  const setQuantities = useRepairCartStore((s) => s.setQuantities);
  const setFlowKind = useJobCardFlowStore((s) => s.setFlowKind);
  const setJobCard = useJobCardFlowStore((s) => s.setJobCard);
  const offeringSlug = useJobCardFlowStore((s) => s.offeringSlug);
  const draft = useVehicleDraftStore();
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const jobQuery = useQuery({
    queryKey: queryKeys.jobCard(jobCardId ?? ''),
    queryFn: () => apiClient.getJobCard(jobCardId!),
    enabled: Boolean(jobCardId),
  });

  useEffect(() => {
    track(denyMode ? 'deny_cart_opened' : 'repair_cart_opened');
    setFlowKind('gpr');
  }, [denyMode, setFlowKind]);

  useEffect(() => {
    if (!jobCardId || !jobQuery.data) return;
    const next: Record<string, number> = {};
    for (const item of jobQuery.data.job_card.items) {
      if (item.kind !== 'REPAIR' || !item.repair_offering_slug) continue;
      next[item.repair_offering_slug] = item.quantity ?? 1;
    }
    setQuantities(next);
  }, [jobCardId, jobQuery.data, setQuantities]);

  const items = useMemo(() => offerings.data?.items ?? [], [offerings.data?.items]);
  const selectedItems = items.filter((item) => (quantities[item.slug] ?? 0) > 0);
  const count = totalCartQty(quantities);
  const totalMinor = selectedItems.reduce(
    (sum, item) => sum + item.display_price.amount_minor * (quantities[item.slug] ?? 0),
    0,
  );
  const summary =
    selectedItems
      .map((item) => {
        const qty = quantities[item.slug] ?? 0;
        return qty > 1 ? `${item.name} ×${qty}` : item.name;
      })
      .join(' · ') || 'Nothing selected';

  const rows = useMemo(() => {
    const next: (typeof items)[] = [];
    for (let i = 0; i < items.length; i += 2) next.push(items.slice(i, i + 2));
    return next;
  }, [items]);

  const adjustItem = useMutation({
    mutationFn: async ({ slug, delta }: { slug: string; delta: 1 | -1 }) => {
      if (!jobCardId) {
        if (delta > 0) increment(slug);
        else decrement(slug);
        return;
      }
      const envelope = jobQuery.data ?? (await apiClient.getJobCard(jobCardId));
      const match = envelope.job_card.items.find((item) => item.repair_offering_slug === slug);
      const current = match?.quantity ?? quantities[slug] ?? 0;
      if (delta > 0) {
        await apiClient.addJobCardItem(jobCardId, {
          kind: 'REPAIR',
          repair_offering_slug: slug,
          quantity: 1,
        });
        increment(slug);
        return;
      }
      if (!match || current <= 1) {
        if (match) await apiClient.deleteJobCardItem(jobCardId, match.id);
        decrement(slug);
        return;
      }
      await apiClient.patchJobCardItem(jobCardId, match.id, { quantity: current - 1 });
      decrement(slug);
    },
    onSuccess: async () => {
      if (jobCardId) await queryClient.invalidateQueries({ queryKey: queryKeys.jobCard(jobCardId) });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not update cart.');
    },
  });

  const continueDeny = useMutation({
    mutationFn: async () => {
      if (!jobCardId) return null;
      return apiClient.priceJobCard(jobCardId);
    },
    onSuccess: (result) => {
      if (!jobCardId) return;
      if (!result) {
        router.push(`/job-card/${jobCardId}`);
        return;
      }
      queryClient.setQueryData(queryKeys.estimate(jobCardId), result);
      const href = nextRouteForJob(result.flow_decision, { jobCardId }, jobQuery.data?.job_card.items);
      router.push(href ?? `/job-card/${jobCardId}`);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not price this job card.');
    },
  });

  async function continueFromEntry() {
    if (count < 1) return;
    setFlowKind('gpr');
    const vehicle = pickVehicleDraft(useVehicleDraftStore.getState());
    const gate = nextVehicleGate(vehicle);
    if (gate === 'make') {
      router.push({
        pathname: '/vehicle/make',
        params: gprVehicleParams(),
      });
      return;
    }
    if (gate === 'fuel') {
      router.push({
        pathname: '/vehicle/fuel',
        params: { offering: 'general-service-health-report', flow: 'service-repair' },
      });
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const jobCardId = await createFlowJobCard({
        kind: 'gpr',
        offeringSlug: offeringSlug || 'general-service-health-report',
        vehicle,
        repairQuantities: useRepairCartStore.getState().quantities,
      });
      useRepairCartStore.getState().clear();
      setJobCard(jobCardId, offeringSlug || 'general-service-health-report');
      router.replace(`/job-card/${jobCardId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create job card.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <FlowScreen>
      <FlowRail currentStep={2} variant="gpr" />
      {denyMode ? (
        <View style={styles.banner} accessibilityLiveRegion="polite">
          <Text style={styles.bannerText}>
            Estimate declined on ⑩ — adjust your cart and go back through the steps.
          </Text>
        </View>
      ) : null}
      <Text style={styles.intro}>
        {denyMode
          ? "Remove items you don't want, then continue from vehicle or job card again."
          : "Add repairs to your cart. You'll review the full estimate before requesting a callback."}
      </Text>
      {denyMode ? null : <VehicleSummaryCard summary={vehicleSummaryLine(draft)} />}
      {offerings.isLoading ? <HomeSkeleton /> : null}
      {error ? <InlineBanner message={error} /> : null}
      {offerings.isError ? (
        <InlineBanner
          message="Could not load repairs."
          actionLabel="Retry"
          onAction={() => void offerings.refetch()}
        />
      ) : null}
      {offerings.isSuccess && items.length === 0 ? (
        <InlineBanner message="No repairs available in your area" />
      ) : null}
      <ScrollView contentContainerStyle={styles.grid}>
        {rows.map((row) => (
          <View key={row.map((item) => item.slug).join('-')} style={styles.row}>
            {row.map((item) => {
              const quantity = quantities[item.slug] ?? 0;
              return (
                <AddonTile
                  key={item.slug}
                  name={item.name}
                  priceMinor={item.display_price.amount_minor}
                  quantity={quantity}
                  minusDisabled={adjustItem.isPending}
                  plusDisabled={quantity >= CART_QTY_MAX || adjustItem.isPending}
                  onPlus={() => {
                    track('repair_item_toggled', { slug: item.slug, delta: 1 });
                    void adjustItem.mutate({ slug: item.slug, delta: 1 });
                  }}
                  onMinus={() => {
                    track('repair_item_toggled', { slug: item.slug, delta: -1 });
                    void adjustItem.mutate({ slug: item.slug, delta: -1 });
                  }}
                />
              );
            })}
            {row.length === 1 ? <View style={styles.pad} /> : null}
          </View>
        ))}
      </ScrollView>
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>In cart</Text>
        <Text style={styles.summaryValue}>{summary}</Text>
        {count > 0 ? (
          <Text style={styles.total} accessibilityLabel={`Cart total ${formatInr(totalMinor)}`}>
            Total {formatInr(totalMinor)}
          </Text>
        ) : null}
      </View>
      {denyMode && jobCardId ? (
        <SecondaryButton label="Back to ⑦ Job card" onPress={() => router.push(`/job-card/${jobCardId}`)} />
      ) : null}
      <PrimaryButton
        label={
          denyMode
            ? 'Continue with updated cart'
            : count === 0
              ? 'Select at least one repair'
              : `Continue with ${count} repair${count === 1 ? '' : 's'}`
        }
        disabled={denyMode ? false : count === 0}
        loading={continueDeny.isPending || creating}
        onPress={() => {
          if (denyMode && jobCardId) {
            void continueDeny.mutate();
            return;
          }
          void continueFromEntry();
        }}
      />
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  intro: { ...type.body, color: colors.textMuted, marginBottom: 12 },
  banner: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  bannerText: { ...type.body, color: colors.danger },
  grid: { gap: 10, paddingBottom: 16 },
  row: { flexDirection: 'row', gap: 10 },
  pad: { flex: 1 },
  summary: {
    paddingVertical: 12,
    gap: 4,
  },
  summaryLabel: { ...type.label, color: colors.textMuted },
  summaryValue: { ...type.bodyMedium, color: colors.textStrong },
  total: { ...type.price, color: colors.textStrong, marginTop: 4 },
});
