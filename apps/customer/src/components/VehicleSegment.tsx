import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors, radius, type } from '../theme/tokens';

const SEGMENTS = [
  { key: 'make', label: 'Make', href: '/vehicle/make' },
  { key: 'model', label: 'Model', href: '/vehicle/model' },
  { key: 'year', label: 'Year', href: '/vehicle/year' },
  { key: 'fuel', label: 'Fuel', href: '/vehicle/fuel' },
] as const;

export function VehicleSegment({ active }: { active: (typeof SEGMENTS)[number]['key'] }) {
  const router = useRouter();
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {SEGMENTS.map((segment) => {
        const isActive = segment.key === active;
        return (
          <Pressable
            key={segment.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={segment.label}
            onPress={() => router.push(segment.href)}
            style={[styles.chip, isActive ? styles.active : null]}
          >
            <Text style={[styles.label, isActive ? styles.activeLabel : null]}>{segment.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSubtle,
  },
  active: { backgroundColor: colors.brandSoft },
  label: { ...type.caption, color: colors.textMuted, fontWeight: '600' },
  activeLabel: { color: colors.brand },
});
