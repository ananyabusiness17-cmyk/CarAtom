import { ApiError } from '@caratom/api-client';
import type { OverrideLiteAction } from '@caratom/contracts';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { InlineBanner } from '../../src/components/InlineBanner';
import { OpenInWebLink } from '../../src/components/OpenInWebLink';
import { OverrideActionPicker } from '../../src/components/OverrideActionPicker';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Screen } from '../../src/components/Screen';
import { jobWebUrl, overrideWebUrl } from '../../src/config/webOpsUrls';
import { useOverrideLite } from '../../src/hooks/useOverrideLite';
import { track } from '../../src/lib/analytics';
import { apiClient } from '../../src/lib/api';
import { overrideReasonError } from '../../src/lib/overrideReason';
import { parseUuidParam } from '../../src/lib/parseUuid';
import { colors, layout, radius, type } from '../../src/theme/tokens';

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(base.getDate() + days);
  return next;
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export default function OverrideScreen() {
  const router = useRouter();
  const { jobCardId: rawId } = useLocalSearchParams<{ jobCardId?: string }>();
  const jobCardId = parseUuidParam(rawId);
  const jobQuery = useQuery({
    queryKey: ['admin', 'job-card', jobCardId],
    queryFn: () => apiClient.getAdminJobLite(jobCardId!),
    enabled: Boolean(jobCardId),
  });
  const allowed = useQuery({
    queryKey: ['admin', 'override-actions', jobCardId],
    queryFn: () => apiClient.getAllowedOverrideActions(jobCardId!),
    enabled: Boolean(jobCardId),
  });
  const apply = useOverrideLite(jobCardId);
  const [action, setAction] = useState<OverrideLiteAction | null>(null);
  const [reason, setReason] = useState('');
  const [targetStatus, setTargetStatus] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [dayOffset, setDayOffset] = useState(0);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [auditRef, setAuditRef] = useState<string | null>(null);

  const from = isoDate(addDays(new Date(), dayOffset));
  const to = isoDate(addDays(new Date(), dayOffset + 1));
  const slots = useQuery({
    queryKey: ['admin', 'slots', jobCardId, from],
    queryFn: () => apiClient.listSlots(jobCardId!, from, to),
    enabled: Boolean(jobCardId) && action === 'MOVE_VISIT_SLOT',
  });

  const job = jobQuery.data;
  const reasonError = overrideReasonError(reason);
  const targets = allowed.data?.allowed_targets ?? job?.allowed_status_targets ?? [];
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(new Date(), i)), []);

  if (!jobCardId) {
    return (
      <Screen>
        <InlineBanner message="This job link is invalid." />
      </Screen>
    );
  }

  const applyError =
    apply.error instanceof ApiError
      ? apply.error.message
      : apply.error instanceof Error
        ? apply.error.message
        : null;

  function submit() {
    if (!action || reasonError) return;
    const payload: Record<string, unknown> = {};
    if (action === 'FORCE_STATUS' && !targetStatus) return;
    if (action === 'MOVE_VISIT_SLOT') {
      if (!slotId) return;
      payload.slot_id = slotId;
    }
    if (action === 'RECORD_OFFLINE_PAYMENT') {
      const rupees = Number(amount.replace(/\D/g, ''));
      if (!Number.isFinite(rupees) || rupees <= 0) return;
      payload.amount_minor = rupees * 100;
      payload.method = method;
      if (reference.trim()) payload.reference = reference.trim();
    }
    if (action === 'DESK_COMPLETE_VISIT') {
      if (!confirmed) return;
      if (job?.visit_id) payload.visit_id = job.visit_id;
    }

    const run = () => {
      apply.mutate(
        {
          action,
          reason: reason.trim(),
          target_status: action === 'FORCE_STATUS' ? targetStatus : undefined,
          payload,
        },
        {
          onSuccess: (result) => {
            const ref = result.audit_ref ?? result.audit_id;
            setAuditRef(ref);
            track('admin_mobile_override_applied', { action, audit_ref: ref });
            setTimeout(() => router.back(), 900);
          },
        },
      );
    };

    if (action === 'FORCE_STATUS' || action === 'DESK_COMPLETE_VISIT') {
      Alert.alert('Apply override?', `This writes an audit log entry. Reason: "${reason.trim()}"`, [
        { text: 'Go back', style: 'cancel' },
        { text: 'Apply', onPress: run },
      ]);
      return;
    }
    run();
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.warn}>
            <Text style={styles.warnText}>Omnipotent · reason required · audit log</Text>
          </View>
          {jobQuery.isError ? (
            <InlineBanner
              message="Could not load this job."
              actionLabel="Retry"
              onAction={() => void jobQuery.refetch()}
            />
          ) : null}
          <OverrideActionPicker value={action} onChange={setAction} />
          {action === 'FORCE_STATUS' ? (
            <View style={styles.card}>
              <Text style={styles.label}>Target status</Text>
              <View style={styles.chips}>
                {targets.map((status) => (
                  <Pressable
                    key={status}
                    onPress={() => setTargetStatus(status)}
                    style={[styles.chip, targetStatus === status ? styles.chipOn : null]}
                  >
                    <Text style={styles.chipText}>{status}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.muted}>Visit {job?.visit_window_label ?? 'from job context'}</Text>
            </View>
          ) : null}
          {action === 'MOVE_VISIT_SLOT' ? (
            <View style={styles.card}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
                {days.map((day, index) => (
                  <Pressable
                    key={isoDate(day)}
                    onPress={() => {
                      setDayOffset(index);
                      setSlotId(null);
                    }}
                    style={[styles.day, dayOffset === index ? styles.chipOn : null]}
                  >
                    <Text style={styles.chipText}>
                      {day.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={styles.slotGrid}>
                {(slots.data?.slots ?? []).map((slot) => (
                  <Pressable
                    key={slot.slot_id}
                    disabled={!slot.available}
                    onPress={() => setSlotId(slot.slot_id)}
                    style={[
                      styles.slot,
                      slotId === slot.slot_id ? styles.chipOn : null,
                      !slot.available ? styles.slotOff : null,
                    ]}
                  >
                    <Text style={styles.chipText}>{slot.label}</Text>
                  </Pressable>
                ))}
              </View>
              {slotId ? (
                <Text style={styles.muted}>
                  {(slots.data?.slots ?? []).find((row) => row.slot_id === slotId)?.label ?? 'Thu 9:00'}
                </Text>
              ) : null}
            </View>
          ) : null}
          {action === 'RECORD_OFFLINE_PAYMENT' ? (
            <View style={styles.card}>
              <Text style={styles.label}>Amount</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="number-pad"
                placeholder="2100"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                accessibilityLabel="Amount in rupees"
              />
              <Text style={styles.label}>Method</Text>
              <View style={styles.chips}>
                {[
                  { id: 'CASH', label: 'Cash' },
                  { id: 'UPI_OFFLINE', label: 'UPI offline' },
                  { id: 'OTHER', label: 'Other' },
                ].map((row) => (
                  <Pressable
                    key={row.id}
                    onPress={() => setMethod(row.id)}
                    style={[styles.chip, method === row.id ? styles.chipOn : null]}
                  >
                    <Text style={styles.chipText}>{row.label}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={reference}
                onChangeText={setReference}
                placeholder="Reference (optional)"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
            </View>
          ) : null}
          {action === 'DESK_COMPLETE_VISIT' ? (
            <View style={styles.card}>
              <Text style={styles.value}>{job?.visit_window_label ?? 'Current visit'}</Text>
              <Pressable
                onPress={() => setConfirmed((value) => !value)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: confirmed }}
                style={styles.checkRow}
              >
                <View style={[styles.box, confirmed ? styles.boxOn : null]} />
                <Text style={styles.value}>Customer confirmed completion</Text>
              </Pressable>
            </View>
          ) : null}
          <Text style={styles.label}>Reason</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            multiline
            placeholder="Agreed condenser on WhatsApp"
            placeholderTextColor={colors.textMuted}
            style={styles.reason}
            accessibilityLabel="Override reason required"
          />
          {reason.length > 0 && reasonError ? <Text style={styles.error}>{reasonError}</Text> : null}
          {applyError ? <InlineBanner message={applyError} /> : null}
          {auditRef ? <Text style={styles.success}>Recorded · {auditRef}</Text> : null}
          <PrimaryButton
            label="Apply override"
            loading={apply.isPending}
            disabled={!action || Boolean(reasonError) || apply.isPending}
            onPress={submit}
          />
          <OpenInWebLink
            url={overrideWebUrl(jobCardId)}
            label="Full override options on web"
            pathKey="override"
          />
          <OpenInWebLink url={jobWebUrl(jobCardId)} label="Cancel job on web" pathKey="job" />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { gap: 12, paddingBottom: 32 },
  warn: {
    backgroundColor: colors.brandSoft,
    borderRadius: radius.card,
    padding: 12,
  },
  warnText: { ...type.bodyMedium, color: colors.brand },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 8,
  },
  label: { ...type.caption, color: colors.textMuted },
  value: { ...type.body, color: colors.textStrong },
  muted: { ...type.caption, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: layout.minTouch,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.brandSoft, borderColor: colors.brand },
  chipText: { ...type.caption, color: colors.textStrong },
  days: { gap: 8 },
  day: {
    minHeight: layout.minTouch,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: {
    width: '48%',
    minHeight: layout.minTouch,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotOff: { opacity: 0.4 },
  input: {
    minHeight: layout.minTouch,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  reason: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    padding: 12,
    color: colors.text,
    backgroundColor: colors.surface,
    textAlignVertical: 'top',
  },
  error: { ...type.caption, color: colors.danger },
  success: { ...type.caption, color: colors.success },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: layout.minTouch },
  box: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.brandStrong,
  },
  boxOn: { backgroundColor: colors.brandStrong },
});
