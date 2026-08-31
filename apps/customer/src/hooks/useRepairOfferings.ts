import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '../coordinators/serviceRepairCoordinator';
import { apiClient } from '../lib/api';

export function useRepairOfferings() {
  return useQuery({
    queryKey: queryKeys.repairOfferings({}),
    queryFn: () => apiClient.getRepairOfferings(),
  });
}
