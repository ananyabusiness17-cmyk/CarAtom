export const WEB_OPS_PATHS = {
  inventory: '/inventory',
  technicians: '/technicians',
  content: '/content',
  reports: '/reports',
  settings: '/settings',
  audit: '/audit',
  catalog: '/catalog',
  payments: '/payments',
  book: '/book',
  people: '/people',
} as const;

export type WebOpsPathKey = keyof typeof WEB_OPS_PATHS;

const ALLOWED_PATHS = new Set<string>(Object.values(WEB_OPS_PATHS));

export type ResolveUrlOptions = {
  baseUrl?: string;
  isDev?: boolean;
};

function assertSafeId(id: string): string {
  const trimmed = id.trim();
  if (!trimmed || trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('..')) {
    throw new Error('Invalid identifier');
  }
  return trimmed;
}

function isDevMode(isDev?: boolean): boolean {
  if (typeof isDev === 'boolean') return isDev;
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

function blockedScheme(value: string): boolean {
  return /^(javascript|data|file|intent|vbscript):/i.test(value.trim());
}

export function resolveAdminWebUrl(path: string, options: ResolveUrlOptions = {}): string | null {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('://')) return null;
  if (path.includes('..') || blockedScheme(path)) return null;
  const allowed = ALLOWED_PATHS.has(path) || /^\/jobs\/[^/]+(?:\/override)?$/.test(path);
  if (!allowed) return null;

  const baseRaw = (options.baseUrl ?? process.env.EXPO_PUBLIC_ADMIN_WEB_URL ?? '').trim();
  if (!baseRaw || blockedScheme(baseRaw) || baseRaw.startsWith('//')) return null;

  let base: URL;
  let resolved: URL;
  try {
    base = new URL(baseRaw);
    resolved = new URL(path, base);
  } catch {
    return null;
  }

  if (blockedScheme(resolved.href)) return null;
  if (resolved.username || resolved.password) return null;
  if (resolved.searchParams.has('access_token') || resolved.searchParams.has('refresh_token')) return null;
  if (resolved.protocol !== 'https:' && resolved.protocol !== 'http:') return null;

  const dev = isDevMode(options.isDev);
  if (!dev && resolved.protocol !== 'https:') return null;
  if (dev && resolved.protocol === 'http:') {
    const host = resolved.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') return null;
  }

  if (resolved.hostname !== base.hostname) return null;
  if (resolved.origin !== base.origin) return null;
  return resolved.href;
}

export function webOpsUrl(key: WebOpsPathKey, options: ResolveUrlOptions = {}): string | null {
  return resolveAdminWebUrl(WEB_OPS_PATHS[key], options);
}

export function jobWebUrl(id: string, options: ResolveUrlOptions = {}): string | null {
  try {
    return resolveAdminWebUrl(`/jobs/${encodeURIComponent(assertSafeId(id))}`, options);
  } catch {
    return null;
  }
}

export function overrideWebUrl(id: string, options: ResolveUrlOptions = {}): string | null {
  try {
    return resolveAdminWebUrl(`/jobs/${encodeURIComponent(assertSafeId(id))}/override`, options);
  } catch {
    return null;
  }
}
