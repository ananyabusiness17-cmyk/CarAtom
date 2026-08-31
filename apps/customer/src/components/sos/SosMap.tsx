import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, radius } from '../../theme/tokens';
import { MapLibreView } from './MapLibreView';

export function SosMap({
  latitude,
  longitude,
  schematic,
  interactive,
  height = 168,
  onPinMove,
}: {
  latitude: number;
  longitude: number;
  schematic?: boolean;
  interactive?: boolean;
  height?: number;
  onPinMove?: (lat: number, lng: number) => void;
}) {
  if (schematic) {
    return (
      <View style={[styles.map, { height }]} accessibilityLabel="Map schematic, Koramangala">
        <View style={styles.hRoad} />
        <View style={styles.vRoad} />
        <View style={styles.pin} />
        <View style={styles.locate}>
          <Ionicons name="navigate" size={14} color={colors.brandStrong} />
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.map, { height }]} accessibilityLabel="OpenStreetMap, live location">
      <MapLibreView
        latitude={latitude}
        longitude={longitude}
        interactive={interactive}
        onPinMove={onPinMove}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  locate: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
