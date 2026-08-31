import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { BackHandler, Platform } from 'react-native';

import { CUSTOMER_HOME, leaveStack } from '../lib/stackBack';

/** Android hardware back: pop nested, then parent, then home. iOS uses the header back button. */
export function useEscapeBack(fallback = CUSTOMER_HOME): void {
  const navigation = useNavigation();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return undefined;
      const onBack = () => {
        leaveStack(navigation, (href) => router.replace(href), fallback);
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [fallback, navigation, router]),
  );
}
