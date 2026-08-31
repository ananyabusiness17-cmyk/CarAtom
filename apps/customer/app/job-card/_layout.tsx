import { Slot } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { colors } from '../../src/theme/tokens';

/** Slot (not Stack) so GS job-card/[id] is not stacked on top of the repairs cart. */
export default function JobCardGroupLayout() {
  return (
    <View style={styles.screen}>
      <Slot />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
});
