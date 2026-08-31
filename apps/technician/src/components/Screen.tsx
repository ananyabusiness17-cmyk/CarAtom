import type { ReactElement, ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type RefreshControlProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout } from '../theme/tokens';

export function Screen({
  children,
  scroll = true,
  refreshControl,
}: {
  children: ReactNode;
  scroll?: boolean;
  refreshControl?: ReactElement<RefreshControlProps>;
}) {
  const insets = useSafeAreaInsets();
  const pad = {
    paddingHorizontal: layout.pagePad,
    paddingTop: layout.pagePad,
    paddingBottom: Math.max(insets.bottom, 16),
  };
  if (!scroll) {
    return <View style={[styles.screen, pad]}>{children}</View>;
  }
  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, pad]}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.canvas },
  screen: { flex: 1, gap: 12, backgroundColor: colors.canvas },
  content: { gap: 12, flexGrow: 1 },
});
