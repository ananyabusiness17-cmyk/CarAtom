import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiError } from '@caratom/api-client';

import { FlowRail } from '../../../src/components/FlowRail';
import { FlowScreen } from '../../../src/components/FlowScreen';
import { VehicleSummaryCard } from '../../../src/components/VehicleSummaryCard';
import { HomeSkeleton } from '../../../src/components/home/HomeSkeleton';
import { InlineBanner } from '../../../src/components/home/InlineBanner';
import { PrimaryButton } from '../../../src/components/home/PrimaryButton';
import {
  hasRepairItems,
  nextRouteForJob,
  queryKeys,
} from '../../../src/coordinators/serviceRepairCoordinator';
import { useEscapeBack } from '../../../src/hooks/useEscapeBack';
import { track } from '../../../src/lib/analytics';
import { apiClient } from '../../../src/lib/api';
import { formatInr } from '../../../src/lib/formatMoney';
import { firstParam } from '../../../src/lib/routeParam';
import { vehicleSummaryLine } from '../../../src/lib/vehicleDraft';
import { useJobCardFlowStore } from '../../../src/stores/jobCardFlowStore';
import { useVehicleDraftStore } from '../../../src/stores/vehicleDraftStore';
import { colors, radius, type } from '../../../src/theme/tokens';

export default function JobCardScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = firstParam(params.id);
  useEscapeBack();
  const router = useRouter();
  const queryClient = useQueryClient();
  const draft = useVehicleDraftStore();
  const setJobCard = useJobCardFlowStore((s) => s.setJobCard);
  const setFlowKind = useJobCardFlowStore((s) => s.setFlowKind);
  const [concerns, setConcerns] = useState('');
  const [error, setError] = useState<string | null>(null);

  const jobCardQuery = useQuery({
    queryKey: queryKeys.jobCard(id),
    queryFn: () => apiClient.getJobCard(id),
    enabled: Boolean(id),
  });

  const repairs = hasRepairItems(jobCardQuery.data?.job_card.items);

  useEffect(() => {
    track('job_card_started', { id });
    if (id) setJobCard(id);
  }, [id, setJobCard]);

  useEffect(() => {
    if (repairs) setFlowKind('gpr');
  }, [repairs, setFlowKind]);

  useEffect(() => {
    const text = jobCardQuery.data?.job_card.concerns[0]?.text;
    if (text) setConcerns(text);
  }, [jobCardQuery.data]);

  useEffect(() => {
    const envelope = jobCardQuery.data;
    if (!envelope || envelope.flow_decision.required_next_action !== 'VIEW_BOOKING') return;
    const href = nextRouteForJob(envelope.flow_decision, {
      jobCardId: id,
      bookingId: envelope.job_card.booking_id ?? undefined,
    }, envelope.job_card.items);
    if (href) router.replace(href);
  }, [id, jobCardQuery.data, router]);

  const patch = useMutation({
    mutationFn: (text: string) => apiClient.patchJobCard(id, { concerns: [{ text }] }),
  });

  useEffect(() => {
    const serverText = jobCardQuery.data?.job_card.concerns[0]?.text?.trim() ?? '';
    if (!id || !concerns.trim() || concerns.trim() === serverText) return;
    const handle = setTimeout(() => {
      void patch.mutate(concerns.trim());
    }, 400);
    return () => clearTimeout(handle);
  }, [concerns, id, jobCardQuery.data, patch]);

  const price = useMutation({
    mutationFn: () => apiClient.priceJobCard(id),
    onSuccess: async (result) => {
      queryClient.setQueryData(queryKeys.estimate(id), result);
      await queryClient.invalidateQueries({ queryKey: queryKeys.jobCard(id) });
      try {
        const href = nextRouteForJob(
          result.flow_decision,
          { jobCardId: id },
          jobCardQuery.data?.job_card.items,
        );
        if (href) router.push(href);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not continue from this estimate.');
      }
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not price this job card.');
    },
  });

  const items = jobCardQuery.data?.job_card.items ?? [];
  const cartTotalMinor = items.reduce(
    (sum, item) => sum + item.unit_price_minor * (item.quantity ?? 1),
    0,
  );
  const ctx = jobCardQuery.data?.job_card.vehicle_context;
  const summary = ctx
    ? `${ctx.make} ${ctx.model} ${ctx.year} · ${ctx.fuel_type === 'PETROL' ? 'Petrol' : ctx.fuel_type}`
    : vehicleSummaryLine(draft);

  return (
    <FlowScreen>
      <FlowRail currentStep={repairs ? 7 : 6} variant={repairs ? 'gpr' : 'gs'} />
      {jobCardQuery.isLoading ? <HomeSkeleton /> : null}
      {error ? <InlineBanner message={error} /> : null}
      {jobCardQuery.isError ? (
        <InlineBanner
          message="Could not load job card."
          actionLabel="Retry"
          onAction={() => void jobCardQuery.refetch()}
        />
      ) : null}
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <VehicleSummaryCard summary={summary} />
        <View style={styles.card}>
          <Text style={styles.label}>{repairs ? 'Concerns' : "What's wrong with the car?"}</Text>
          <TextInput
            value={concerns}
            onChangeText={setConcerns}
            multiline
            style={styles.input}
            accessibilityLabel={repairs ? 'Concerns' : "What's wrong with the car?"}
          />
        </View>
        {items.map((item) => {
          const qty = item.quantity ?? 1;
          const lineMinor = item.unit_price_minor * qty;
          return (
            <View key={item.id} style={styles.line}>
              <Text style={styles.lineLabel} numberOfLines={2}>
                {qty > 1 ? `${item.label} ×${qty}` : item.label}
              </Text>
              <Text
                style={styles.price}
                accessibilityRole="text"
                accessibilityLabel={`Amount ${formatInr(lineMinor)}`}
              >
                {formatInr(lineMinor)}
              </Text>
            </View>
          );
        })}
        {items.length > 0 ? (
          <View style={[styles.line, styles.total]}>
            <Text style={styles.totalLabel}>Estimated total</Text>
            <Text
              style={styles.totalValue}
              accessibilityRole="text"
              accessibilityLabel={`Total ${formatInr(cartTotalMinor)}`}
            >
              {formatInr(cartTotalMinor)}
            </Text>
          </View>
        ) : null}
        {repairs ? null : <Text style={styles.note}>No repair add-ons on this flow.</Text>}
      </ScrollView>
      <PrimaryButton
        label="Review estimate"
        loading={price.isPending}
        onPress={() => {
          track('job_card_proceeded', { id });
          void price.mutate();
        }}
      />
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  body: { gap: 14, paddingBottom: 16 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 12,
    gap: 8,
  },
  label: { ...type.label, color: colors.textMuted },
  input: {
    minHeight: 96,
    ...type.body,
    color: colors.text,
    textAlignVertical: 'top',
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lineLabel: { ...type.body, color: colors.textStrong, flex: 1, paddingRight: 12 },
  price: { ...type.bodyMedium, color: colors.textStrong, fontWeight: '700' },
  total: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4, paddingTop: 14 },
  totalLabel: { ...type.bodyMedium, color: colors.textStrong },
  totalValue: { ...type.price, color: colors.textStrong },
  note: { ...type.caption, color: colors.textMuted },
});
