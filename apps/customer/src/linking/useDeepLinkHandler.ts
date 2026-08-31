import { parseDeepLink as parseShared } from '@caratom/contracts';
import type { ApiClient } from '@caratom/api-client';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useRef } from 'react';

import { supabase } from '../lib/supabase';
import { safeReturnTo } from '../lib/safeReturnTo';
import { track } from '../lib/analytics';

export function customerRouteForUrl(url: string): string | null {
  const parsed = parseShared(url);
  if (!parsed) return null;
  if (parsed.entity === 'estimate' && parsed.id) return `/job-card/${parsed.id}/estimate`;
  if (parsed.entity === 'advisor' && parsed.id) return `/job-card/${parsed.id}/advisor-waiting`;
  if (parsed.entity === 'support') return '/sos/pick';
  if (parsed.entity === 'visit') return '/(customer)/(tabs)/orders';
  if (parsed.entity === 'findings' && parsed.id) return `/job-card/${parsed.id}/findings`;
  return parsed.route;
}

export async function handleCustomerDeepLink(
  url: string,
  router: { push: (href: string) => void },
  api: ApiClient,
): Promise<void> {
  const parsed = parseShared(url);
  if (!parsed) return;
  const route = customerRouteForUrl(url);
  if (!route) return;
  const session = await supabase.auth.getSession();
  if (!session.data.session) {
    router.push(`/(auth)/phone?returnTo=${encodeURIComponent(safeReturnTo(route))}`);
    return;
  }
  try {
    if (parsed.entity === 'booking' && parsed.id) {
      await api.getBooking(parsed.id);
    }
    if ((parsed.entity === 'payment' || parsed.entity === 'invoice') && parsed.id) {
      await api.getInvoice(parsed.id);
    }
  } catch {
    // Server ownership 403 lands on the target screen's error state.
  }
  track('notification_opened', { intent: parsed.entity, entity_type: parsed.entity });
  router.push(route);
}

export function useDeepLinkHandler(api: ApiClient) {
  const router = useRouter();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    function onUrl({ url }: { url: string }) {
      if (handled.current === url) return;
      handled.current = url;
      void handleCustomerDeepLink(url, router, api);
    }
    const sub = Linking.addEventListener('url', onUrl);
    void Linking.getInitialURL().then((url) => {
      if (url) onUrl({ url });
    });
    return () => sub.remove();
  }, [api, router]);
}
