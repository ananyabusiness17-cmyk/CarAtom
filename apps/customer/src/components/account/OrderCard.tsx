import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { BookingSummary } from '@caratom/contracts';

import { StatusChip } from '../StatusChip';
import { colors, radius, type } from '../../theme/tokens';

export function OrderCard({
  order,
  onPress,
}: {
  order: BookingSummary;
  onPress: () => void;
}) {
  const chip = order.status_chip ?? order.progress_label;
  const tone = order.status_tone ?? (chip === 'Completed' ? 'ok' : 'warn');
  const subtitle = order.subtitle ?? order.service_summary;
  const hint = order.next_action_hint;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${order.public_ref}, ${order.service_summary}, ${chip}, next action ${hint ?? 'view details'}`}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.row}>
        <View style={styles.thumb} accessibilityElementsHidden />
        <View style={styles.body}>
          <View style={styles.top}>
            <Text style={styles.ref}>{order.public_ref}</Text>
            <StatusChip label={chip} tone={tone} />
          </View>
          <Text style={styles.summary} numberOfLines={2}>
            {subtitle}
          </Text>
          {hint && hint !== 'View details' ? (
            <Text style={styles.hint} numberOfLines={1}>
              {hint}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 72,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
  },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.surfaceSubtle,
  },
  body: { flex: 1, gap: 4 },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center' },
  ref: { ...type.bodyMedium, color: colors.textStrong },
  summary: { ...type.body, color: colors.textMuted },
  hint: { ...type.caption, color: colors.brandStrong, fontWeight: '600' },
});
