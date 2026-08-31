import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout } from '../theme/tokens';

export function FlowScreen({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingBottom: Math.max(insets.bottom, 12) }, style]}>
      {children}
    </View>
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
