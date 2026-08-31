import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useLayoutEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { InlineBanner } from '../../../../src/components/InlineBanner';
import { PrimaryButton } from '../../../../src/components/PrimaryButton';
import { Screen } from '../../../../src/components/Screen';
import { apiClient } from '../../../../src/lib/api';
import { formatInr } from '../../../../src/lib/formatMoney';
import { linesFromAdminJob, useEstimateDraftStore } from '../../../../src/stores/estimateDraftStore';
import { colors, radius, type } from '../../../../src/theme/tokens';

export default function CaseDetailScreen() {
  const { jobCardId } = useLocalSearchParams<{ jobCardId: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const setDraft = useEstimateDraftStore((s) => s.setDraft);
  const query = useQuery({
    queryKey: ['admin-job-card', jobCardId],
    queryFn: () => apiClient.getAdminJobCard(jobCardId),
    enabled: Boolean(jobCardId),
  });

  const job = query.data;
  const name = job?.customer_name?.trim() || 'Customer';

  useLayoutEffect(() => {
    navigation.setOptions({
      title: `${job?.job_card.public_ref ?? 'Job'} · on call`,
    });
  }, [job?.job_card.public_ref, navigation]);

  const lines = job?.submitted_estimate
    ? job.submitted_estimate.line_items.map((line) => ({ label: line.label, amount: line.amount_minor }))
    : (job?.job_card.items ?? []).map((item) => ({ label: item.label, amount: item.unit_price_minor }));

  return (
    <Screen>
      {query.isLoading ? <ActivityIndicator color={colors.brandStrong} /> : null}
      {query.isError ? (
        <InlineBanner
          message="Could not open this job."
          actionLabel="Retry"
          onAction={() => void query.refetch()}
        />
      ) : null}
      <View style={styles.chip}>
        <Text style={styles.chipText}>Sales advisor on call with {name}</Text>
      </View>
      <Text style={styles.note}>
        Only advisor edits estimate lines — field technician sees read-only job card later.
      </Text>
      <View style={styles.card}>
        <Text style={styles.label}>Concerns</Text>
        <Text style={styles.value}>{job?.job_card.concerns[0]?.text ?? '—'}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.lines}>
        {lines.map((line) => (
            <View key={`${line.label}-${line.amount}`} style={styles.row}>
              <Text style={styles.rowLabel} numberOfLines={2}>
                {line.label}
              </Text>
              <Text style={styles.rowValue}>{formatInr(line.amount)}</Text>
            </View>
          ))}
      </ScrollView>
      <Text style={styles.note}>Add or remove lines during the call — estimate may stay the same.</Text>
      <PrimaryButton
        label="Edit estimate on call"
        disabled={!job}
        onPress={() => {
          if (!job) return;
          setDraft({
            jobCardId,
            advisorCaseId: job.advisor_case_id ?? null,
            customerName: name,
            lines: linesFromAdminJob(job),
          });
          router.push(`/(ops)/case/${jobCardId}/estimate`);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.warningSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { ...type.caption, color: colors.warning, fontWeight: '700' },
  note: { ...type.body, color: colors.textMuted },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 12,
    gap: 6,
  },
  label: { ...type.label, color: colors.textMuted },
  value: { ...type.body, color: colors.textStrong },
  lines: { gap: 8, paddingBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 6 },
  rowLabel: { ...type.body, color: colors.text, flex: 1 },
  rowValue: { ...type.bodyMedium, color: colors.textStrong },
});
