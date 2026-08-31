import { nextSosRoute, pollTicketUntilDispatched } from './sosCoordinator';
import type { SupportTicket } from '@caratom/contracts';

if (nextSosRoute('CREATED', 't1') !== '/sos/active?id=t1') {
  throw new Error('CREATED should stay on active');
}
if (nextSosRoute('DISPATCHED_STUB', 't1') !== '/sos/dispatched?id=t1') {
  throw new Error('DISPATCHED_STUB should go to dispatched');
}
if (nextSosRoute('CANCELLED', 't1') !== '/(customer)/(tabs)/home') {
  throw new Error('CANCELLED should return home');
}

function ticket(status: string): SupportTicket {
  return {
    id: 't1',
    public_ref: 'ST-7001',
    status,
    ticket_type: 'ROADSIDE',
    issue_code: 'FLAT_TYRE',
    issue_label: 'Flat tyre',
    allowed_actions: [],
    created_at: new Date().toISOString(),
  };
}

async function main() {
  let calls = 0;
  const controller = new AbortController();
  const result = await pollTicketUntilDispatched(
    async () => {
      calls += 1;
      if (calls === 1) return ticket('CREATED');
      return ticket('DISPATCHED_STUB');
    },
    't1',
    controller.signal,
    1,
  );
  if (result.status !== 'DISPATCHED_STUB' || calls !== 2) {
    throw new Error(`poll finished with ${result.status} after ${calls} calls`);
  }

  const abort = new AbortController();
  abort.abort();
  let aborted = false;
  try {
    await pollTicketUntilDispatched(async () => ticket('CREATED'), 't1', abort.signal, 1);
  } catch (err) {
    aborted = err instanceof Error && err.name === 'AbortError';
  }
  if (!aborted) {
    throw new Error('poll must stop when aborted');
  }

  console.log('sosCoordinator OK');
}

void main();
