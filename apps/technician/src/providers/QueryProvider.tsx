import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === 'active');
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
          },
        },
      }),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
