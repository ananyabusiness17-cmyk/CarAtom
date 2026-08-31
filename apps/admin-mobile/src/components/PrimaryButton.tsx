import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, type } from '../theme/tokens';

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const isDisabled = Boolean(disabled || loading);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: Boolean(loading) }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
      ]}
    >
      {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    paddingVertical: 14,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandStrong,
  },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.45 },
  label: { ...type.bodyMedium, color: colors.surface },
});
