import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StackBackButton } from './StackBackButton';
import { colors, type } from '../theme/tokens';

/** JS header so the chevron receives presses (native-stack headerLeft often swallows them). */
export function FlowStackHeader({ title }: { title?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top }]}>
      <StackBackButton />
      <Text style={styles.title} numberOfLines={1}>
        {title ?? ''}
      </Text>
    </View>
  );
}

export const flowStackScreenOptions = {
  header: ({ options }: { options: { title?: string } }) => (
    <FlowStackHeader title={options.title} />
  ),
  contentStyle: { backgroundColor: colors.canvas },
  gestureEnabled: true,
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 8,
    paddingBottom: 4,
    backgroundColor: colors.canvas,
    gap: 4,
  },
  title: { ...type.navTitle, color: colors.textStrong, flex: 1, paddingRight: 44 },
});
