import type { OverrideLiteRequest } from '@caratom/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../lib/api';
import { newIdempotencyKey } from '../lib/formatMoney';

export function useOverrideLite(jobCardId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: OverrideLiteRequest) => {
      if (!jobCardId) throw new Error('Missing job');
      return apiClient.applyAdminOverride(
        jobCardId,
        body as Record<string, unknown>,
        newIdempotencyKey(`override-${jobCardId}`),
      );
    },
    onSuccess: async () => {
      if (!jobCardId) return;
      await Promise.all([
        client.invalidateQueries({ queryKey: ['admin', 'job-board'] }),
        client.invalidateQueries({ queryKey: ['admin', 'dispatch'] }),
        client.invalidateQueries({ queryKey: ['admin', 'job-card', jobCardId] }),
      ]);
    },
  });
}
