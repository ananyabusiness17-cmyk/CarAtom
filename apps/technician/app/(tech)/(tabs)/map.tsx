import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { InlineBanner } from '../../../src/components/InlineBanner';
import { MapPreview } from '../../../src/components/MapPreview';
import { OfflineBanner } from '../../../src/components/OfflineBanner';
import { Screen } from '../../../src/components/Screen';
import { VisitCard } from '../../../src/components/VisitCard';
import { useTodayVisits } from '../../../src/hooks/useVisitQueries';
import { colors, type } from '../../../src/theme/tokens';

export default function MapTabScreen() {
  const router = useRouter();
  const query = useTodayVisits();
  const visits = query.data?.visits ?? [];

  return (
    <View style={styles.flex}>
      <OfflineBanner />
      <Screen>
        <MapPreview
          latitude={12.9352}
          longitude={77.6245}
          label="OpenStreetMap"
          height={220}
        />
        <Text style={styles.caption}>Today’s visits · tap a pin card to open the job</Text>
        {query.isError ? (
          <InlineBanner
            message="Could not load visits for the map."
            actionLabel="Retry"
            onAction={() => void query.refetch()}
          />
        ) : null}
        {visits.map((visit) => (
          <VisitCard key={visit.id} visit={visit} onPress={() => router.push(`/visits/${visit.id}`)} />
        ))}
        {query.isSuccess && visits.length === 0 ? (
          <Text style={styles.empty}>No jobs assigned today</Text>
        ) : null}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.canvas },
  caption: { ...type.caption, color: colors.textMuted },
  empty: { ...type.body, color: colors.textMuted },
});
