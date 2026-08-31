import { parseDeepLink as parseShared } from '@caratom/contracts';
import type { ApiClient } from '@caratom/api-client';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useRef } from 'react';

import { supabase } from '../lib/supabase';
import { safeReturnTo } from '../lib/safeReturnTo';
import { track } from '../lib/analytics';

export function technicianRouteForUrl(url: string): string | null {
  const parsed = parseShared(url);
  if (!parsed) return null;
  if (parsed.entity === 'visit' && parsed.id) return `/(tech)/visits/${parsed.id}`;
  if (parsed.entity === 'notifications') return '/(tech)/notifications';
  return parsed.route;
}

export async function handleTechnicianDeepLink(
  url: string,
  router: { push: (href: string) => void },
  api: ApiClient,
): Promise<void> {
  const parsed = parseShared(url);
  if (!parsed) return;
  const route = technicianRouteForUrl(url);
  if (!route) return;
  const session = await supabase.auth.getSession();
  if (!session.data.session) {
    router.push(`/(auth)/phone?returnTo=${encodeURIComponent(safeReturnTo(route))}`);
    return;
  }
  try {
    if (parsed.entity === 'visit' && parsed.id) {
      await api.getTechnicianVisit(parsed.id);
    }
  } catch {
    // 403 lands on the visit screen error state.
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
      void handleTechnicianDeepLink(url, router, api);
    }
    const sub = Linking.addEventListener('url', onUrl);
    void Linking.getInitialURL().then((url) => {
      if (url) onUrl({ url });
    });
    return () => sub.remove();
  }, [api, router]);
}
