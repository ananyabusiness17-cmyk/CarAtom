import type { DispatchTechnician } from '@caratom/contracts';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, layout, radius, type } from '../theme/tokens';
import { StatusChip } from './StatusChip';

export function TechDutyCard({
  technician,
  selectedJobRef,
  onAssign,
  onPress,
}: {
  technician: DispatchTechnician;
  selectedJobRef?: string;
  onAssign?: () => void;
  onPress?: () => void;
}) {
  const off = technician.duty_status === 'OFF_DUTY';
  const assignLabel = selectedJobRef ? `Assign ${selectedJobRef}` : 'Assign';
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${technician.name}, ${technician.duty_status === 'ON_DUTY' ? 'on duty' : 'off duty'}, ${technician.skills_label}`}
      style={styles.card}
    >
      <View style={styles.top}>
        <View style={styles.nameRow}>
          {!off ? <View style={styles.dot} /> : null}
          <Text style={styles.name}>{technician.name}</Text>
        </View>
        {off ? <StatusChip label="Off" variant="neutral" /> : null}
      </View>
      <Text style={styles.meta} numberOfLines={2}>
        {technician.skills_label}
        {technician.van_label ? ` · ${technician.van_label}` : ''}
      </Text>
      {!off && onAssign ? (
        <Pressable
          onPress={onAssign}
          accessibilityRole="button"
          accessibilityLabel={assignLabel}
          disabled={!selectedJobRef}
          style={({ pressed }) => [
            styles.assign,
            !selectedJobRef ? styles.assignDisabled : null,
            pressed && selectedJobRef ? styles.pressed : null,
          ]}
        >
          <Text style={styles.assignLabel}>{assignLabel}</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  name: { ...type.bodyMedium, color: colors.textStrong },
  meta: { ...type.caption, color: colors.textMuted },
  assign: {
    minHeight: layout.minTouch,
    borderRadius: radius.button,
    backgroundColor: colors.brandStrong,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  assignDisabled: { opacity: 0.45 },
  assignLabel: { ...type.bodyMedium, color: colors.surface },
  pressed: { opacity: 0.88 },
});
