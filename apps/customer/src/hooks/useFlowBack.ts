import { useNavigation, usePathname, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { firstParam } from '../lib/routeParam';
import { safeReturnTo } from '../lib/safeReturnTo';
import { CUSTOMER_HOME, leaveStack, type BackCapableNav } from '../lib/stackBack';
import { passAlongParams, previousVehiclePath } from '../lib/vehicleNav';

export function useFlowBack(fallback = CUSTOMER_HOME) {
  const router = useRouter();
  const navigation = useNavigation();
  const pathname = usePathname();
  const params = useLocalSearchParams<{
    returnTo?: string;
    offering?: string;
    flow?: string;
    intent?: string;
  }>();
  const target = params.returnTo ? safeReturnTo(firstParam(params.returnTo)) : fallback;

  return useCallback(() => {
    const prev = previousVehiclePath(pathname);
    if (prev) {
      router.replace({
        pathname: prev,
        params: passAlongParams(
          {
            offering: firstParam(params.offering) || undefined,
            flow: firstParam(params.flow) || undefined,
            intent: firstParam(params.intent) || undefined,
          },
          firstParam(params.returnTo) || undefined,
        ),
      });
      return;
    }
    leaveStack(
      navigation as BackCapableNav,
      (href) => router.replace(href),
      target,
      () => router.back(),
    );
  }, [
    navigation,
    params.flow,
    params.intent,
    params.offering,
    params.returnTo,
    pathname,
    router,
    target,
  ]);
}
