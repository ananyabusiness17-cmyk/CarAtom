import { StyleSheet, Text, View } from 'react-native';

import type { Address } from '@caratom/contracts';

import { colors, radius, type } from '../../theme/tokens';

export function AddressCard({ address }: { address: Address }) {
  return (
    <View style={styles.card} accessibilityLabel={`${address.line1}, ${address.locality}`}>
      {address.is_default ? <Text style={styles.badge}>Default</Text> : null}
      <Text style={styles.line} numberOfLines={3}>
        {address.line1}
      </Text>
      <Text style={styles.meta}>
        {address.locality}
        {address.city ? `, ${address.city}` : ''} {address.postal_code}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 6,
    minHeight: 72,
  },
  badge: { ...type.caption, color: colors.brandStrong, fontWeight: '700' },
  line: { ...type.bodyMedium, color: colors.textStrong },
  meta: { ...type.caption, color: colors.textMuted },
});
