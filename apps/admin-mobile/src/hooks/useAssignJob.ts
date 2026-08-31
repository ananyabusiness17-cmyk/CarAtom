import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../lib/api';
import { newIdempotencyKey } from '../lib/formatMoney';

export function useAssignJob() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { jobCardId: string; technicianId: string; reason?: string }) =>
      apiClient.assignJob(
        input.jobCardId,
        { technician_id: input.technicianId, reason: input.reason },
        newIdempotencyKey(`assign-${input.jobCardId}`),
      ),
    onSuccess: async (_data, input) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['admin', 'job-board'] }),
        client.invalidateQueries({ queryKey: ['admin', 'dispatch'] }),
        client.invalidateQueries({ queryKey: ['admin', 'job-card', input.jobCardId] }),
      ]);
    },
  });
}
