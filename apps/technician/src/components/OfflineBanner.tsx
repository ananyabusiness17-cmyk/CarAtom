import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

import { useOfflineQueueStore } from '../stores/offlineQueueStore';
import { colors, type } from '../theme/tokens';

export function OfflineBanner() {
  const pending = useOfflineQueueStore((s) => s.entries.filter((row) => row.status === 'pending').length);
  const failed = useOfflineQueueStore((s) => s.entries.some((row) => row.status === 'failed'));
  const [offline, setOffline] = useState(false);
  const router = useRouter();

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      setOffline(state.isConnected === false);
    });
  }, []);

  if (!offline && pending === 0 && !failed) return null;
  const message = offline
    ? `Offline — ${pending} changes pending`
    : failed
      ? `Offline queue · ${pending} pending`
      : `Offline — ${pending} changes pending`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={message}
      onPress={() => router.push('/offline-queue')}
      style={styles.banner}
    >
      <Text style={styles.text}>{message}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warningSoft,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  text: { ...type.caption, color: colors.warning },
});
