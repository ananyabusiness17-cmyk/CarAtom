import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, type } from '../theme/tokens';

export function ChoiceRow({
  label,
  caption,
  selected,
  disabled,
  compact,
  onPress,
}: {
  label: string;
  caption?: string;
  selected?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={caption ? `${label}. ${caption}` : label}
      accessibilityState={{ selected: Boolean(selected), disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        compact ? styles.compact : null,
        selected ? styles.selected : null,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <Text style={styles.label} numberOfLines={compact ? 1 : undefined}>
        {label}
      </Text>
      {caption ? (
        <Text style={styles.caption} numberOfLines={compact ? 2 : undefined}>
          {caption}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 2,
  },
  selected: {
    borderColor: colors.selectionBorder,
    backgroundColor: colors.selectionBg,
    borderWidth: 1.5,
  },
  compact: { flex: 1, minHeight: 72, justifyContent: 'flex-start' },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.45 },
  label: { ...type.bodyMedium, color: colors.textStrong },
  caption: { ...type.caption, color: colors.textMuted },
});
