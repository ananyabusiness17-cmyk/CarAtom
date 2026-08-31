import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, type } from '../theme/tokens';

export function VehicleSummaryCard({ summary }: { summary: string }) {
  return (
    <View style={styles.card} accessibilityLabel={`Vehicle ${summary}`}>
      <View style={styles.thumb}>
        <Ionicons name="car-sport" size={22} color={colors.brandStrong} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.label}>Vehicle</Text>
        <Text style={styles.value} numberOfLines={3}>
          {summary}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 12,
    minHeight: 64,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1 },
  label: { ...type.label, color: colors.textMuted },
  value: { ...type.bodyMedium, color: colors.textStrong },
});
