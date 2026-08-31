import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { InlineBanner } from '../../../src/components/InlineBanner';
import { OpenInWebLink } from '../../../src/components/OpenInWebLink';
import { Screen } from '../../../src/components/Screen';
import { StatusChip } from '../../../src/components/StatusChip';
import { webOpsUrl } from '../../../src/config/webOpsUrls';
import { useAdminDispatch } from '../../../src/hooks/useAdminDispatch';
import { colors, layout, radius, type } from '../../../src/theme/tokens';

export default function PeopleScreen() {
  const router = useRouter();
  const query = useAdminDispatch();
  const [q, setQ] = useState('');
  const techs = useMemo(() => {
    const rows = query.data?.technicians ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => row.name.toLowerCase().includes(needle));
  }, [q, query.data]);

  return (
    <Screen>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Search name"
        placeholderTextColor={colors.textMuted}
        style={styles.search}
        accessibilityLabel="Search name"
      />
      <Text style={styles.section}>Technicians on duty</Text>
      {query.isLoading ? <ActivityIndicator color={colors.brandStrong} /> : null}
      {query.isError ? (
        <InlineBanner
          message="Could not load technicians."
          actionLabel="Retry"
          onAction={() => void query.refetch()}
        />
      ) : null}
      <ScrollView contentContainerStyle={styles.list}>
        {techs.map((tech) => (
          <Pressable
            key={tech.id}
            onPress={() => router.push({ pathname: '/(ops)/dispatch', params: { technicianId: tech.id } })}
            accessibilityRole="button"
            accessibilityLabel={`${tech.name} · ${tech.skills_label}`}
            style={styles.card}
          >
            <View style={styles.row}>
              <Text style={styles.name}>{tech.name}</Text>
              {tech.duty_status === 'OFF_DUTY' ? <StatusChip label="Off" variant="neutral" /> : null}
            </View>
            <Text style={styles.meta}>
              {tech.name} · {tech.skills_label} · {tech.active_jobs_count} job
              {tech.active_jobs_count === 1 ? '' : 's'}
            </Text>
          </Pressable>
        ))}
        {query.isSuccess && techs.length === 0 ? <Text style={styles.empty}>No technicians match.</Text> : null}
      </ScrollView>
      <OpenInWebLink url={webOpsUrl('people')} label="Open people management on web" pathKey="people" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: layout.minTouch,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  section: { ...type.sectionTitle, color: colors.textStrong },
  list: { gap: 10, paddingBottom: 16 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
    minHeight: layout.minTouch,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { ...type.bodyMedium, color: colors.textStrong },
  meta: { ...type.caption, color: colors.textMuted },
  empty: { ...type.body, color: colors.textMuted },
});
