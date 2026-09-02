import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '../../app/(customer)/(tabs)/home.tsx'), 'utf8');

if (!src.includes('/job-card/repairs-cart')) {
  throw new Error('Service + repair CTA must open the repairs cart');
}

if (!src.includes('RepairCarChoices')) {
  throw new Error('Repair tab must offer present car and new car before the cart');
}

if (src.includes('Repair add-ons complete in a later phase')) {
  throw new Error('Service + repair tab must not keep the Phase 02 later-phase stub');
}

if (!src.includes('Select repairs / replacements') && !src.includes('presentation.ctaLabel')) {
  throw new Error('Home repair CTA copy must stay Select repairs / replacements');
}

const choices = readFileSync(join(here, '../components/home/RepairCarChoices.tsx'), 'utf8');
if (!choices.includes("flexDirection: 'row'") || !choices.includes('Present car') || !choices.includes('New car')) {
  throw new Error('Present car and New car must sit side by side');
}

if (!src.includes('savedVehicleParams')) {
  throw new Error('Home header car must save the vehicle and return home');
}

console.log('home repair CTA OK');
