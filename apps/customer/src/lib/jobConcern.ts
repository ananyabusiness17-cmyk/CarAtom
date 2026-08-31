export function concernForKind(kind: 'gs' | 'gpr' | 'ir', symptoms?: string): string {
  if (kind === 'ir') return symptoms?.trim() || 'Please inspect';
  if (kind === 'gpr') return 'Service plus selected repairs';
  return 'General service requested';
}
