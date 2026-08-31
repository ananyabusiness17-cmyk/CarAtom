import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, type } from '../theme/tokens';

type Props = {
  label: string;
  caption?: string;
  selected?: boolean;
  onPress: () => void;
  mark?: string;
};

export function SelectTile({ label, caption, selected, onPress, mark }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      accessibilityLabel={`${label}${caption ? `, ${caption}` : ''}${selected ? ', selected' : ''}`}
      style={({ pressed }) => [
        styles.tile,
        selected ? styles.selected : null,
        pressed ? styles.pressed : null,
      ]}
    >
      {mark ? <Text style={styles.mark}>{mark}</Text> : <View style={styles.photo} />}
      <Text style={styles.label}>{label}</Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      {selected ? <Text style={styles.check}>✓</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 88,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  selected: {
    borderWidth: 1.5,
    borderColor: colors.selectionBorder,
    backgroundColor: colors.selectionBg,
  },
  pressed: { opacity: 0.9 },
  mark: { ...type.sectionTitle, color: colors.brandStrong },
  photo: {
    width: 44,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.surfaceSubtle,
    marginBottom: 4,
  },
  label: { ...type.caption, fontWeight: '700', color: colors.textStrong, fontSize: 13 },
  caption: { ...type.label, color: colors.textMuted, fontSize: 11 },
  check: { position: 'absolute', top: 6, right: 8, color: colors.brandStrong, fontWeight: '700' },
});
