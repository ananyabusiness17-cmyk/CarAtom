import {
  draftFromSavedVehicle,
  hasMakeModelYear,
  makeIdFromLabel,
  nextVehicleGate,
  savedVehicleParams,
} from './presentVehicle';
import { emptyVehicleDraft } from './vehicleDraft';

if (makeIdFromLabel('Honda') !== 'honda') {
  throw new Error('Honda should map to honda');
}
if (!hasMakeModelYear({ make: 'Honda', model: 'City', year: 2019 })) {
  throw new Error('present car needs make, model, and year');
}
if (nextVehicleGate(emptyVehicleDraft) !== 'make') {
  throw new Error('empty draft starts at make');
}

const saved = draftFromSavedVehicle({
  make: 'Honda',
  model: 'City',
  year: 2019,
  fuel_type: 'PETROL',
  transmission: 'MANUAL',
});
if (nextVehicleGate(saved) !== 'complete') {
  throw new Error('saved car with fuel should skip the vehicle stack');
}

const yearOnly = { ...emptyVehicleDraft, make: 'Honda', makeId: 'honda', model: 'City', year: 2019 };
if (nextVehicleGate(yearOnly) !== 'fuel') {
  throw new Error('make/model/year without fuel continues at fuel');
}

if (savedVehicleParams().returnTo !== '/(customer)/(tabs)/home' || savedVehicleParams().intent !== 'save') {
  throw new Error('header car picker must return home without opening a job');
}

console.log('presentVehicle OK');
