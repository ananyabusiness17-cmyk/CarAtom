import { useNavigation, useRouter } from 'expo-router';
import { useLayoutEffect } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { FlowRail } from '../../../src/components/FlowRail';
import { InlineBanner } from '../../../src/components/InlineBanner';
import { OfflineBanner } from '../../../src/components/OfflineBanner';
import { Screen } from '../../../src/components/Screen';
import { VisitCard } from '../../../src/components/VisitCard';
import { useTodayVisits, useTechnicianMe } from '../../../src/hooks/useVisitQueries';
import { formatJobsHeader, todayIstDate } from '../../../src/lib/istDate';
import { useOfflineQueueStore } from '../../../src/stores/offlineQueueStore';
import { colors, radius, type } from '../../../src/theme/tokens';

export default function TodayScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const date = todayIstDate();
  const query = useTodayVisits(date);
  const me = useTechnicianMe();
  const pendingIds = useOfflineQueueStore((s) =>
    new Set(s.entries.filter((row) => row.status === 'pending').map((row) => row.visitId)),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Text style={[styles.duty, me.data?.on_duty === false ? styles.offDuty : null]}>
          {me.data?.on_duty === false ? 'Off duty' : 'On duty'}
        </Text>
      ),
    });
  }, [navigation, me.data?.on_duty]);

  const visits = query.data?.visits ?? [];
  const header = formatJobsHeader(query.data?.date ?? date, query.data?.summary.total ?? visits.length);

  return (
    <View style={styles.flex}>
      <OfflineBanner />
      <Screen
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
        }
      >
        <FlowRail currentStep={1} />
        <Text style={styles.date}>{header}</Text>
        {query.isLoading ? (
          <>
            <View style={styles.skeleton} />
            <View style={styles.skeleton} />
            <View style={styles.skeleton} />
          </>
        ) : null}
        {query.isError ? (
          <InlineBanner
            message="Could not load today’s jobs."
            actionLabel="Retry"
            onAction={() => void query.refetch()}
          />
        ) : null}
        {query.isSuccess && visits.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No jobs assigned today</Text>
            <Pressable accessibilityRole="button" onPress={() => void query.refetch()} style={styles.link}>
              <Text style={styles.linkText}>Refresh</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(tech)/(tabs)/me')}
              style={styles.link}
            >
              <Text style={styles.linkText}>Contact support</Text>
            </Pressable>
          </View>
        ) : null}
        {visits.map((visit, index) => (
          <VisitCard
            key={visit.id}
            visit={visit}
            emphasized={index === 0}
            pendingSync={pendingIds.has(visit.id)}
            onPress={() => router.push(`/visits/${visit.id}`)}
          />
        ))}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.canvas },
  date: { ...type.caption, color: colors.textMuted },
  duty: { ...type.caption, color: colors.success, paddingRight: 12 },
  offDuty: { color: colors.warning },
  skeleton: {
    height: 88,
    borderRadius: radius.card,
    backgroundColor: colors.surfaceSubtle,
  },
  empty: { gap: 8, paddingVertical: 24 },
  emptyTitle: { ...type.bodyMedium, color: colors.textStrong },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { ...type.bodyMedium, color: colors.brandStrong },
});
