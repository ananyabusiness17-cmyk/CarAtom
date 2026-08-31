import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '../coordinators/serviceRepairCoordinator';
import { apiClient } from '../lib/api';

const TERMINAL = ['CONFIRMED', 'DECLINED', 'CANCELLED', 'UNREACHABLE'];

export function useAdvisorCasePoll(jobCardId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.advisorCase(jobCardId),
    queryFn: () => apiClient.getAdvisorCase(jobCardId),
    enabled: Boolean(jobCardId) && enabled,
    refetchInterval: (query) => {
      if (!enabled) return false;
      const status = query.state.data?.advisor_case.status;
      if (!status) return 3000;
      if (TERMINAL.includes(status) || status === 'CUSTOMER_CONFIRMATION_DUE') return false;
      return 3000;
    },
  });
}
