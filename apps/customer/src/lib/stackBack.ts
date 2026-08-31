export const CUSTOMER_HOME = '/(customer)/(tabs)/home';

export type StackBackTarget = 'nested' | 'parent' | 'home';

export type NavigatorState = {
  index?: number;
  routes?: unknown[];
};

export type BackCapableNav = {
  canGoBack: () => boolean;
  goBack: () => void;
  getParent: () => BackCapableNav | undefined;
  getState?: () => NavigatorState | undefined;
};

/** True only when THIS stack has a screen to pop — not when a parent can go back. */
export function nestedStackHasHistory(state?: NavigatorState | null): boolean {
  if (!state) return false;
  if (typeof state.index === 'number') return state.index > 0;
  return (state.routes?.length ?? 0) > 1;
}

export function stackBackTarget(nestedHasHistory: boolean, parentCanGoBack: boolean): StackBackTarget {
  if (nestedHasHistory) return 'nested';
  if (parentCanGoBack) return 'parent';
  return 'home';
}

export function leaveStack(
  navigation: BackCapableNav,
  replace: (href: string) => void,
  fallback = CUSTOMER_HOME,
): void {
  const target = stackBackTarget(
    nestedStackHasHistory(navigation.getState?.()),
    Boolean(navigation.getParent()?.canGoBack()),
  );
  if (target === 'nested') {
    navigation.goBack();
    return;
  }
  if (target === 'parent') {
    navigation.getParent()?.goBack();
    return;
  }
  replace(fallback);
}
