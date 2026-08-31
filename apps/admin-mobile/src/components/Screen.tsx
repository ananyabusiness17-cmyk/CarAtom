import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout } from '../theme/tokens';

export function Screen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingBottom: Math.max(insets.bottom, 12) }]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: layout.pagePad,
    paddingTop: layout.pagePad,
    gap: 12,
    backgroundColor: colors.canvas,
  },
});
