import { StyleSheet, Text, View } from 'react-native';

import type { ProgressStep } from '@caratom/contracts';

import { colors, type } from '../../theme/tokens';

export function BookingProgressStepper({ steps }: { steps: ProgressStep[] }) {
  const activeIndex = steps.findIndex((step) => step.status === 'active');
  const total = steps.length || 1;
  const current = activeIndex >= 0 ? activeIndex + 1 : steps.filter((s) => s.status === 'done').length;
  return (
    <View
      accessible
      accessibilityLabel={`Step ${current} of ${total}, ${steps[Math.max(activeIndex, 0)]?.label ?? ''}, ${
        steps[Math.max(activeIndex, 0)]?.status === 'active' ? 'in progress' : steps[Math.max(activeIndex, 0)]?.status ?? ''
      }`}
      style={styles.row}
    >
      {steps.map((step, index) => {
        const selected = step.status === 'active';
        return (
          <View key={step.key} style={styles.item} accessibilityState={{ selected }}>
            <View
              style={[
                styles.dot,
                step.status === 'done' ? styles.done : null,
                selected ? styles.active : null,
              ]}
            >
              <Text style={styles.mark}>{step.status === 'done' ? '✓' : index + 1}</Text>
            </View>
            <Text style={[styles.label, selected ? styles.labelActive : null]} numberOfLines={1}>
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, width: '100%' },
  item: { flex: 1, alignItems: 'center', gap: 6 },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  done: { backgroundColor: colors.brandSoft, borderColor: colors.brandStrong },
  active: { borderColor: colors.brandStrong, borderWidth: 2 },
  mark: { ...type.caption, color: colors.brandStrong, fontWeight: '700' },
  label: { ...type.caption, color: colors.textMuted, textAlign: 'center' },
  labelActive: { color: colors.textStrong, fontWeight: '700' },
});
