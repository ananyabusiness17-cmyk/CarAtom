import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  emptyVehicleDraft,
  withDemoDefaults,
  type FuelType,
  type Transmission,
  type VehicleDraft,
} from '../lib/vehicleDraft';

type VehicleDraftState = VehicleDraft & {
  setMake: (makeId: string, make: string) => void;
  setModel: (model: string) => void;
  setYear: (year: number) => void;
  setFuel: (fuelType: FuelType) => void;
  setTransmission: (transmission: Transmission) => void;
  applyVehicle: (next: VehicleDraft) => void;
  applyDemoDefaults: () => void;
  clear: () => void;
};

export const useVehicleDraftStore = create<VehicleDraftState>()(
  persist(
    (set) => ({
      ...emptyVehicleDraft,
      setMake: (makeId, make) =>
        set({
          makeId,
          make,
          model: null,
          year: null,
          fuelType: null,
          transmission: 'MANUAL',
        }),
      setModel: (model) => set({ model }),
      setYear: (year) => set({ year }),
      setFuel: (fuelType) => set({ fuelType }),
      setTransmission: (transmission) => set({ transmission }),
      applyVehicle: (next) => set(next),
      applyDemoDefaults: () => set((state) => withDemoDefaults(state)),
      clear: () => set(emptyVehicleDraft),
    }),
    {
      name: 'caratom-vehicle-draft',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        make: state.make,
        makeId: state.makeId,
        model: state.model,
        year: state.year,
        fuelType: state.fuelType,
        transmission: state.transmission,
      }),
    },
  ),
);
