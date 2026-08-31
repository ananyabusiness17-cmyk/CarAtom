import { StyleSheet, View } from 'react-native';

import { colors } from '../theme/tokens';

/** Decorative only. Does not request location permission. */
export function DispatchMapPlaceholder() {
  return (
    <View style={styles.canvas} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.roadH} />
      <View style={styles.roadV} />
      <View style={styles.van} />
      <View style={styles.pin} />
    </View>
  );
}

const MAP_FILL = '#E8E4DE';

const styles = StyleSheet.create({
  canvas: {
    height: 160,
    backgroundColor: MAP_FILL,
    borderRadius: 12,
    overflow: 'hidden',
  },
  roadH: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 72,
    height: 10,
    backgroundColor: '#D3CEC6',
  },
  roadV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 88,
    width: 10,
    backgroundColor: '#D3CEC6',
  },
  van: {
    position: 'absolute',
    left: 118,
    top: 58,
    width: 28,
    height: 16,
    borderRadius: 4,
    backgroundColor: colors.brandStrong,
  },
  pin: {
    position: 'absolute',
    right: 36,
    top: 40,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.danger,
  },
});
