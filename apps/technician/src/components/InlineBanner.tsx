import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, type } from '../theme/tokens';

export function InlineBanner({
  message,
  actionLabel,
  onAction,
  tone = 'danger',
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'danger' | 'warning';
}) {
  return (
    <View
      style={[styles.banner, tone === 'warning' ? styles.warn : styles.danger]}
      accessibilityRole="alert"
    >
      <Text style={[styles.text, tone === 'warning' ? styles.warnText : styles.dangerText]}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.action}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    padding: 12,
    borderRadius: radius.card,
    gap: 8,
  },
  danger: { backgroundColor: colors.dangerSoft },
  warn: { backgroundColor: colors.warningSoft },
  text: { ...type.caption },
  dangerText: { color: colors.danger },
  warnText: { color: colors.warning },
  action: { minHeight: 44, justifyContent: 'center' },
  actionText: { ...type.bodyMedium, color: colors.brandStrong },
});
