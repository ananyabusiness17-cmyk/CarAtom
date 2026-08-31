import { StyleSheet, Text, View } from 'react-native';

import { formatInr } from '../lib/formatMoney';
import { colors, radius, type } from '../theme/tokens';

export function PartsAdvanceSummary({
  partsSubtotalMinor,
  advanceMinor,
  balanceMinor,
  percent,
}: {
  partsSubtotalMinor: number;
  advanceMinor: number;
  balanceMinor: number;
  percent?: number;
}) {
  return (
    <View style={styles.card}>
      <Row label="Parts subtotal" value={formatInr(partsSubtotalMinor)} />
      <Row
        label={percent ? `Parts advance (${percent}%)` : 'Parts advance'}
        value={formatInr(advanceMinor)}
        emphasize
      />
      <Row label="Balance after repair" value={formatInr(balanceMinor)} />
    </View>
  );
}

function Row({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, emphasize ? styles.strong : null]}>{label}</Text>
      <Text
        style={[styles.value, emphasize ? styles.strong : null]}
        accessibilityLabel={`${label} ${value}`}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.brandSoft,
    borderRadius: radius.card,
    padding: 14,
    gap: 10,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  label: { ...type.body, color: colors.text, flex: 1 },
  value: { ...type.bodyMedium, color: colors.textStrong },
  strong: { color: colors.brandStrong, fontWeight: '700' },
});
