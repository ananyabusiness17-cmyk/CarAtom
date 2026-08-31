import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { InlineBanner } from '../../src/components/InlineBanner';
import { Screen } from '../../src/components/Screen';
import { drainQueue } from '../../src/providers/OfflineSyncProvider';
import { useOfflineQueueStore } from '../../src/stores/offlineQueueStore';
import { colors, radius, type } from '../../src/theme/tokens';

export default function OfflineQueueScreen() {
  const entries = useOfflineQueueStore((s) => s.entries);
  const dequeue = useOfflineQueueStore((s) => s.dequeue);
  const retry = useOfflineQueueStore((s) => s.retry);

  function discard(eventId: string) {
    Alert.alert('Discard change?', 'This queued write will not be sent.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => void dequeue(eventId),
      },
    ]);
  }

  return (
    <Screen>
      <Text style={styles.lead}>
        Queued events — Check-ins, photos, and parts sync when back online
      </Text>
      {entries.length === 0 ? <Text style={styles.empty}>No pending changes.</Text> : null}
      {entries.map((entry) => (
        <View key={entry.eventId} style={styles.row}>
          <View style={styles.meta}>
            <Text style={styles.kind}>{entry.kind}</Text>
            <Text style={styles.status}>
              {entry.status}
              {entry.error ? ` · ${entry.error}` : ''}
            </Text>
          </View>
          {entry.status === 'failed' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry"
              onPress={() => {
                void retry(entry.eventId).then(() => drainQueue());
              }}
              style={styles.action}
            >
              <Text style={styles.link}>Retry</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Discard"
            onPress={() => discard(entry.eventId)}
            style={styles.action}
          >
            <Text style={styles.danger}>Discard</Text>
          </Pressable>
        </View>
      ))}
      {entries.some((row) => row.status === 'failed') ? (
        <InlineBanner message="Some writes failed validation. Retry or discard them." />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { ...type.body, color: colors.text },
  empty: { ...type.body, color: colors.textMuted },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  meta: { flex: 1, gap: 2 },
  kind: { ...type.bodyMedium, color: colors.textStrong },
  status: { ...type.caption, color: colors.textMuted },
  action: { minHeight: 44, justifyContent: 'center' },
  link: { ...type.bodyMedium, color: colors.brandStrong },
  danger: { ...type.bodyMedium, color: colors.danger },
});
