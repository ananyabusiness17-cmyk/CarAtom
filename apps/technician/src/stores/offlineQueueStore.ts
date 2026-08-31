import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OfflineQueueEntry, OfflineQueueKind } from '@caratom/contracts';
import { create } from 'zustand';

import {
  dequeueEntry,
  enqueueEntry,
  failedEntries,
  fifoPending,
  markFailed,
  newEntry,
  pendingCount,
  type QueueState,
} from './offlineQueueLogic';

const STORAGE_KEY = 'caratom.tech.offline-queue.v1';

type OfflineStore = QueueState & {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  enqueue: (
    visitId: string,
    kind: OfflineQueueKind,
    payload: Record<string, unknown>,
    eventId: string,
  ) => Promise<void>;
  dequeue: (eventId: string) => Promise<void>;
  fail: (eventId: string, error: string) => Promise<void>;
  retry: (eventId: string) => Promise<void>;
  countPending: () => number;
  listFailed: () => OfflineQueueEntry[];
  listPending: () => OfflineQueueEntry[];
};

async function persist(entries: OfflineQueueEntry[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, entries }));
}

export const useOfflineQueueStore = create<OfflineStore>((set, get) => ({
  entries: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { entries?: OfflineQueueEntry[] };
        set({ entries: parsed.entries ?? [], hydrated: true });
        return;
      }
    } catch {
      // Keep empty queue if storage is corrupt.
    }
    set({ hydrated: true });
  },
  enqueue: async (visitId, kind, payload, eventId) => {
    const next = enqueueEntry(get(), newEntry(visitId, kind, payload, eventId));
    await persist(next.entries);
    set(next);
  },
  dequeue: async (eventId) => {
    const next = dequeueEntry(get(), eventId);
    await persist(next.entries);
    set(next);
  },
  fail: async (eventId, error) => {
    const next = markFailed(get(), eventId, error);
    await persist(next.entries);
    set(next);
  },
  retry: async (eventId) => {
    const next = {
      entries: get().entries.map((row) =>
        row.eventId === eventId ? { ...row, status: 'pending' as const, error: null } : row,
      ),
    };
    await persist(next.entries);
    set(next);
  },
  countPending: () => pendingCount(get()),
  listFailed: () => failedEntries(get()),
  listPending: () => fifoPending(get()),
}));
