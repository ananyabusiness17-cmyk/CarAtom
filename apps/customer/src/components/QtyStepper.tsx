import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, layout, type } from '../theme/tokens';

export function QtyStepper({
  quantity,
  onMinus,
  onPlus,
  minusDisabled,
  plusDisabled,
  label,
}: {
  quantity: number;
  onMinus: () => void;
  onPlus: () => void;
  minusDisabled?: boolean;
  plusDisabled?: boolean;
  label: string;
}) {
  return (
    <View style={styles.row} accessibilityRole="adjustable" accessibilityLabel={`${label}, quantity ${quantity}`}>
      <Pressable
        onPress={onMinus}
        disabled={minusDisabled}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${label}`}
        hitSlop={4}
        style={({ pressed }) => [
          styles.hit,
          pressed && !minusDisabled ? styles.pressed : null,
          minusDisabled ? styles.disabled : null,
        ]}
      >
        <Text style={styles.glyph}>−</Text>
      </Pressable>
      <Text style={styles.qty} accessibilityElementsHidden>
        {quantity}
      </Text>
      <Pressable
        onPress={onPlus}
        disabled={plusDisabled}
        accessibilityRole="button"
        accessibilityLabel={`Add ${label}`}
        hitSlop={4}
        style={({ pressed }) => [
          styles.hit,
          pressed && !plusDisabled ? styles.pressed : null,
          plusDisabled ? styles.disabled : null,
        ]}
      >
        <Text style={styles.glyph}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hit: {
    minWidth: layout.minTouch,
    minHeight: layout.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
  glyph: { ...type.bodyMedium, color: colors.textStrong, fontSize: 20, lineHeight: 24 },
  qty: {
    ...type.bodyMedium,
    color: colors.textStrong,
    minWidth: 22,
    textAlign: 'center',
  },
});
