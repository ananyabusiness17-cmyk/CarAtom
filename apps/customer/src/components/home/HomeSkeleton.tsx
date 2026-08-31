import { StyleSheet, View } from 'react-native';

import { colors, radius } from '../../theme/tokens';

export function HomeSkeleton() {
  return (
    <View style={styles.wrap}>
      <View style={styles.hero} />
      <View style={styles.line} />
      <View style={styles.card} />
      <View style={styles.line} />
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, paddingHorizontal: 16, paddingTop: 8 },
  hero: { height: 48, backgroundColor: colors.surfaceSubtle, borderRadius: radius.pill },
  card: { height: 96, backgroundColor: colors.surfaceSubtle, borderRadius: radius.tile },
  line: { height: 16, backgroundColor: colors.surfaceSubtle, borderRadius: 8, width: '80%' },
});
