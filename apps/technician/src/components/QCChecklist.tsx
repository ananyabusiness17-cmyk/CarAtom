import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, type } from '../theme/tokens';

export type QcRow = { code: string; label: string; passed: boolean };

export function QCChecklist({
  items,
  onToggle,
}: {
  items: QcRow[];
  onToggle: (code: string) => void;
}) {
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <Pressable
          key={item.code}
          accessibilityRole="switch"
          accessibilityState={{ checked: item.passed }}
          accessibilityLabel={`${item.label}, ${item.passed ? 'Pass' : 'Fail'}`}
          onPress={() => onToggle(item.code)}
          style={styles.row}
        >
          <Text style={styles.label}>{item.label}</Text>
          <Text style={[styles.chip, item.passed ? styles.pass : styles.fail]}>
            {item.passed ? 'Pass' : 'Fail'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.control,
    paddingHorizontal: 12,
  },
  label: { ...type.body, color: colors.text, flex: 1 },
  chip: { ...type.bodyMedium, paddingHorizontal: 8 },
  pass: { color: colors.success },
  fail: { color: colors.danger },
});
