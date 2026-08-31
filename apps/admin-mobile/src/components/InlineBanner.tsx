import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, type } from '../theme/tokens';

export function InlineBanner({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.text}>{message}</Text>
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
    backgroundColor: colors.dangerSoft,
    padding: 12,
    borderRadius: radius.card,
    gap: 8,
  },
  text: { ...type.caption, color: colors.danger },
  action: { minHeight: 44, justifyContent: 'center' },
  actionText: { ...type.bodyMedium, color: colors.brandStrong },
});
