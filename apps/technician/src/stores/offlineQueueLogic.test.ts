import {
  dequeueEntry,
  enqueueEntry,
  fifoPending,
  markFailed,
  newEntry,
  pendingCount,
} from './offlineQueueLogic';

let state = { entries: [] as ReturnType<typeof newEntry>[] };

const visit = '550e8400-e29b-41d4-a716-446655440001';
const first = newEntry(visit, 'CHECK_IN', {}, '550e8400-e29b-41d4-a716-446655440010', '2026-08-19T05:00:00.000Z');
const second = newEntry(visit, 'PARTS', {}, '550e8400-e29b-41d4-a716-446655440011', '2026-08-19T05:01:00.000Z');

state = enqueueEntry(state, first);
state = enqueueEntry(state, first);
if (state.entries.length !== 1) throw new Error('same eventId must dedupe');

state = enqueueEntry(state, second);
const order = fifoPending(state).map((row) => row.eventId);
if (order[0] !== first.eventId || order[1] !== second.eventId) {
  throw new Error('drain must be FIFO');
}

state = dequeueEntry(state, first.eventId);
if (pendingCount(state) !== 1) throw new Error('200 path must remove the drained event');

state = markFailed(state, second.eventId, 'validation');
if (state.entries[0]?.status !== 'failed') throw new Error('4xx must mark failed');

console.log('offlineQueueLogic OK');
