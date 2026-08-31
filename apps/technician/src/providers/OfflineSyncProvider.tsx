import { ApiError } from '@caratom/api-client';
import type { InspectionFindingsSubmit, OfflineQueueEntry } from '@caratom/contracts';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';

import { technicianApi } from '../lib/api';
import { track } from '../lib/analytics';
import { useOfflineQueueStore } from '../stores/offlineQueueStore';

async function replay(entry: OfflineQueueEntry): Promise<void> {
  const { visitId, kind, payload, eventId } = entry;
  switch (kind) {
    case 'EN_ROUTE':
      await technicianApi.enRoute(visitId, eventId, payload as { lat?: number; lng?: number });
      return;
    case 'CHECK_IN':
      await technicianApi.checkIn(
        visitId,
        eventId,
        payload as { lat?: number; lng?: number; accuracy_m?: number },
      );
      return;
    case 'START_INSPECTION':
      await technicianApi.startInspection(visitId, eventId);
      return;
    case 'START_SERVICE':
      await technicianApi.startService(visitId, eventId);
      return;
    case 'INSPECTION_FINDINGS':
      await technicianApi.inspectionFindings(visitId, payload as InspectionFindingsSubmit, eventId);
      return;
    case 'PARTS':
      await technicianApi.parts(visitId, payload as { lines: never[] }, eventId);
      return;
    case 'LABOUR':
      await technicianApi.labour(visitId, payload as { entries: never[] }, eventId);
      return;
    case 'QC':
      await technicianApi.qc(visitId, payload as { items: never[]; passed: boolean }, eventId);
      return;
    case 'COMPLETE':
      await technicianApi.complete(visitId, eventId);
      return;
    case 'EXCEPTION':
      await technicianApi.exception(
        visitId,
        payload as { summary: string; requested_action: string; media_asset_ids?: string[] },
        eventId,
      );
      return;
    case 'SCOPE_PROGRESS':
      await technicianApi.scopeProgress(
        visitId,
        payload as { line_id: string; status: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'NOT_APPLICABLE' },
        eventId,
      );
      return;
    case 'LOCATION_PING':
      await technicianApi.locationPing({
        visit_id: visitId,
        lat: Number(payload.lat),
        lng: Number(payload.lng),
        accuracy_m: payload.accuracy_m == null ? undefined : Number(payload.accuracy_m),
        recorded_at: String(payload.recorded_at ?? new Date().toISOString()),
        client_event_id: eventId,
        force: Boolean(payload.force),
      });
      return;
    case 'UPLOAD_INTENT':
      return;
    default:
      return;
  }
}

export async function drainQueue(): Promise<void> {
  const store = useOfflineQueueStore.getState();
  const pending = store.listPending();
  for (const entry of pending) {
    try {
      await replay(entry);
      await store.dequeue(entry.eventId);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      if (status === 409) {
        await store.dequeue(entry.eventId);
        continue;
      }
      if (status === 429) {
        break;
      }
      if (status >= 400 && status < 500 && status !== 409) {
        await store.fail(entry.eventId, err instanceof Error ? err.message : 'Request failed');
        continue;
      }
      break;
    }
  }
  if (pending.length > 0 && useOfflineQueueStore.getState().countPending() === 0) {
    track('offline_queue_drained');
  }
}

export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  const hydrate = useOfflineQueueStore((s) => s.hydrate);
  const queryClient = useQueryClient();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        void drainQueue().then(() => {
          void queryClient.invalidateQueries({ queryKey: ['technician'] });
        });
      }
    });
    return () => unsub();
  }, [queryClient]);

  return children;
}
