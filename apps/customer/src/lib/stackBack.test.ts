import { leaveStack, nestedStackHasHistory, stackBackTarget, type BackCapableNav } from './stackBack';

if (nestedStackHasHistory({ index: 0, routes: [{}] }) !== false) {
  throw new Error('first nested screen has no stack history');
}
if (nestedStackHasHistory({ index: 1, routes: [{}, {}] }) !== true) {
  throw new Error('second nested screen should pop within the stack');
}

if (stackBackTarget(true, false) !== 'nested') {
  throw new Error('nested history should pop the current stack');
}
if (stackBackTarget(false, true) !== 'parent') {
  throw new Error('empty nested stack should pop the parent navigator');
}
if (stackBackTarget(false, false) !== 'home') {
  throw new Error('empty root should return home');
}

let parentBack = 0;
let nestedBack = 0;
let replaced: string | null = null;
const parent: BackCapableNav = {
  canGoBack: () => true,
  goBack: () => {
    parentBack += 1;
  },
  getParent: () => undefined,
};
const firstVehicleScreen: BackCapableNav = {
  canGoBack: () => true,
  goBack: () => {
    nestedBack += 1;
  },
  getParent: () => parent,
  getState: () => ({ index: 0, routes: [{}] }),
};
leaveStack(firstVehicleScreen, (href) => {
  replaced = href;
});
if (nestedBack !== 0 || parentBack !== 1 || replaced !== null) {
  throw new Error('make screen must dismiss the vehicle stack, not no-op on nested goBack');
}

console.log('stackBack OK');
