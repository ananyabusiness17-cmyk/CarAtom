import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, type } from '../theme/tokens';

const TONES: Record<string, { fg: string; bg: string }> = {
  ok: { fg: colors.success, bg: colors.successSoft },
  warn: { fg: colors.warning, bg: colors.warningSoft },
  err: { fg: colors.danger, bg: colors.dangerSoft },
  neutral: { fg: colors.brandStrong, bg: colors.brandSoft },
};

export function StatusChip({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: string | null;
}) {
  const palette = TONES[tone ?? 'neutral'] ?? TONES.neutral;
  return (
    <View style={[styles.chip, { backgroundColor: palette.bg }]}>
      <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  label: { ...type.caption, fontWeight: '700' },
});
