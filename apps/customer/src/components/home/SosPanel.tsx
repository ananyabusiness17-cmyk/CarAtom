import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, type } from '../../theme/tokens';

const TILE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  call_ops: 'call-outline',
  flat_tyre: 'car-outline',
  dead_battery: 'battery-charging-outline',
  tow: 'bus-outline',
};

export function SosPanel({
  headline,
  locality,
  liveLabel,
  tiles,
  map,
  permissionMessage,
  onTilePress,
}: {
  headline: string;
  locality: string;
  liveLabel?: string;
  tiles: { id: string; label: string }[];
  map?: ReactNode;
  permissionMessage?: string | null;
  onTilePress?: (id: string) => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.chip}>
        <Text style={styles.chipText}>{headline || 'Emergency · not scheduled service'}</Text>
      </View>
      <Text style={styles.locTitle}>Your location</Text>
      <View style={styles.address}>
        <Ionicons name="location-sharp" size={16} color={colors.sosAccent} />
        <View style={styles.addressCopy}>
          <Text style={styles.city}>{locality}</Text>
          <Text style={styles.street}>{liveLabel ?? 'Koramangala · live GPS'}</Text>
        </View>
        <View style={styles.live}>
          <Text style={styles.liveText}>{permissionMessage ? 'Approx' : 'Live'}</Text>
        </View>
      </View>
      {permissionMessage ? <Text style={styles.warn}>{permissionMessage}</Text> : null}
      {map ?? (
        <View style={styles.map} accessibilityLabel={`Map, ${locality}`}>
          <View style={styles.hRoad} />
          <View style={styles.vRoad} />
          <View style={styles.pin} />
        </View>
      )}
      <Text style={styles.choose}>Choose your emergency service</Text>
      <View style={styles.grid}>
        {tiles.map((tile) => (
          <Pressable
            key={tile.id}
            accessibilityRole="button"
            accessibilityLabel={tile.label}
            onPress={() => onTilePress?.(tile.id)}
            style={styles.tile}
          >
            <View style={styles.tileGlyph}>
              <Ionicons
                name={TILE_ICONS[tile.id] ?? 'alert-circle-outline'}
                size={26}
                color={colors.sosAccent}
              />
            </View>
            <Text style={styles.tileText}>{tile.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.warningSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { ...type.caption, color: colors.sosAccent, fontWeight: '600' },
  locTitle: { ...type.label, color: colors.textMuted },
  address: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addressCopy: { flex: 1 },
  city: { ...type.bodyMedium, color: colors.textStrong },
  street: { ...type.caption, color: colors.textMuted },
  live: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  liveText: { ...type.caption, color: colors.success, fontWeight: '700' },
  warn: { ...type.caption, color: colors.warning },
  map: {
    height: 168,
    borderRadius: radius.sheet,
    backgroundColor: colors.surfaceSubtle,
    overflow: 'hidden',
  },
  hRoad: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 78,
    height: 18,
    backgroundColor: colors.border,
  },
  vRoad: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '42%',
    width: 14,
    backgroundColor: colors.border,
  },
  pin: {
    position: 'absolute',
    top: 64,
    left: '42%',
    marginLeft: -7,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.sosAccent,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  choose: { ...type.sectionTitle, color: colors.textStrong, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '47%',
    flexGrow: 1,
    minHeight: 96,
    borderRadius: radius.tile,
    padding: 12,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tileGlyph: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: { ...type.caption, fontWeight: '700', color: colors.textStrong, textAlign: 'center' },
});
