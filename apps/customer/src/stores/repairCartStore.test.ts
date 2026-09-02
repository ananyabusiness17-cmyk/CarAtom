import {
  clampCartQty,
  nextSelectedSlugs,
  quantitiesFromSlugs,
  slugsFromQuantities,
  totalCartQty,
} from './repairCartLogic';

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

if (clampCartQty(0) !== 0 || clampCartQty(11) !== 10 || clampCartQty(2.8) !== 2) {
  throw new Error('Cart qty should clamp 0–10');
}

const qty = quantitiesFromSlugs(['ac-gas-refill', 'brake-pads-pair']);
qty['ac-gas-refill'] = 3;
if (totalCartQty(qty) !== 4) {
  throw new Error('Total cart qty should sum units');
}
if (slugsFromQuantities({ a: 2, b: 0 }).join(',') !== 'a') {
  throw new Error('Zero qty slugs should drop from the cart');
}

console.log('repairCartStore OK');
