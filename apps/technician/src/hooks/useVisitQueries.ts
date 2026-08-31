import { useQuery } from '@tanstack/react-query';

import { technicianApi } from '../lib/api';
import { todayIstDate } from '../lib/istDate';

export function technicianKeys() {
  return {
    visits: (date: string) => ['technician', 'visits', date] as const,
    visit: (id: string) => ['technician', 'visit', id] as const,
    me: ['technician', 'me'] as const,
  };
}

export function useTodayVisits(date = todayIstDate()) {
  return useQuery({
    queryKey: technicianKeys().visits(date),
    queryFn: () => technicianApi.listVisits(date),
  });
}

export function useVisitDetail(id: string | undefined) {
  return useQuery({
    queryKey: technicianKeys().visit(id ?? ''),
    queryFn: () => technicianApi.getVisit(id!),
    enabled: Boolean(id),
  });
}

export function useTechnicianMe() {
  return useQuery({
    queryKey: technicianKeys().me,
    queryFn: () => technicianApi.me(),
  });
}
