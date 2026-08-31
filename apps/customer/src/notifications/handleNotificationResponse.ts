import type { ApiClient } from '@caratom/api-client';

import { handleCustomerDeepLink } from '../linking/useDeepLinkHandler';

export function subscribeNotificationResponses(
  api: ApiClient,
  router: { push: (href: string) => void },
): () => void {
  let remove: () => void = () => undefined;
  void import('expo-notifications')
    .then((Notifications) => {
      const sub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as Record<string, string>;
        const path = data.deep_link_path;
        if (path) void handleCustomerDeepLink(path, router, api);
      });
      remove = () => sub.remove();
    })
    .catch(() => undefined);
  return () => remove();
}
