import { nextSelectedSlugs } from './repairCartLogic';

const added = nextSelectedSlugs([], 'ac-gas-refill');
if (added.join(',') !== 'ac-gas-refill') {
  throw new Error('Empty cart should add the first slug');
}

const two = nextSelectedSlugs(added, 'brake-pads-pair');
if (two.join(',') !== 'ac-gas-refill,brake-pads-pair') {
  throw new Error('Toggle should append a second slug');
}

const removed = nextSelectedSlugs(two, 'ac-gas-refill');
if (removed.join(',') !== 'brake-pads-pair') {
  throw new Error('Toggle should remove an existing slug');
}

console.log('repairCartStore OK');
