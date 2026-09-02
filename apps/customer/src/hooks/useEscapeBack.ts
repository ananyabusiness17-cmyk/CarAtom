import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { BackHandler, Platform } from 'react-native';

import { CUSTOMER_HOME } from '../lib/stackBack';
import { useFlowBack } from './useFlowBack';

/** Android hardware back uses the same path as the header chevron. */
export function useEscapeBack(fallback = CUSTOMER_HOME): void {
  const onBack = useFlowBack(fallback);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return undefined;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        onBack();
        return true;
      });
      return () => sub.remove();
    }, [onBack]),
  );
}
