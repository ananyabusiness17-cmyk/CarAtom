import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, type } from '../../theme/tokens';

export function TrustStrip({ items }: { items: { icon_key: string; label: string }[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {items.map((item) => (
        <View key={item.icon_key} style={styles.card}>
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 10, paddingRight: 16 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.tile,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 120,
  },
  label: { ...type.caption, color: colors.textStrong, fontWeight: '600' },
});
