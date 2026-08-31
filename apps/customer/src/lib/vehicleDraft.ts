export type FuelType = 'PETROL' | 'DIESEL' | 'CNG' | 'EV';
export type Transmission = 'MANUAL' | 'AUTOMATIC';

export type VehicleDraft = {
  make: string | null;
  makeId: string | null;
  model: string | null;
  year: number | null;
  fuelType: FuelType | null;
  transmission: Transmission | null;
};

export const emptyVehicleDraft: VehicleDraft = {
  make: null,
  makeId: null,
  model: null,
  year: null,
  fuelType: null,
  transmission: null,
};

export const DEMO_VEHICLE: VehicleDraft = {
  make: 'Honda',
  makeId: 'honda',
  model: 'City',
  year: 2019,
  fuelType: 'PETROL',
  transmission: 'MANUAL',
};

export function withDemoDefaults(draft: VehicleDraft): VehicleDraft {
  return {
    make: draft.make ?? DEMO_VEHICLE.make,
    makeId: draft.makeId ?? DEMO_VEHICLE.makeId,
    model: draft.model ?? DEMO_VEHICLE.model,
    year: draft.year ?? DEMO_VEHICLE.year,
    fuelType: draft.fuelType ?? DEMO_VEHICLE.fuelType,
    transmission: draft.transmission ?? DEMO_VEHICLE.transmission,
  };
}

export function pickVehicleDraft(draft: VehicleDraft): VehicleDraft {
  return {
    make: draft.make,
    makeId: draft.makeId,
    model: draft.model,
    year: draft.year,
    fuelType: draft.fuelType,
    transmission: draft.transmission,
  };
}

export function isDraftComplete(draft: VehicleDraft): boolean {
  return Boolean(draft.make && draft.model && draft.year && draft.fuelType && draft.transmission);
}

export function vehicleLabel(draft: VehicleDraft): string | null {
  if (!draft.make || !draft.model || !draft.year) return null;
  return `${draft.make} ${draft.model} ${draft.year}`;
}

export function vehicleSummaryLine(draft: VehicleDraft): string {
  const label = vehicleLabel(draft);
  if (!label) return 'Add your car';
  const fuel =
    draft.fuelType === 'PETROL'
      ? 'Petrol'
      : draft.fuelType === 'DIESEL'
        ? 'Diesel'
        : draft.fuelType === 'CNG'
          ? 'CNG'
          : draft.fuelType === 'EV'
            ? 'EV'
            : null;
  return fuel ? `${label} · ${fuel}` : label;
}
