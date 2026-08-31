import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { nextSelectedSlugs } from './repairCartLogic';

type RepairCartState = {
  selectedSlugs: string[];
  toggle: (slug: string) => void;
  remove: (slug: string) => void;
  setSelected: (slugs: string[]) => void;
  clear: () => void;
};

export const useRepairCartStore = create<RepairCartState>()(
  persist(
    (set, get) => ({
      selectedSlugs: [],
      toggle: (slug) => {
        set({ selectedSlugs: nextSelectedSlugs(get().selectedSlugs, slug) });
      },
      remove: (slug) =>
        set({ selectedSlugs: get().selectedSlugs.filter((item) => item !== slug) }),
      setSelected: (slugs) => set({ selectedSlugs: slugs }),
      clear: () => set({ selectedSlugs: [] }),
    }),
    {
      name: 'caratom-repair-cart',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
