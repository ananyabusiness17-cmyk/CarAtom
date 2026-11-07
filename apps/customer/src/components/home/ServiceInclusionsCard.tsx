import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, type } from '../../theme/tokens';

export const GENERAL_SERVICE_INCLUSIONS = [
  'Oil filter',
  'Engine oil',
  'Engine oil flush',
  'All fluid top-ups',
  'Air filter',
  'AC filter',
  'Car washing',
  'Brake system inspection',
  'Battery system health check',
  'Suspension system health check',
] as const;

type Props = {
  title: string;
  priceLabel?: string | null;
};

export function ServiceInclusionsCard({ title, priceLabel }: Props) {
  return (
    <View style={styles.card} accessibilityRole="summary" accessibilityLabel={title}>
      <Text style={styles.title}>{title}</Text>
      {priceLabel ? <Text style={styles.price}>{priceLabel}</Text> : null}
      <View style={styles.grid}>
        {GENERAL_SERVICE_INCLUSIONS.map((item) => (
          <View key={item} style={styles.cell}>
            <Ionicons
              name="checkmark-circle"
              size={14}
              color={colors.success}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={styles.label}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.canvas,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: 16,
    gap: 12,
  },
  title: { ...type.sectionTitle, color: colors.textStrong },
  price: { ...type.price, color: colors.textStrong },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  cell: {
    width: '33.333%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    paddingRight: 8,
    paddingBottom: 6,
  },
  label: {
    ...type.caption,
    color: colors.text,
    flex: 1,
    lineHeight: 16,
  },
});
