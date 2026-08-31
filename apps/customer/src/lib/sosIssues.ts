export const SOS_ISSUES = [
  {
    code: 'FLAT_TYRE',
    tileId: 'flat_tyre',
    label: 'Flat tyre',
    subtitle: "Can't drive · need roadside",
  },
  {
    code: 'DEAD_BATTERY',
    tileId: 'dead_battery',
    label: 'Dead battery',
    subtitle: "Car won't start",
  },
  {
    code: 'TOW',
    tileId: 'tow',
    label: 'Need a tow',
    subtitle: 'Move vehicle safely',
  },
  {
    code: 'OUT_OF_FUEL',
    tileId: 'out_of_fuel',
    label: 'Out of fuel',
    subtitle: 'Fuel delivery or tow',
  },
  {
    code: 'CALL_OPS',
    tileId: 'call_ops',
    label: 'Call ops',
    subtitle: 'Talk to CARATOM ops',
  },
] as const;

export type SosIssueCode = (typeof SOS_ISSUES)[number]['code'];

export function issueFromTile(tileId?: string | string[]): (typeof SOS_ISSUES)[number] | undefined {
  const id = Array.isArray(tileId) ? tileId[0] : tileId;
  if (!id) return undefined;
  return SOS_ISSUES.find((issue) => issue.tileId === id || issue.code === id.toUpperCase());
}
