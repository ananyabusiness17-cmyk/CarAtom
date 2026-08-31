import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRouter } from 'expo-router';
import { useLayoutEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { InboxRow } from '@caratom/contracts';

import { InlineBanner } from '../../../src/components/InlineBanner';
import { PrimaryButton } from '../../../src/components/PrimaryButton';
import { Screen } from '../../../src/components/Screen';
import { apiClient } from '../../../src/lib/api';
import { formatInr } from '../../../src/lib/formatMoney';
import { useAuth } from '../../../src/providers/AuthProvider';
import { colors, radius, type } from '../../../src/theme/tokens';

export default function InboxScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { profile } = useAuth();
  const query = useQuery({
    queryKey: ['admin-advisor-inbox'],
    queryFn: () => apiClient.getAdminAdvisorCases(),
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <Text style={styles.headerName}>{profile?.full_name ?? 'Advisor'}</Text>,
    });
  }, [navigation, profile?.full_name]);

  const items = [...(query.data?.items ?? [])].sort((a, b) => {
    const left = a.callback_requested_at ?? '';
    const right = b.callback_requested_at ?? '';
    return left.localeCompare(right);
  });

  return (
    <Screen>
      <View style={styles.queue}>
        <Text style={styles.queueTitle}>Callback queue</Text>
        <View style={styles.waitChip}>
          <Text style={styles.waitText}>{items.length} waiting</Text>
        </View>
      </View>
      {query.isLoading ? <ActivityIndicator color={colors.brandStrong} /> : null}
      {query.isError ? (
        <InlineBanner
          message="Could not load the callback queue."
          actionLabel="Retry"
          onAction={() => void query.refetch()}
        />
      ) : null}
      {query.isSuccess && items.length === 0 ? (
        <Text style={styles.empty}>
          No callbacks waiting. Customer journeys still complete with the dev simulate endpoint.
        </Text>
      ) : null}
      <ScrollView contentContainerStyle={styles.list}>
        {items.map((row, index) => (
          <InboxCard
            key={row.job_card_id}
            row={row}
            priority={index === 0}
            onOpen={() => router.push(`/(ops)/case/${row.job_card_id}`)}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}

function InboxCard({
  row,
  priority,
  onOpen,
}: {
  row: InboxRow;
  priority: boolean;
  onOpen: () => void;
}) {
  return (
    <View style={[styles.card, priority ? styles.priority : null]}>
      <View style={styles.cardTop}>
        <Text style={styles.ref}>{row.public_ref}</Text>
        <View style={styles.callChip}>
          <Text style={styles.callText}>Call now</Text>
        </View>
      </View>
      <Text style={styles.line}>
        {row.customer_name ?? 'Customer'} · submitted estimate · callback requested
      </Text>
      <Text style={styles.muted}>
        {row.submitted_total_minor != null ? `${formatInr(row.submitted_total_minor)} indicative` : 'Estimate pending'}
        {row.masked_phone ? ` · ${row.masked_phone}` : ''}
        {row.vehicle_summary ? ` · ${row.vehicle_summary}` : ''}
      </Text>
      <PrimaryButton label="Open & call customer" onPress={onOpen} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerName: { ...type.bodyMedium, color: colors.brandStrong, paddingRight: 12 },
  queue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  queueTitle: { ...type.sectionTitle, color: colors.textStrong },
  waitChip: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  waitText: { ...type.caption, color: colors.warning, fontWeight: '700' },
  list: { gap: 12, paddingBottom: 24 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  priority: { borderLeftWidth: 3, borderLeftColor: colors.warning },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ref: { ...type.bodyMedium, color: colors.textStrong },
  callChip: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  callText: { ...type.caption, color: colors.warning, fontWeight: '700' },
  line: { ...type.body, color: colors.text },
  muted: { ...type.caption, color: colors.textMuted },
  empty: { ...type.body, color: colors.textMuted },
});
