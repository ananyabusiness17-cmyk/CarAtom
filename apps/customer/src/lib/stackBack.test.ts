import {
  focusedChildState,
  leaveStack,
  nestedStackHasHistory,
  shouldPopBack,
  stackBackTarget,
  type BackCapableNav,
} from './stackBack';
import { previousVehiclePath } from './vehicleNav';

if (nestedStackHasHistory({ index: 0, routes: [{}] }) !== false) {
  throw new Error('first nested screen has no stack history');
}
if (nestedStackHasHistory({ type: 'tab', index: 1, routes: [{}, {}] }) !== false) {
  throw new Error('tab navigator history must not count as a stack pop');
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

const rootWithVehicle: BackCapableNav = {
  canGoBack: () => true,
  goBack: () => undefined,
  getParent: () => undefined,
  getState: () => ({
    type: 'stack',
    index: 1,
    routes: [
      { name: '(customer)' },
      { name: 'vehicle', state: { type: 'stack', index: 0, routes: [{ name: 'make' }] } },
    ],
  }),
};
if (focusedChildState(rootWithVehicle.getState?.())?.routes?.[0]?.name !== 'make') {
  throw new Error('focused child should be the vehicle make screen');
}
if (nestedStackHasHistory(rootWithVehicle.getState?.()) !== false) {
  throw new Error('root history must not look like make can pop');
}

let nestedBack = 0;
let replaced: string | null = null;
let routedBack = 0;
const parent: BackCapableNav = {
  canGoBack: () => true,
  goBack: () => undefined,
  getParent: () => undefined,
  getState: () => ({ type: 'stack', index: 1, routes: [{}, {}] }),
};
const firstVehicleScreen: BackCapableNav = {
  canGoBack: () => true,
  goBack: () => {
    nestedBack += 1;
  },
  getParent: () => parent,
  getState: () => ({ type: 'stack', index: 0, routes: [{}] }),
};
leaveStack(
  firstVehicleScreen,
  (href) => {
    replaced = href;
  },
  undefined,
  () => {
    routedBack += 1;
  },
);
if (nestedBack !== 0 || routedBack !== 0 || replaced !== '/(customer)/(tabs)/home') {
  throw new Error('make screen must replace home; router.back() no-ops on the first nested screen');
}
if (shouldPopBack(firstVehicleScreen)) {
  throw new Error('make has no nested history so it must not call router.back');
}

let tabHome = 0;
const tabParent: BackCapableNav = {
  canGoBack: () => true,
  goBack: () => {
    tabHome += 1;
  },
  getParent: () => undefined,
  getState: () => ({ type: 'tab', index: 1, routes: [{}, {}] }),
};
const firstOnTab: BackCapableNav = {
  canGoBack: () => false,
  goBack: () => undefined,
  getParent: () => tabParent,
  getState: () => ({ type: 'stack', index: 0, routes: [{}] }),
};
replaced = null;
routedBack = 0;
leaveStack(
  firstOnTab,
  (href) => {
    replaced = href;
  },
  undefined,
  () => {
    routedBack += 1;
  },
);
if (tabHome !== 0 || routedBack !== 0 || replaced !== '/(customer)/(tabs)/home') {
  throw new Error('tab parent canGoBack must not steal back — return home instead');
}

const modelScreen: BackCapableNav = {
  canGoBack: () => true,
  goBack: () => undefined,
  getParent: () => parent,
  getState: () => ({ type: 'stack', index: 1, routes: [{ name: 'make' }, { name: 'model' }] }),
};
routedBack = 0;
replaced = null;
leaveStack(
  modelScreen,
  (href) => {
    replaced = href;
  },
  undefined,
  () => {
    routedBack += 1;
  },
);
if (routedBack !== 1 || replaced !== null) {
  throw new Error('model should pop to make when the vehicle stack actually has history');
}

if (previousVehiclePath('/vehicle/make') !== null) {
  throw new Error('make has no previous vehicle screen');
}
if (previousVehiclePath('/vehicle/model') !== '/vehicle/make') {
  throw new Error('model back should go to make');
}
if (previousVehiclePath('/vehicle/year') !== '/vehicle/model') {
  throw new Error('year back should go to model');
}
if (previousVehiclePath('/vehicle/fuel') !== '/vehicle/year') {
  throw new Error('fuel back should go to year');
}

console.log('stackBack OK');
