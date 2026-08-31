import type { OfflineQueueKind, QcItem, TechnicianScopeLine, TechnicianVisitDetail } from '@caratom/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { track } from '../lib/analytics';
import { newEventId } from '../lib/ids';
import { drainQueue } from '../providers/OfflineSyncProvider';
import { useOfflineQueueStore } from '../stores/offlineQueueStore';
import { technicianKeys } from './useVisitQueries';

export function useVisitMutations(visitId: string) {
  const queryClient = useQueryClient();
  const enqueue = useOfflineQueueStore((s) => s.enqueue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: OfflineQueueKind, payload: Record<string, unknown>): Promise<void> {
    const eventId = newEventId();
    setError(null);
    await enqueue(visitId, kind, payload, eventId);
    track('offline_event_enqueued', { kind });
    setBusy(true);
    try {
      await drainQueue();
      await queryClient.invalidateQueries({ queryKey: ['technician'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sync this change.');
    } finally {
      setBusy(false);
    }
  }

  function patchScope(lineId: string, status: TechnicianScopeLine['status']) {
    queryClient.setQueryData<TechnicianVisitDetail>(technicianKeys().visit(visitId), (current) => {
      if (!current) return current;
      return {
        ...current,
        scope_lines: current.scope_lines.map((line) => (line.id === lineId ? { ...line, status } : line)),
      };
    });
  }

  return {
    busy,
    error,
    enRoute: (payload: Record<string, unknown> = {}) => run('EN_ROUTE', payload),
    checkIn: (payload: Record<string, unknown> = {}) => run('CHECK_IN', payload),
    startInspection: () => run('START_INSPECTION', {}),
    startService: () => run('START_SERVICE', {}),
    inspectionFindings: (payload: Record<string, unknown>) => run('INSPECTION_FINDINGS', payload),
    parts: (payload: Record<string, unknown>) => run('PARTS', payload),
    qc: (items: QcItem[], passed: boolean) => run('QC', { items, passed }),
    complete: () => run('COMPLETE', {}),
    exception: (payload: Record<string, unknown>) => run('EXCEPTION', payload),
    scopeProgress: async (line: TechnicianScopeLine) => {
      await enqueue(visitId, 'SCOPE_PROGRESS', { line_id: line.id, status: line.status }, newEventId());
      patchScope(line.id, line.status);
      setBusy(true);
      try {
        await drainQueue();
        await queryClient.invalidateQueries({ queryKey: ['technician'] });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not sync this change.');
      } finally {
        setBusy(false);
      }
    },
    locationPing: (payload: Record<string, unknown>) => run('LOCATION_PING', payload),
  };
}
