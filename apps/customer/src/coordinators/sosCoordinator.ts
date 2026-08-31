import type { SupportTicket } from '@caratom/contracts';

export const sosQueryKeys = {
  ticket: (id: string) => ['support-ticket', id] as const,
  tickets: ['support-tickets'] as const,
};

export function nextSosRoute(status: string, ticketId: string): string {
  if (status === 'DISPATCHED_STUB' || status === 'CLOSED') {
    return `/sos/dispatched?id=${ticketId}`;
  }
  if (status === 'CANCELLED') {
    return '/(customer)/(tabs)/home';
  }
  return `/sos/active?id=${ticketId}`;
}

export async function pollTicketUntilDispatched(
  getTicket: (id: string) => Promise<SupportTicket>,
  ticketId: string,
  signal: AbortSignal,
  intervalMs = 3000,
): Promise<SupportTicket> {
  while (!signal.aborted) {
    const ticket = await getTicket(ticketId);
    if (ticket.status === 'DISPATCHED_STUB' || ticket.status === 'CLOSED' || ticket.status === 'CANCELLED') {
      return ticket;
    }
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, intervalMs);
      const onAbort = () => {
        clearTimeout(timer);
        reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
      };
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
    });
  }
  throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
}
