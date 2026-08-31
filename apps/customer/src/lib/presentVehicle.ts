import { MAKES } from '../data/vehicleCatalog';
import {
  isDraftComplete,
  type FuelType,
  type Transmission,
  type VehicleDraft,
} from './vehicleDraft';

export type VehicleGate = 'complete' | 'fuel' | 'make';

const FUELS: FuelType[] = ['PETROL', 'DIESEL', 'CNG', 'EV'];

export function hasMakeModelYear(draft: Pick<VehicleDraft, 'make' | 'model' | 'year'>): boolean {
  return Boolean(draft.make && draft.model && draft.year);
}

export function makeIdFromLabel(make: string): string {
  const found = MAKES.find((item) => item.label.toLowerCase() === make.trim().toLowerCase());
  return found?.id ?? make.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function draftFromSavedVehicle(vehicle: {
  make: string;
  model: string;
  year: number;
  fuel_type: string;
  transmission: string;
}): VehicleDraft {
  const fuel = FUELS.includes(vehicle.fuel_type as FuelType)
    ? (vehicle.fuel_type as FuelType)
    : 'PETROL';
  const transmission: Transmission = vehicle.transmission === 'AUTOMATIC' ? 'AUTOMATIC' : 'MANUAL';
  return {
    make: vehicle.make,
    makeId: makeIdFromLabel(vehicle.make),
    model: vehicle.model,
    year: vehicle.year,
    fuelType: fuel,
    transmission,
  };
}

export function nextVehicleGate(draft: VehicleDraft): VehicleGate {
  if (isDraftComplete(draft)) return 'complete';
  if (hasMakeModelYear(draft)) return 'fuel';
  return 'make';
}

export function gprVehicleParams(returnTo = '/job-card/repairs-cart'): Record<string, string> {
  return {
    offering: 'general-service-health-report',
    flow: 'service-repair',
    returnTo,
  };
}

export function gsVehicleParams(offeringSlug: string): Record<string, string> {
  return { offering: offeringSlug };
}
