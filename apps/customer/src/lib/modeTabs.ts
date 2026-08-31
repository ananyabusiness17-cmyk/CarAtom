export const MODE_TABS = [
  {
    id: 'repair',
    label: 'General service + repair',
    folderLines: ['General service', '+ repair'],
    icon: 'construct-outline',
    sos: false,
  },
  {
    id: 'general',
    label: 'General service',
    folderLines: ['General', 'service'],
    icon: 'car-outline',
    sos: false,
  },
  {
    id: 'oneman',
    label: 'One-man job',
    folderLines: ['One-man', 'job'],
    icon: 'flash-outline',
    sos: false,
  },
  {
    id: 'sos',
    label: 'SOS',
    folderLines: ['SOS'],
    icon: 'warning-outline',
    sos: true,
  },
] as const;

export type ModeTabId = (typeof MODE_TABS)[number]['id'];

export function assertGlossary(): void {
  const labels = MODE_TABS.map((tab) => tab.label);
  if (labels.some((label) => /inspect/i.test(label))) {
    throw new Error('General service + repair must not be labeled Inspect + repair');
  }
  if (MODE_TABS[0]?.label !== 'General service + repair') {
    throw new Error('General service + repair must be the first folder tab');
  }
}
