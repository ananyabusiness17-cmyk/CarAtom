import { useInfiniteQuery } from '@tanstack/react-query';

import { apiClient } from '../lib/api';

export type JobBoardFilters = {
  status?: string;
  technician_id?: string;
  area_slug?: string;
  needs_dispatch?: boolean;
};

export function useAdminJobBoard(filters: JobBoardFilters) {
  return useInfiniteQuery({
    queryKey: ['admin', 'job-board', filters],
    queryFn: ({ pageParam }) =>
      apiClient.listJobBoard({
        cursor: pageParam,
        limit: 20,
        ...filters,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    staleTime: 30_000,
  });
}
