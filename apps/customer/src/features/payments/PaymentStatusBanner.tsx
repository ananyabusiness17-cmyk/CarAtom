import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, radius, type } from '../../theme/tokens';

export function PaymentStatusBanner({
  tone,
  message,
  pending,
}: {
  tone: 'warn' | 'ok' | 'err';
  message: string;
  pending?: boolean;
}) {
  const bg =
    tone === 'ok' ? colors.successSoft : tone === 'err' ? colors.dangerSoft : colors.warningSoft;
  const fg = tone === 'ok' ? colors.success : tone === 'err' ? colors.danger : colors.warning;
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[styles.banner, { backgroundColor: bg }]}
    >
      {pending ? <ActivityIndicator color={fg} /> : null}
      <Text style={[styles.text, { color: fg }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radius.card,
  },
  text: { ...type.bodyMedium, flex: 1 },
});
