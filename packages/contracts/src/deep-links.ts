const SCHEME = 'caratom://';
const UNIVERSAL = 'https://staging.caratom.app/l/';

export type DeepLinkEntity =
  | 'booking'
  | 'estimate'
  | 'payment'
  | 'advisor'
  | 'visit'
  | 'notifications'
  | 'support'
  | 'invoice'
  | 'review'
  | 'findings';

export type ParsedDeepLink = {
  entity: DeepLinkEntity;
  id: string | null;
  path: string;
  route: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SHORT: Record<string, DeepLinkEntity> = {
  b: 'booking',
  e: 'estimate',
  p: 'payment',
  a: 'advisor',
  v: 'visit',
  n: 'notifications',
  s: 'support',
  f: 'findings',
};

const KNOWN: DeepLinkEntity[] = [
  'booking',
  'estimate',
  'payment',
  'advisor',
  'visit',
  'notifications',
  'support',
  'invoice',
  'review',
  'findings',
];

function routeFor(entity: DeepLinkEntity, id: string | null): string | null {
  if (entity === 'notifications') return '/notifications';
  if (entity === 'support') return '/sos/pick';
  if (!id) return null;
  switch (entity) {
    case 'booking':
      return `/booking/${id}`;
    case 'estimate':
      return `/job-card/${id}/estimate`;
    case 'payment':
    case 'invoice':
      return `/invoice/${id}`;
    case 'advisor':
      return `/job-card/${id}/advisor`;
    case 'visit':
      return `/visits/${id}`;
    case 'findings':
      return `/job-card/${id}/findings`;
    case 'review':
      return `/review/${id}`;
    default:
      return null;
  }
}

export function parseDeepLink(url: string | null | undefined): ParsedDeepLink | null {
  if (!url) return null;
  let rest = url.trim();
  if (rest.startsWith(UNIVERSAL)) {
    const short = rest.slice(UNIVERSAL.length);
    const [code, id] = short.split('/');
    if (!code) return null;
    const entity = SHORT[code];
    if (!entity) return null;
    if (entity !== 'notifications' && entity !== 'support' && (!id || !UUID_RE.test(id))) return null;
    if (entity === 'support' && id && !UUID_RE.test(id)) return null;
    const route = routeFor(entity, id && UUID_RE.test(id) ? id : null);
    if (!route) return null;
    return { entity, id: id && UUID_RE.test(id) ? id : null, path: `${entity}/${id ?? ''}`, route };
  }
  rest = rest.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  const parts = rest.split('/').filter(Boolean);
  if (parts[0] === 'job-card' && parts[1] && UUID_RE.test(parts[1]) && parts[2] === 'findings') {
    const id = parts[1];
    return { entity: 'findings', id, path: rest, route: `/job-card/${id}/findings` };
  }
  const [kind, id] = parts;
  if (!kind) return null;
  if (!KNOWN.includes(kind as DeepLinkEntity)) return null;
  const entity = kind as DeepLinkEntity;
  if (entity !== 'notifications' && entity !== 'support' && (!id || !UUID_RE.test(id))) return null;
  if (entity === 'support' && id && !UUID_RE.test(id)) return null;
  const resolvedId = id && UUID_RE.test(id) ? id : null;
  const route = routeFor(entity, resolvedId);
  if (!route) return null;
  return { entity, id: resolvedId, path: rest, route };
}

export function deepLinkHref(entity: DeepLinkEntity, id?: string): string {
  if (entity === 'notifications') return `${SCHEME}notifications`;
  if (entity === 'support' && !id) return `${SCHEME}support`;
  return `${SCHEME}${entity}/${id ?? ''}`;
}
