export function technicianGateMessage(role: string | null | undefined): string | null {
  if (!role) return 'Sign in with a technician account to open today’s jobs.';
  if (role !== 'technician') {
    return 'This app is for field technicians. A customer or admin account cannot open the jobs list.';
  }
  return null;
}
