import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, type } from '../../theme/tokens';

type Props = {
  title: string;
  subtitle: string;
  priceLabel: string;
};

export function PackageCard({ title, subtitle, priceLabel }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{subtitle}</Text>
        <Text style={styles.price}>{priceLabel}</Text>
      </View>
      <View style={styles.art} accessibilityElementsHidden>
        <Ionicons name="car-sport" size={36} color={colors.brandStrong} />
        <View style={styles.artBadge}>
          <Ionicons name="construct" size={14} color={colors.surface} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.brandSoft,
    borderRadius: radius.tile,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  copy: { flex: 1, gap: 4 },
  title: { ...type.sectionTitle, color: colors.textStrong },
  sub: { ...type.caption, color: colors.text },
  price: { ...type.price, color: colors.textStrong, marginTop: 4 },
  art: {
    width: 84,
    height: 84,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.brandStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
