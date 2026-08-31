import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, type } from '../theme/tokens';

export function SecondaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    paddingVertical: 12,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.brandStrong,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.45 },
  label: { ...type.bodyMedium, color: colors.brandStrong },
});
