import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, type } from '../../theme/tokens';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: 'brand' | 'warning' | 'sos';
  accessibilityHint?: string;
  accessibilityLabel?: string;
};

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  tone = 'brand',
  accessibilityHint,
  accessibilityLabel,
}: Props) {
  const isDisabled = Boolean(disabled || loading);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: Boolean(loading) }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === 'sos' ? styles.sos : tone === 'warning' ? styles.warning : styles.brand,
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
  },
  brand: { backgroundColor: colors.brandStrong },
  warning: { backgroundColor: colors.warning },
  sos: { backgroundColor: colors.sosAccent },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.45 },
  label: {
    ...type.bodyMedium,
    color: colors.surface,
  },
});
