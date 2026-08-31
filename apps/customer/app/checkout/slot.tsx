import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@caratom/api-client';
import type { Slot } from '@caratom/contracts';

import { FlowRail } from '../../src/components/FlowRail';
import { FlowScreen } from '../../src/components/FlowScreen';
import { InlineBanner } from '../../src/components/home/InlineBanner';
import { PrimaryButton } from '../../src/components/home/PrimaryButton';
import { queryKeys } from '../../src/coordinators/generalServiceCoordinator';
import { firstParam } from '../../src/lib/routeParam';
import { useFlowRail } from '../../src/hooks/useFlowRail';
import { track } from '../../src/lib/analytics';
import { apiClient } from '../../src/lib/api';
import { newIdempotencyKey } from '../../src/lib/formatMoney';
import { dateStripLabel, rollingSlotWindow } from '../../src/lib/formatSlotLabel';
import { useJobCardFlowStore } from '../../src/stores/jobCardFlowStore';
import { useVehicleDraftStore } from '../../src/stores/vehicleDraftStore';
import { DuplicateBookingRecovery, existingBookingIdFromError } from '../../src/recovery/DuplicateBookingRecovery';
import { isHoldExpired } from '../../src/recovery/staleGuards';
import { colors, radius, type } from '../../src/theme/tokens';

export default function SlotScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ jobCardId?: string }>();
  const jobCardId = firstParam(params.jobCardId) || undefined;
  const storedId = useJobCardFlowStore((s) => s.activeJobCardId);
  const flowKind = useJobCardFlowStore((s) => s.flowKind);
  const rail = useFlowRail(9, 11, 5);
  const clearFlow = useJobCardFlowStore((s) => s.clear);
  const clearDraft = useVehicleDraftStore((s) => s.clear);
  const id = jobCardId ?? storedId ?? '';
  const window = useMemo(() => rollingSlotWindow(3), []);
  const [day, setDay] = useState(window.dates[0]);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);

  const slotsQuery = useQuery({
    queryKey: queryKeys.slots(id, window.from, window.to),
    queryFn: () => apiClient.listSlots(id, window.from, window.to),
    enabled: Boolean(id),
  });

  const daySlots = useMemo(
    () => (slotsQuery.data?.slots ?? []).filter((slot) => slot.starts_at.startsWith(day)),
    [slotsQuery.data, day],
  );
  const offline = slotsQuery.isError && !(slotsQuery.error instanceof ApiError);

  useEffect(() => {
    const preferred = daySlots.find((slot) => {
      if (!slot.available) return false;
      if (flowKind === 'oneman') return slot.label.includes('16:00');
      return slot.label.includes('11:00');
    });
    if (preferred) {
      setSelected((current) => current ?? preferred);
    }
  }, [daySlots, flowKind]);

  const confirm = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('Pick a time');
      const hold = await apiClient.createSlotHold(id, selected.slot_id, newIdempotencyKey(`hold-${id}`));
      return apiClient.bookJobCard(id, hold.hold.id, newIdempotencyKey(`book-${id}`));
    },
    onSuccess: (result) => {
      const kind = useJobCardFlowStore.getState().flowKind;
      clearFlow();
      clearDraft();
      router.replace(
        `/booking/${result.booking.id}${
          kind === 'gpr' ? '?flow=service-repair' : kind === 'oneman' ? '?flow=oneman' : ''
        }`,
      );
    },
    onError: (err) => {
      const code = err instanceof ApiError ? err.problem?.code : null;
      if (isHoldExpired(code)) {
        setError('That time was just taken. Pick another slot.');
        void slotsQuery.refetch();
        setSelected(null);
        return;
      }
      const duplicate = err instanceof ApiError ? existingBookingIdFromError(err.problem) : null;
      if (duplicate) {
        setDuplicateId(duplicate);
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Could not confirm this slot. Check your connection.');
    },
  });

  return (
    <FlowScreen>
      <FlowRail currentStep={rail.currentStep} variant={rail.variant} />
      <Text style={styles.sub}>
        {flowKind === 'oneman'
          ? 'Short visit · ~30 min'
          : flowKind === 'gpr'
            ? 'Service + repairs · Wed preferred'
            : 'General service · ~2 hr visit'}
      </Text>
      {error ? <InlineBanner message={error} /> : null}
      {duplicateId ? (
        <DuplicateBookingRecovery
          bookingId={duplicateId}
          onOpen={() => router.replace(`/booking/${duplicateId}`)}
        />
      ) : null}
      {offline ? (
        <InlineBanner
          message="You're offline. Reconnect to confirm this slot."
          actionLabel="Retry"
          onAction={() => void slotsQuery.refetch()}
        />
      ) : null}
      {slotsQuery.isError && !offline ? (
        <InlineBanner
          message="Could not load slots. Check your connection."
          actionLabel="Retry"
          onAction={() => void slotsQuery.refetch()}
        />
      ) : null}
      <ScrollView contentContainerStyle={styles.body}>
      <View style={styles.dates}>
        {window.dates.map((value) => {
          const active = value === day;
          return (
            <Pressable
              key={value}
              onPress={() => {
                setDay(value);
                setSelected(null);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={dateStripLabel(value)}
              style={[styles.date, active ? styles.dateActive : null]}
            >
              <Text style={[styles.dateLabel, active ? styles.dateLabelActive : null]}>
                {dateStripLabel(value)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.grid}>
        {daySlots.map((slot) => {
          const active = selected?.slot_id === slot.slot_id;
          const disabled = !slot.available;
          return (
            <Pressable
              key={slot.slot_id}
              disabled={disabled}
              onPress={() => {
                setSelected(slot);
                track('slot_selected', { slot: slot.label });
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled }}
              accessibilityLabel={`${dateStripLabel(day)} ${slot.label}${disabled ? ', unavailable' : ''}`}
              style={[
                styles.cell,
                active ? styles.cellActive : null,
                disabled ? styles.cellDisabled : null,
              ]}
            >
              <Text style={[styles.cellLabel, active ? styles.cellLabelActive : null]}>{slot.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {slotsQuery.isSuccess && daySlots.length === 0 ? (
        <Text style={styles.sub}>No slots on this day. Try another date.</Text>
      ) : null}
      </ScrollView>
      <PrimaryButton
        label={
          flowKind === 'gpr'
            ? 'Confirm slot & book'
            : selected
              ? `Confirm ${selected.label.split('–')[0]?.trim() ?? selected.label}`
              : 'Confirm slot'
        }
        accessibilityLabel={
          selected ? `Confirm booking for ${dateStripLabel(day)} ${selected.label}` : 'Confirm booking'
        }
        disabled={!selected || offline}
        loading={confirm.isPending}
        onPress={() => void confirm.mutate()}
      />
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  body: { gap: 14, paddingBottom: 16 },
  sub: { ...type.caption, color: colors.textMuted },
  dates: { flexDirection: 'row', gap: 8 },
  date: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateActive: { borderColor: colors.selectionBorder, backgroundColor: colors.selectionBg },
  dateLabel: { ...type.caption, color: colors.textMuted, fontWeight: '700' },
  dateLabelActive: { color: colors.brandStrong },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: {
    width: '48%',
    minHeight: 56,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellActive: { borderWidth: 1.5, borderColor: colors.selectionBorder, backgroundColor: colors.selectionBg },
  cellDisabled: { opacity: 0.4 },
  cellLabel: { ...type.bodyMedium, color: colors.text },
  cellLabelActive: { color: colors.brandStrong },
});
