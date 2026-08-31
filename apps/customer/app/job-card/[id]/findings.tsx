import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { FindingCard } from '../../../src/components/FindingCard';
import { FlowScreen } from '../../../src/components/FlowScreen';
import { InspectionFlowRail } from '../../../src/components/InspectionFlowRail';
import { HomeSkeleton } from '../../../src/components/home/HomeSkeleton';
import { InlineBanner } from '../../../src/components/home/InlineBanner';
import { PrimaryButton } from '../../../src/components/home/PrimaryButton';
import { track } from '../../../src/lib/analytics';
import { apiClient } from '../../../src/lib/api';
import { formatInr } from '../../../src/lib/formatMoney';
import { colors, radius, type } from '../../../src/theme/tokens';

export default function FindingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const query = useQuery({
    queryKey: ['inspection-findings', id],
    queryFn: () => apiClient.getInspectionFindings(id),
    enabled: Boolean(id),
  });

  useEffect(() => {
    track('findings_viewed', { id });
  }, [id]);

  const dumped = JSON.stringify(query.data ?? {});
  const unsafe = dumped.includes('unit_cost');
  const estimate = query.data?.estimate_summary;

  return (
    <FlowScreen>
      <InspectionFlowRail currentStep={11} />
      {query.isLoading ? <HomeSkeleton /> : null}
      {query.isError ? (
        <InlineBanner
          message="Could not load findings."
          actionLabel="Retry"
          onAction={() => void query.refetch()}
        />
      ) : null}
      {unsafe ? <InlineBanner message="Findings payload failed a safety check." /> : null}
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>Inspection findings</Text>
        <Text style={styles.sub}>Review what our technician found on visit 1.</Text>
        {query.data?.inspection?.summary ? (
          <View style={styles.summary}>
            <Text style={styles.summaryText}>{query.data.inspection.summary}</Text>
          </View>
        ) : null}
        {(query.data?.findings ?? []).map((finding) => (
          <FindingCard
            key={finding.id}
            title={finding.title}
            severity={finding.severity}
            body={finding.customer_explanation}
            recommendation={finding.recommendation}
          />
        ))}
        {query.isSuccess && !(query.data?.findings ?? []).length ? (
          <Text style={styles.footer}>No findings to review yet.</Text>
        ) : null}
        {estimate ? (
          <View style={styles.teaser}>
            <Text style={styles.teaserLabel}>Estimated repair total</Text>
            <Text style={styles.teaserValue}>{formatInr(estimate.total.amount_minor)}</Text>
            <Text style={styles.teaserSub}>
              Parts advance · {formatInr(estimate.parts_advance.amount_minor)} due after you accept
            </Text>
          </View>
        ) : null}
        <Text style={styles.footer}>{"You can reject the estimate if you don't want to proceed."}</Text>
      </ScrollView>
      <PrimaryButton
        label="View full estimate"
        onPress={() => router.push(`/job-card/${id}/estimate?source=inspection`)}
      />
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingBottom: 16 },
  title: { ...type.navTitle, color: colors.textStrong },
  sub: { ...type.body, color: colors.textMuted },
  summary: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.card,
    padding: 12,
  },
  summaryText: { ...type.body, color: colors.text },
  teaser: {
    backgroundColor: colors.brandSoft,
    borderRadius: radius.card,
    padding: 12,
    gap: 4,
  },
  teaserLabel: { ...type.caption, color: colors.textMuted },
  teaserValue: { ...type.price, color: colors.textStrong },
  teaserSub: { ...type.caption, color: colors.brandStrong },
  footer: { ...type.caption, color: colors.textMuted },
});
