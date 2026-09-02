import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RepairsCartScreen } from '../../src/components/RepairsCartScreen';
import { StackBackButton } from '../../src/components/StackBackButton';
import { useEscapeBack } from '../../src/hooks/useEscapeBack';
import { colors, type } from '../../src/theme/tokens';

export default function EntryRepairsCart() {
  useEscapeBack();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <StackBackButton />
        <Text style={styles.title}>Repairs cart</Text>
      </View>
      <RepairsCartScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 8,
    gap: 4,
  },
  title: { ...type.navTitle, color: colors.textStrong, flex: 1 },
});
