export function adminGateMessage(role: string | null | undefined): string | null {
  if (!role) return 'Sign in with an admin account to open field ops.';
  if (role !== 'admin') {
    return 'This app is for CARATOM admins. A customer or technician account cannot open the board, dispatch, or inbox.';
  }
  return null;
}
