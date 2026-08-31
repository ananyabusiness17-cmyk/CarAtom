import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, type } from '../../theme/tokens';

export function IncludedList({ items }: { items: string[] }) {
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <View key={item} style={styles.row}>
          <Text style={styles.label}>{item}</Text>
          <View style={styles.chip}>
            <Text style={styles.chipText}>Included</Text>
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
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 44,
  },
  label: { ...type.body, color: colors.text, flex: 1 },
  chip: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { ...type.label, color: colors.success, fontWeight: '600' },
});
