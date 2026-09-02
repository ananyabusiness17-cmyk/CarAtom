import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { colors, radius, type } from '../theme/tokens';
import { passAlongParams } from '../lib/vehicleNav';

const SEGMENTS = [
  { key: 'make', label: 'Make', pathname: '/vehicle/make' as const },
  { key: 'model', label: 'Model', pathname: '/vehicle/model' as const },
  { key: 'year', label: 'Year', pathname: '/vehicle/year' as const },
  { key: 'fuel', label: 'Fuel', pathname: '/vehicle/fuel' as const },
] as const;

export function VehicleSegment({ active }: { active: (typeof SEGMENTS)[number]['key'] }) {
  const router = useRouter();
  const params = useLocalSearchParams<{
    offering?: string;
    returnTo?: string;
    flow?: string;
    intent?: string;
  }>();

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
            onPress={() =>
              router.push({
                pathname: segment.pathname,
                params: passAlongParams(
                  {
                    offering: params.offering,
                    flow: params.flow,
                    intent: params.intent,
                  },
                  params.returnTo,
                ),
              })
            }
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
