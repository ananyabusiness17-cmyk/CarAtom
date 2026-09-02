import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  CART_QTY_MAX,
  clampCartQty,
  quantitiesFromSlugs,
  slugsFromQuantities,
} from './repairCartLogic';

type RepairCartState = {
  quantities: Record<string, number>;
  selectedSlugs: string[];
  qty: (slug: string) => number;
  increment: (slug: string) => void;
  decrement: (slug: string) => void;
  toggle: (slug: string) => void;
  remove: (slug: string) => void;
  setSelected: (slugs: string[]) => void;
  setQuantities: (quantities: Record<string, number>) => void;
  clear: () => void;
};

function withSlugs(quantities: Record<string, number>): Pick<RepairCartState, 'quantities' | 'selectedSlugs'> {
  const next: Record<string, number> = {};
  for (const [slug, value] of Object.entries(quantities)) {
    const qty = clampCartQty(value);
    if (qty > 0) next[slug] = qty;
  }
  return { quantities: next, selectedSlugs: slugsFromQuantities(next) };
}

export const useRepairCartStore = create<RepairCartState>()(
  persist(
    (set, get) => ({
      quantities: {},
      selectedSlugs: [],
      qty: (slug) => get().quantities[slug] ?? 0,
      increment: (slug) => {
        const current = get().quantities[slug] ?? 0;
        if (current >= CART_QTY_MAX) return;
        set(withSlugs({ ...get().quantities, [slug]: current + 1 }));
      },
      decrement: (slug) => {
        const current = get().quantities[slug] ?? 0;
        if (current <= 0) return;
        set(withSlugs({ ...get().quantities, [slug]: current - 1 }));
      },
      toggle: (slug) => {
        if ((get().quantities[slug] ?? 0) > 0) {
          get().remove(slug);
          return;
        }
        get().increment(slug);
      },
      remove: (slug) => {
        const next = { ...get().quantities };
        delete next[slug];
        set(withSlugs(next));
      },
      setSelected: (slugs) => set(withSlugs(quantitiesFromSlugs(slugs))),
      setQuantities: (quantities) => set(withSlugs(quantities)),
      clear: () => set({ quantities: {}, selectedSlugs: [] }),
    }),
    {
      name: 'caratom-repair-cart',
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persisted, current) => {
        const raw = persisted as Partial<RepairCartState> | undefined;
        if (raw?.quantities && Object.keys(raw.quantities).length > 0) {
          return { ...current, ...withSlugs(raw.quantities) };
        }
        if (raw?.selectedSlugs?.length) {
          return { ...current, ...withSlugs(quantitiesFromSlugs(raw.selectedSlugs)) };
        }
        return current;
      },
    },
  ),
);
