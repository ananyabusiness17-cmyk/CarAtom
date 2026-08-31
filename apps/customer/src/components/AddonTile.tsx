import { Pressable, StyleSheet, Text } from 'react-native';

import { formatInr } from '../lib/formatMoney';
import { colors, radius, type } from '../theme/tokens';

export function AddonTile({
  name,
  priceMinor,
  selected,
  denyMode,
  onPress,
  onRemove,
}: {
  name: string;
  priceMinor: number;
  selected: boolean;
  denyMode?: boolean;
  onPress: () => void;
  onRemove?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${formatInr(priceMinor)}${selected ? ', selected' : ''}`}
      accessibilityState={{ selected }}
      style={[styles.tile, selected ? styles.selected : null]}
    >
      <Text style={styles.name} numberOfLines={2}>
        {name}
      </Text>
      <Text style={styles.price}>{formatInr(priceMinor)}</Text>
      {denyMode && selected ? (
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${name}`}
        >
          <Text style={styles.remove}>Remove</Text>
        </Pressable>
      ) : (
        <Text style={styles.mark}>{selected ? '✓' : '+'}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 108,
    padding: 12,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 6,
  },
  selected: {
    borderColor: colors.selectionBorder,
    backgroundColor: colors.selectionBg,
    borderWidth: 1.5,
  },
  name: { ...type.bodyMedium, color: colors.textStrong },
  price: { ...type.caption, color: colors.textMuted },
  mark: { ...type.label, color: colors.brandStrong, marginTop: 'auto' },
  remove: { ...type.label, color: colors.warning, marginTop: 'auto' },
});
