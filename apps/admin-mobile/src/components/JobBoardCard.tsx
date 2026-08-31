import type { AdminJobBoardItem } from '@caratom/contracts';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, type } from '../theme/tokens';
import { StatusChip, statusChipVariant } from './StatusChip';

export const JobBoardCard = memo(function JobBoardCard({
  item,
  onPress,
}: {
  item: AdminJobBoardItem;
  onPress: (id: string) => void;
}) {
  const tech = item.assigned_technician?.name ?? 'Needs dispatch';
  const area = item.area_label;
  return (
    <Pressable
      onPress={() => onPress(item.id)}
      accessibilityRole="button"
      accessibilityLabel={`${item.ref}, ${item.status_label}, assigned to ${tech}`}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.top}>
        <Text style={styles.title} numberOfLines={1}>
          {item.ref} {item.vehicle_label}
        </Text>
        <StatusChip label={item.status_label} variant={statusChipVariant(item.status_label, item.needs_dispatch)} />
      </View>
      <Text style={styles.sub} numberOfLines={1}>
        {tech}
        {area ? ` · ${area}` : ''}
      </Text>
      {item.payment_chip && item.payment_chip !== item.status_label ? (
        <StatusChip label={item.payment_chip} variant="brand" />
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    minHeight: 88,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
    justifyContent: 'center',
  },
  pressed: { opacity: 0.88 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { ...type.bodyMedium, color: colors.textStrong, flex: 1, fontSize: 15 },
  sub: { ...type.caption, color: colors.textMuted },
});
