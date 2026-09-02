export const CUSTOMER_HOME = '/(customer)/(tabs)/home';

export type StackBackTarget = 'nested' | 'parent' | 'home';

export type NavigatorRoute = {
  name?: string;
  state?: NavigatorState;
};

export type NavigatorState = {
  index?: number;
  routes?: NavigatorRoute[];
  type?: string;
};

export type BackCapableNav = {
  canGoBack: () => boolean;
  goBack: () => void;
  getParent: () => BackCapableNav | undefined;
  getState?: () => NavigatorState | undefined;
};

/** Follow the focused child until we reach the stack that is actually on screen. */
export function focusedChildState(state?: NavigatorState | null): NavigatorState | undefined {
  if (!state) return undefined;
  const routes = state.routes;
  if (!routes?.length) return state;
  const index = typeof state.index === 'number' ? state.index : 0;
  const child = routes[index]?.state;
  if (!child) return state;
  return focusedChildState(child) ?? child;
}

/** True only when THIS stack has a screen to pop — not tabs, not nested children. */
export function ownStackHasHistory(state?: NavigatorState | null): boolean {
  if (!state) return false;
  if (state.type === 'tab') return false;
  if (typeof state.index === 'number') return state.index > 0;
  return (state.routes?.length ?? 0) > 1;
}

export function nestedStackHasHistory(state?: NavigatorState | null): boolean {
  return ownStackHasHistory(focusedChildState(state) ?? state);
}

export function stackBackTarget(nestedHasHistory: boolean, parentCanGoBack: boolean): StackBackTarget {
  if (nestedHasHistory) return 'nested';
  if (parentCanGoBack) return 'parent';
  return 'home';
}

export function shouldPopBack(navigation: BackCapableNav): boolean {
  const state = navigation.getState?.();
  return ownStackHasHistory(focusedChildState(state) ?? state);
}

export function leaveStack(
  navigation: BackCapableNav,
  replace: (href: string) => void,
  fallback = CUSTOMER_HOME,
  back: () => void = () => navigation.goBack(),
): void {
  // Only pop when THIS stack has a screen under the current one.
  // router.back() on the first nested screen no-ops in Expo Router — it does not
  // bubble to the root stack, which is why the vehicle header back did nothing.
  if (shouldPopBack(navigation)) {
    back();
    return;
  }
  replace(fallback);
}

