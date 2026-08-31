import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { colors, type } from '../theme/tokens';
import { track } from '../lib/analytics';

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let unsub: () => void = () => undefined;
    void import('@react-native-community/netinfo')
      .then((mod) => {
        const NetInfo = mod.default;
        unsub = NetInfo.addEventListener((state) => {
          const next = state.isConnected === false;
          setOffline(next);
          if (next) track('offline_banner_shown');
        });
      })
      .catch(() => undefined);
    return () => unsub();
  }, []);

  if (!offline) return null;
  return (
    <Text accessibilityRole="alert" style={styles.banner}>
      {"You're offline. Some actions are unavailable."}
    </Text>
  );
}

const styles = StyleSheet.create({
  banner: {
    ...type.caption,
    color: colors.warning,
    backgroundColor: colors.warningSoft,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    textAlignVertical: 'center',
  },
});
