import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useLayoutEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { InlineBanner } from '../../../src/components/InlineBanner';
import { OpenInWebLink } from '../../../src/components/OpenInWebLink';
import { PrimaryButton } from '../../../src/components/PrimaryButton';
import { Screen } from '../../../src/components/Screen';
import { SecondaryButton } from '../../../src/components/SecondaryButton';
import { StatusChip } from '../../../src/components/StatusChip';
import { jobWebUrl } from '../../../src/config/webOpsUrls';
import { track } from '../../../src/lib/analytics';
import { apiClient } from '../../../src/lib/api';
import { formatInr } from '../../../src/lib/formatMoney';
import { parseUuidParam } from '../../../src/lib/parseUuid';
import { colors, radius, type } from '../../../src/theme/tokens';

export default function MobJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const jobCardId = parseUuidParam(id);
  const router = useRouter();
  const navigation = useNavigation();
  const query = useQuery({
    queryKey: ['admin', 'job-card', jobCardId],
    queryFn: () => apiClient.getAdminJobLite(jobCardId!),
    enabled: Boolean(jobCardId),
  });
  const job = query.data;

  useLayoutEffect(() => {
    navigation.setOptions({ title: job?.ref ?? 'Job' });
  }, [job?.ref, navigation]);

  useEffect(() => {
    if (job) {
      track('admin_mobile_job_opened', { job_card_ref: job.ref, needs_dispatch: job.needs_dispatch });
    }
  }, [job]);

  if (!jobCardId) {
    return (
      <Screen>
        <InlineBanner message="This job link is invalid." />
      </Screen>
    );
  }

  const assignLabel = job?.assigned_technician ? 'Reassign technician' : 'Assign to technician';

  return (
    <Screen>
      {query.isLoading ? <ActivityIndicator color={colors.brandStrong} /> : null}
      {query.isError ? (
        <InlineBanner
          message="Could not load this job."
          actionLabel="Retry"
          onAction={() => void query.refetch()}
        />
      ) : null}
      {job ? (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.chips}>
            <StatusChip label={job.status_label} />
            <StatusChip label="Read-only · field view" variant="neutral" />
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Concerns</Text>
            <Text style={styles.value}>{job.concerns[0] ?? '—'}</Text>
          </View>
          <View style={styles.card}>
            {job.lines.map((line) => (
              <View key={`${line.name}-${line.amount_minor}`} style={styles.line}>
                <Text style={styles.lineName} numberOfLines={2}>
                  {line.name}
                </Text>
                <Text style={styles.lineAmt}>{formatInr(line.amount_minor)}</Text>
              </View>
            ))}
            {job.lines_omitted_count > 0 ? (
              <Text style={styles.muted}>{job.lines_omitted_count} more on web</Text>
            ) : null}
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Visit</Text>
            <Text style={styles.value}>{job.visit_window_label ?? 'Window not set'}</Text>
            <Text style={styles.muted}>
              {job.assigned_technician
                ? `${job.assigned_technician.name}${job.van_label ? ` · ${job.van_label}` : ''}`
                : 'Needs dispatch'}
            </Text>
          </View>
          <PrimaryButton
            label={assignLabel}
            onPress={() =>
              router.push({ pathname: '/(ops)/dispatch', params: { jobCardId: job.id } })
            }
          />
          <SecondaryButton
            label="Override"
            onPress={() => router.push({ pathname: '/(ops)/override', params: { jobCardId: job.id } })}
          />
          <OpenInWebLink url={jobWebUrl(job.id)} label="Open full editor on web" pathKey="job" />
        </ScrollView>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingBottom: 24 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
  },
  label: { ...type.caption, color: colors.textMuted, textTransform: 'uppercase' },
  value: { ...type.body, color: colors.textStrong },
  muted: { ...type.caption, color: colors.textMuted },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  lineName: { ...type.body, color: colors.text, flex: 1 },
  lineAmt: { ...type.bodyMedium, color: colors.textStrong },
});
