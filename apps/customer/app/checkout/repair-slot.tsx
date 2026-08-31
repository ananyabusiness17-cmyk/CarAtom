import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@caratom/api-client';
import type { Slot } from '@caratom/contracts';

import { FlowScreen } from '../../src/components/FlowScreen';
import { InspectionFlowRail } from '../../src/components/InspectionFlowRail';
import { InlineBanner } from '../../src/components/home/InlineBanner';
import { PolicyNote } from '../../src/components/home/PolicyNote';
import { PrimaryButton } from '../../src/components/home/PrimaryButton';
import { queryKeys } from '../../src/coordinators/generalServiceCoordinator';
import { track } from '../../src/lib/analytics';
import { apiClient } from '../../src/lib/api';
import { newIdempotencyKey } from '../../src/lib/formatMoney';
import { dateStripLabel, rollingSlotWindow } from '../../src/lib/formatSlotLabel';
import { useJobCardFlowStore } from '../../src/stores/jobCardFlowStore';
import { colors, radius, type } from '../../src/theme/tokens';

export default function RepairSlotScreen() {
  const router = useRouter();
  const { jobCardId } = useLocalSearchParams<{ jobCardId?: string }>();
  const storedId = useJobCardFlowStore((s) => s.activeJobCardId);
  const id = jobCardId ?? storedId ?? '';
  const window = useMemo(() => rollingSlotWindow(3), []);
  const [day, setDay] = useState(window.dates[0]);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const jobQuery = useQuery({
    queryKey: queryKeys.jobCard(id),
    queryFn: () => apiClient.getJobCard(id),
    enabled: Boolean(id),
  });

  const slotsQuery = useQuery({
    queryKey: [...queryKeys.slots(id, window.from, window.to), 'REPAIR'],
    queryFn: () => apiClient.listSlots(id, window.from, window.to, 'REPAIR'),
    enabled: Boolean(id),
  });

  const daySlots = useMemo(
    () => (slotsQuery.data?.slots ?? []).filter((slot) => slot.starts_at.startsWith(day)),
    [slotsQuery.data, day],
  );

  useEffect(() => {
    const preferred = daySlots.find((slot) => slot.available && slot.label.includes('9:00'));
    if (preferred) setSelected((current) => current ?? preferred);
  }, [daySlots]);

  const confirm = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('Pick a time');
      const hold = await apiClient.createSlotHold(id, selected.slot_id, newIdempotencyKey(`hold-repair-${id}`));
      return apiClient.bookRepair(id, hold.hold.id, newIdempotencyKey(`book-repair-${id}`));
    },
    onSuccess: (result) => {
      track('repair_booked', { id });
      router.replace(`/booking/${result.booking.id}?phase=visit2`);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not confirm this repair slot.');
    },
  });

  return (
    <FlowScreen>
      <InspectionFlowRail currentStep={14} />
      <Text style={styles.title}>Pick repair slot</Text>
      <Text style={styles.sub}>Visit 2 · Repair · ~3 hr</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Visit 1 inspection completed</Text>
      </View>
      <PolicyNote>Repair visit executes the approved estimate scope.</PolicyNote>
      {error ? <InlineBanner message={error} /> : null}
      {jobQuery.data?.job_card.parts_status && !jobQuery.data.job_card.parts_status.all_ready ? (
        <InlineBanner message="Parts are not ready yet." />
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
                onPress={() => setSelected(slot)}
                accessibilityRole="button"
                accessibilityState={{ selected: active, disabled }}
                accessibilityLabel={`${dateStripLabel(day)} ${slot.label}${disabled ? ', unavailable' : ''}`}
                style={[styles.cell, active ? styles.cellActive : null, disabled ? styles.cellDisabled : null]}
              >
                <Text style={[styles.cellLabel, active ? styles.cellLabelActive : null]}>{slot.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {slotsQuery.isError ? (
          <InlineBanner
            message="Could not load slots."
            actionLabel="Retry"
            onAction={() => void slotsQuery.refetch()}
          />
        ) : null}
        {slotsQuery.isSuccess && daySlots.length === 0 ? (
          <Text style={styles.sub}>No slots on this day. Try another date.</Text>
        ) : null}
      </ScrollView>
      <PrimaryButton
        label={selected ? `Confirm repair · ${selected.label}` : 'Confirm repair'}
        disabled={!selected}
        loading={confirm.isPending}
        onPress={() => void confirm.mutate()}
      />
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.navTitle, color: colors.textStrong },
  body: { gap: 14, paddingBottom: 16 },
  sub: { ...type.caption, color: colors.textMuted },
  badge: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.card,
    padding: 10,
  },
  badgeText: { ...type.caption, color: colors.success, fontWeight: '700' },
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
