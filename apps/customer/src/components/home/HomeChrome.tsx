import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, type } from '../../theme/tokens';

type Props = {
  locality: string;
  vehicleLabel: string | null;
  onPhoto?: boolean;
  onVehiclePress?: () => void;
  onLocationPress?: () => void;
  onNotificationsPress?: () => void;
};

export function HomeChrome({
  locality,
  vehicleLabel,
  onPhoto = false,
  onVehiclePress,
  onLocationPress,
  onNotificationsPress,
}: Props) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Service at ${locality}`}
        onPress={onLocationPress ?? (() => Alert.alert('Address', 'Choose a saved address from Profile.'))}
        style={styles.location}
      >
        <Ionicons
          name="location-sharp"
          size={18}
          color={onPhoto ? colors.surface : colors.brandStrong}
        />
        <View style={styles.locCopy}>
          <Text style={[styles.locLabel, onPhoto && styles.onPhotoMuted]}>Service at</Text>
          <Text numberOfLines={1} style={[styles.locValue, onPhoto && styles.onPhotoStrong]}>
            {locality}
            <Text style={[styles.chevron, onPhoto && styles.onPhotoMuted]}>  ▾</Text>
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={vehicleLabel ? `Vehicle ${vehicleLabel}` : 'Add your car'}
        onPress={
          onVehiclePress ??
          (() => Alert.alert('Vehicle', 'Choose a vehicle from the home flow.'))
        }
        style={[styles.pill, onPhoto ? styles.pillOnPhoto : null, vehicleLabel ? styles.pillSelected : null]}
      >
        <View style={styles.carMark}>
          <Ionicons name="car-sport" size={16} color={colors.brandStrong} />
        </View>
        <View style={styles.pillCopy}>
          <Text style={styles.pillKicker}>Your car</Text>
          <Text numberOfLines={1} style={styles.pillText}>
            {vehicleLabel ?? 'Add vehicle'}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        onPress={onNotificationsPress}
        style={styles.bell}
      >
        <Ionicons
          name="notifications-outline"
          size={22}
          color={onPhoto ? colors.surface : colors.brandStrong}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 12,
  },
  location: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locCopy: { flex: 1 },
  locLabel: { ...type.label, color: colors.textMuted },
  locValue: { ...type.sectionTitle, color: colors.textStrong },
  chevron: { ...type.caption, color: colors.textMuted },
  onPhotoMuted: {
    color: 'rgba(255,255,255,0.82)',
    textShadowColor: 'rgba(20,37,50,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  onPhotoStrong: {
    color: colors.surface,
    textShadowColor: 'rgba(20,37,50,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 152,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.tile,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 44,
    gap: 8,
  },
  pillOnPhoto: {
    borderWidth: 0,
    shadowColor: colors.textStrong,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  pillSelected: {
    borderWidth: 1.5,
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  carMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillCopy: { flexShrink: 1 },
  pillKicker: { ...type.label, color: colors.textMuted },
  pillText: {
    ...type.caption,
    fontWeight: '700',
    color: colors.textStrong,
  },
  bell: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
