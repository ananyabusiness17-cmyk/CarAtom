export type InventoryFilters = {
  q?: string;
  low_stock?: boolean;
  location?: string;
};

export type DateRange = { from?: string; to?: string };

export type AuditFilters = {
  resource_type?: string;
  resource_id?: string;
  command?: string;
};

export const adminKeys = {
  me: ['admin', 'me'] as const,
  inventory: (filters: InventoryFilters) => ['admin', 'inventory', filters] as const,
  sku: (id: string) => ['admin', 'sku', id] as const,
  catalog: ['admin', 'catalog'] as const,
  people: (q?: string) => ['admin', 'people', q ?? ''] as const,
  customer: (id: string) => ['admin', 'customer', id] as const,
  partsHistory: (id: string) => ['admin', 'parts-history', id] as const,
  dossier: (id: string) => ['admin', 'dossier', id] as const,
  ledger: (range: DateRange) => ['admin', 'ledger', range] as const,
  jobs: (filters: { q?: string; status?: string }) => ['admin', 'jobs', filters] as const,
  job: (id: string) => ['admin', 'job', id] as const,
  jobUsage: (id: string) => ['admin', 'job-usage', id] as const,
  audit: (filters: AuditFilters) => ['admin', 'audit', filters] as const,
  dispatch: ['admin', 'dispatch'] as const,
  outbox: (status: string) => ['admin', 'outbox', status] as const,
  closeout: (queue: string) => ['admin', 'closeout', queue] as const,
  catalogKit: (ownerType: string, ownerId: string) =>
    ['admin', 'catalog-kit', ownerType, ownerId] as const,
  jobKit: (id: string) => ['admin', 'job-kit', id] as const,
  vehicleHistory: (id: string) => ['admin', 'vehicle-history', id] as const,
};
