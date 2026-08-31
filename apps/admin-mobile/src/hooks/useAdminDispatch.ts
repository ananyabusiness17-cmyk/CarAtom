import { useQuery } from '@tanstack/react-query';

import { apiClient } from '../lib/api';

export function useAdminDispatch() {
  return useQuery({
    queryKey: ['admin', 'dispatch'],
    queryFn: () => apiClient.getDispatchBoard(),
    staleTime: 30_000,
  });
}
