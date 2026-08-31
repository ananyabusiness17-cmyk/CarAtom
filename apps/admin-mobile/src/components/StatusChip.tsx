import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, type } from '../theme/tokens';

export type StatusChipVariant = 'warn' | 'ok' | 'neutral' | 'danger' | 'brand';

const VARIANTS: Record<StatusChipVariant, { bg: string; fg: string }> = {
  warn: { bg: colors.warningSoft, fg: colors.warning },
  ok: { bg: colors.successSoft, fg: colors.success },
  neutral: { bg: colors.surfaceSubtle, fg: colors.textMuted },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  brand: { bg: colors.brandSoft, fg: colors.brandStrong },
};

export function statusChipVariant(label: string, needsDispatch?: boolean): StatusChipVariant {
  if (needsDispatch || /unassigned|inspecting|waiting/i.test(label)) return 'warn';
  if (/parts advance/i.test(label)) return 'brand';
  if (/on duty|paid|complete/i.test(label)) return 'ok';
  if (/off|cancel|fail/i.test(label)) return 'danger';
  return 'neutral';
}

export const StatusChip = memo(function StatusChip({
  label,
  variant,
}: {
  label: string;
  variant?: StatusChipVariant;
}) {
  const tone = VARIANTS[variant ?? statusChipVariant(label)];
  return (
    <View style={[styles.chip, { backgroundColor: tone.bg }]}>
      <Text style={[styles.text, { color: tone.fg }]}>{label}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 140,
  },
  text: { ...type.caption, fontWeight: '700' },
});
