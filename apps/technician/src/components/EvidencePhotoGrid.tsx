import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, type } from '../theme/tokens';

export function EvidencePhotoGrid({
  uris,
  onAdd,
}: {
  uris: string[];
  onAdd: () => void;
}) {
  return (
    <View style={styles.grid}>
      {uris.map((uri, index) => (
        <View key={uri} style={styles.tile} accessibilityLabel={`Photo ${index + 1}`}>
          <Text style={styles.caption}>Photo {index + 1}</Text>
        </View>
      ))}
      <Pressable accessibilityRole="button" accessibilityLabel="Add camera photo" onPress={onAdd} style={styles.add}>
        <Text style={styles.addText}>+ Camera</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    width: '47%',
    minHeight: 88,
    borderRadius: radius.control,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: { ...type.caption, color: colors.textMuted },
  add: {
    width: '47%',
    minHeight: 88,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  addText: { ...type.bodyMedium, color: colors.brandStrong },
});
