import type { AdminJobCard } from '@caratom/contracts';
import { create } from 'zustand';

export type EditableLine = {
  key: string;
  kind: string;
  label: string;
  repair_offering_slug?: string | null;
  amount_minor: number;
};

/** Walkthrough JC-1042 sample. Never seed production drafts from this. */
export const DEMO_PUBLISH_LINES: EditableLine[] = [
  {
    key: 'svc',
    kind: 'SERVICE',
    label: 'General service + health report',
    amount_minor: 299900,
  },
  {
    key: 'ac',
    kind: 'REPAIR',
    label: 'AC gas refill',
    repair_offering_slug: 'ac-gas-refill',
    amount_minor: 120000,
  },
  {
    key: 'pads',
    kind: 'REPAIR',
    label: 'Brake pads (pair)',
    repair_offering_slug: 'brake-pads-pair',
    amount_minor: 220000,
  },
  {
    key: 'flush',
    kind: 'REPAIR',
    label: 'Brake fluid flush',
    amount_minor: 45000,
  },
];

export function linesFromAdminJob(job: AdminJobCard): EditableLine[] {
  const estimateLines = job.submitted_estimate?.line_items ?? [];
  if (estimateLines.length > 0) {
    return estimateLines.map((line, index) => ({
      key: `${line.kind}-${line.repair_offering_slug ?? line.label}-${index}`,
      kind: line.kind,
      label: line.label,
      repair_offering_slug: line.repair_offering_slug ?? null,
      amount_minor: line.amount_minor,
    }));
  }
  return (job.job_card.items ?? []).map((item) => ({
    key: item.id,
    kind: item.kind,
    label: item.label,
    repair_offering_slug: item.repair_offering_slug ?? null,
    amount_minor: item.unit_price_minor,
  }));
}

type DraftState = {
  jobCardId: string | null;
  advisorCaseId: string | null;
  customerName: string;
  lines: EditableLine[];
  setDraft: (next: Omit<DraftState, 'setDraft' | 'clear' | 'addLine' | 'removeLine' | 'updateAmount'>) => void;
  addLine: (line: EditableLine) => void;
  removeLine: (key: string) => void;
  updateAmount: (key: string, amountMinor: number) => void;
  clear: () => void;
};

export const useEstimateDraftStore = create<DraftState>((set) => ({
  jobCardId: null,
  advisorCaseId: null,
  customerName: 'Customer',
  lines: [],
  setDraft: (next) => set(next),
  addLine: (line) => set((state) => ({ lines: [...state.lines, line] })),
  removeLine: (key) => set((state) => ({ lines: state.lines.filter((line) => line.key !== key) })),
  updateAmount: (key, amountMinor) =>
    set((state) => ({
      lines: state.lines.map((line) => (line.key === key ? { ...line, amount_minor: amountMinor } : line)),
    })),
  clear: () =>
    set({
      jobCardId: null,
      advisorCaseId: null,
      customerName: 'Customer',
      lines: [],
    }),
}));
