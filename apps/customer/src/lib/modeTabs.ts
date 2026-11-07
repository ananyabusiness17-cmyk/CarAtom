export const MODE_TABS = [
  {
    id: 'repair',
    label: 'General service + add-ons',
    folderLines: ['General service', '+ add-ons'],
    icon: 'construct-outline',
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
    throw new Error('General service + add-ons must not be labeled Inspect + repair');
  }
  if (MODE_TABS[0]?.label !== 'General service + add-ons') {
    throw new Error('General service + add-ons must be the first folder tab');
  }
}
