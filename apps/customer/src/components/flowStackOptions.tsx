import { StackBackButton } from './StackBackButton';
import { nestedStackHasHistory, type BackCapableNav } from '../lib/stackBack';
import { colors } from '../theme/tokens';

export const flowStackScreenOptions = ({ navigation }: { navigation: BackCapableNav }) => ({
  headerTintColor: colors.textStrong,
  headerStyle: { backgroundColor: colors.canvas },
  contentStyle: { backgroundColor: colors.canvas },
  headerShadowVisible: false,
  headerBackVisible: false,
  gestureEnabled:
    nestedStackHasHistory(navigation.getState?.()) || Boolean(navigation.getParent()?.canGoBack()),
  headerLeft: () => <StackBackButton navigation={navigation} />,
});
