import {
  DEMO_VEHICLE,
  emptyVehicleDraft,
  vehicleLabel,
  withDemoDefaults,
} from '../lib/vehicleDraft';

const filled = withDemoDefaults(emptyVehicleDraft);
if (filled.make !== 'Honda' || filled.model !== 'City' || filled.year !== 2019) {
  throw new Error('Demo defaults should be Honda City 2019');
}
if (filled.fuelType !== 'PETROL' || filled.transmission !== 'MANUAL') {
  throw new Error('Demo defaults should be petrol manual');
}

const kept = withDemoDefaults({
  ...emptyVehicleDraft,
  make: 'Hyundai',
  makeId: 'hyundai',
  model: 'Creta',
  year: 2021,
  fuelType: 'DIESEL',
  transmission: 'AUTOMATIC',
});
if (kept.make !== 'Hyundai' || kept.model !== 'Creta' || kept.year !== 2021) {
  throw new Error('withDemoDefaults must not overwrite a chosen vehicle');
}

if (vehicleLabel(DEMO_VEHICLE) !== 'Honda City 2019') {
  throw new Error(`Unexpected vehicle label ${vehicleLabel(DEMO_VEHICLE)}`);
}

if (vehicleLabel(emptyVehicleDraft) !== null) {
  throw new Error('Empty draft has no home pill label');
}

console.log('vehicleDraftStore helpers OK');
