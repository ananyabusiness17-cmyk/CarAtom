import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, type } from '../theme/tokens';

export type PartRow = {
  sku_code: string;
  label: string;
  quantity: number;
  notes?: string | null;
};

export function PartsEntryList({ parts }: { parts: PartRow[] }) {
  if (parts.length === 0) {
    return <Text style={styles.empty}>No parts recorded yet.</Text>;
  }
  return (
    <View style={styles.list}>
      {parts.map((part) => (
        <View key={`${part.sku_code}-${part.label}`} style={styles.row}>
          <View style={styles.icon} accessibilityElementsHidden />
          <View style={styles.meta}>
            <Text style={styles.label}>{part.label}</Text>
            <Text style={styles.sku}>
              SKU {part.sku_code} · qty {part.quantity}
            </Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>Fitted</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 12,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.surfaceSubtle,
  },
  meta: { flex: 1, gap: 2 },
  label: { ...type.bodyMedium, color: colors.textStrong },
  sku: { ...type.caption, color: colors.textMuted },
  chip: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipText: { ...type.caption, color: colors.success },
  empty: { ...type.body, color: colors.textMuted },
});
