import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme/tokens';
import { HomeChrome } from './HomeChrome';

type Props = {
  locality: string;
  vehicleLabel: string | null;
  kicker: string;
  title: string;
  onVehiclePress?: () => void;
  onLocationPress?: () => void;
  onNotificationsPress?: () => void;
};

export function HomeMasthead({
  locality,
  vehicleLabel,
  kicker,
  title,
  onVehiclePress,
  onLocationPress,
  onNotificationsPress,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const stageHeight = Math.max(248, Math.round(height * 0.34));

  return (
    <View
      style={[styles.stage, { height: stageHeight, paddingTop: insets.top + 4 }]}
      accessibilityRole="header"
      accessibilityLabel={`${kicker}. ${title}. Video advertisement.`}
    >
      <View style={styles.video} pointerEvents="none" />
      <HomeChrome
        locality={locality}
        vehicleLabel={vehicleLabel}
        onPhoto
        onVehiclePress={onVehiclePress}
        onLocationPress={onLocationPress}
        onNotificationsPress={onNotificationsPress}
      />
      <View style={styles.slot} accessibilityElementsHidden>
        <View style={styles.play}>
          <Ionicons name="play" size={22} color={colors.brandStrong} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    backgroundColor: colors.brandStrong,
  },
  video: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.brandStrong,
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  play: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
  },
});
