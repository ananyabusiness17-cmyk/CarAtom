import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { OverrideLiteAction } from '@caratom/contracts';

import { colors, layout, radius, type } from '../theme/tokens';

const TILES: { action: OverrideLiteAction; title: string; sub: string }[] = [
  { action: 'FORCE_STATUS', title: 'Force status', sub: '→ invoiced' },
  { action: 'MOVE_VISIT_SLOT', title: 'Move slot', sub: 'Thu 9:00' },
  { action: 'RECORD_OFFLINE_PAYMENT', title: 'Cash / offline', sub: '₹2,100' },
  { action: 'DESK_COMPLETE_VISIT', title: 'Desk complete', sub: 'Tech phone down' },
];

export function OverrideActionPicker({
  value,
  onChange,
}: {
  value: OverrideLiteAction | null;
  onChange: (action: OverrideLiteAction) => void;
}) {
  return (
    <View style={styles.grid}>
      {TILES.map((tile) => {
        const selected = value === tile.action;
        return (
          <Pressable
            key={tile.action}
            onPress={() => onChange(tile.action)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${tile.title}. ${tile.sub}`}
            style={[styles.cell, selected ? styles.selected : null]}
          >
            <Text style={styles.title}>{tile.title}</Text>
            <Text style={styles.sub}>{tile.sub}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    width: '48%',
    minHeight: layout.minTouch + 28,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 4,
  },
  selected: { backgroundColor: colors.brandSoft, borderColor: colors.brand },
  title: { ...type.bodyMedium, color: colors.textStrong },
  sub: { ...type.caption, color: colors.textMuted },
});
