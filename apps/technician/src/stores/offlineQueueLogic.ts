import type { OfflineQueueEntry, OfflineQueueKind } from '@caratom/contracts';

export type QueueState = {
  entries: OfflineQueueEntry[];
};

export function enqueueEntry(state: QueueState, entry: OfflineQueueEntry): QueueState {
  if (state.entries.some((row) => row.eventId === entry.eventId)) {
    return state;
  }
  return { entries: [...state.entries, entry] };
}

export function dequeueEntry(state: QueueState, eventId: string): QueueState {
  return { entries: state.entries.filter((row) => row.eventId !== eventId) };
}

export function markFailed(state: QueueState, eventId: string, error: string): QueueState {
  return {
    entries: state.entries.map((row) =>
      row.eventId === eventId ? { ...row, status: 'failed' as const, error } : row,
    ),
  };
}

export function pendingCount(state: QueueState): number {
  return state.entries.filter((row) => row.status === 'pending').length;
}

export function failedEntries(state: QueueState): OfflineQueueEntry[] {
  return state.entries.filter((row) => row.status === 'failed');
}

export function fifoPending(state: QueueState): OfflineQueueEntry[] {
  return [...state.entries]
    .filter((row) => row.status === 'pending')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.visitId.localeCompare(b.visitId));
}

export function newEntry(
  visitId: string,
  kind: OfflineQueueKind,
  payload: Record<string, unknown>,
  eventId: string,
  createdAt = new Date().toISOString(),
): OfflineQueueEntry {
  return { eventId, visitId, kind, payload, createdAt, status: 'pending' };
}
