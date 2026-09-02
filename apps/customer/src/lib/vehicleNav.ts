export function passAlongParams(
  flowParam: Record<string, string | undefined>,
  returnTo?: string | string[],
): Record<string, string> {
  const value = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  const next: Record<string, string> = {};
  for (const [key, item] of Object.entries(flowParam)) {
    if (item) next[key] = item;
  }
  if (value) next.returnTo = value;
  return next;
}

const VEHICLE_PREV: Record<string, '/vehicle/make' | '/vehicle/model' | '/vehicle/year'> = {
  '/vehicle/model': '/vehicle/make',
  '/vehicle/year': '/vehicle/model',
  '/vehicle/fuel': '/vehicle/year',
};

/** Expo Router often remounts /vehicle/* with no stack history, so back must be explicit. */
export function previousVehiclePath(
  pathname: string,
): '/vehicle/make' | '/vehicle/model' | '/vehicle/year' | null {
  const path = pathname.replace(/\/$/, '') as keyof typeof VEHICLE_PREV;
  return VEHICLE_PREV[path] ?? null;
}

