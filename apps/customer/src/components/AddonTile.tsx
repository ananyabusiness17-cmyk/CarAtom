import { Pressable, StyleSheet, Text, View } from 'react-native';

import { QtyStepper } from './QtyStepper';
import { formatInr } from '../lib/formatMoney';
import { colors, radius, type } from '../theme/tokens';

export function AddonTile({
  name,
  priceMinor,
  quantity,
  plusDisabled,
  minusDisabled,
  onPlus,
  onMinus,
}: {
  name: string;
  priceMinor: number;
  quantity: number;
  plusDisabled?: boolean;
  minusDisabled?: boolean;
  onPlus: () => void;
  onMinus: () => void;
}) {
  const inCart = quantity > 0;
  const lineMinor = priceMinor * Math.max(quantity, 1);

  return (
    <View style={[styles.tile, inCart ? styles.selected : null]}>
      <Text style={styles.name} numberOfLines={2}>
        {name}
      </Text>
      <Text
        style={styles.price}
        accessibilityLabel={inCart ? `${formatInr(lineMinor)} for ${quantity}` : formatInr(priceMinor)}
      >
        {formatInr(inCart ? lineMinor : priceMinor)}
      </Text>
      {inCart ? (
        <QtyStepper
          label={name}
          quantity={quantity}
          minusDisabled={minusDisabled}
          plusDisabled={plusDisabled}
          onMinus={onMinus}
          onPlus={onPlus}
        />
      ) : (
        <Pressable
          onPress={onPlus}
          accessibilityRole="button"
          accessibilityLabel={`Add ${name}`}
          hitSlop={4}
          style={({ pressed }) => [styles.addHit, pressed ? styles.pressed : null]}
        >
          <Text style={styles.addLabel}>ADD</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 124,
    padding: 12,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 8,
  },
  selected: {
    borderColor: colors.selectionBorder,
    backgroundColor: colors.selectionBg,
    borderWidth: 1.5,
  },
  name: { ...type.bodyMedium, color: colors.textStrong },
  price: { ...type.caption, color: colors.textMuted },
  addHit: {
    alignSelf: 'flex-start',
    minHeight: 44,
    minWidth: 64,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.brandStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.88 },
  addLabel: { ...type.label, color: colors.brandStrong, fontWeight: '700' },
});

