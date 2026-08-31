import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, type } from '../../theme/tokens';

type Props = {
  children: string;
  tone?: 'brand' | 'warn';
};

export function PolicyNote({ children, tone = 'brand' }: Props) {
  return (
    <View style={[styles.note, tone === 'warn' ? styles.warn : styles.brand]}>
      <Text style={[styles.text, tone === 'warn' ? styles.warnText : styles.brandText]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  brand: { backgroundColor: colors.brandSoft },
  warn: { backgroundColor: colors.warningSoft },
  text: { ...type.caption, fontWeight: '600' },
  brandText: { color: colors.brandStrong },
  warnText: { color: colors.warning },
});
