export const queryKeys = {
  vehicles: {
    all: ['vehicles'] as const,
    list: () => [...queryKeys.vehicles.all, 'list'] as const,
  },
  units: {
    all: ['units'] as const,
    list: () => [...queryKeys.units.all, 'list'] as const,
  },
  leases: {
    all: ['leases'] as const,
    list: (status?: string) => [...queryKeys.leases.all, 'list', status] as const,
  },
  occupancy: {
    all: ['occupancy'] as const,
    summary: () => [...queryKeys.occupancy.all, 'summary'] as const,
  },
  utilities: {
    all: ['utilities'] as const,
    trend: (meterId: string, months: number) =>
      [...queryKeys.utilities.all, 'trend', meterId, months] as const,
  },
  invoices: {
    all: ['invoices'] as const,
    paged: (params: Record<string, unknown>) =>
      [...queryKeys.invoices.all, 'paged', params] as const,
    categories: () => [...queryKeys.invoices.all, 'categories'] as const,
    credits: (unitId: string, categoryCode: string) =>
      [...queryKeys.invoices.all, 'credits', unitId, categoryCode] as const,
  },
  settings: {
    all: ['settings'] as const,
    general: () => [...queryKeys.settings.all, 'general'] as const,
  },
  roles: {
    all: ['roles'] as const,
    list: () => [...queryKeys.roles.all, 'list'] as const,
  },
  users: {
    all: ['users'] as const,
    paged: (params: Record<string, unknown>) =>
      [...queryKeys.users.all, 'paged', params] as const,
  },
  openingBalances: {
    all: ['opening-balances'] as const,
    list: (category?: string) => [...queryKeys.openingBalances.all, 'list', category] as const,
  },
  audit: {
    all: ['audit'] as const,
    events: (params: Record<string, unknown>) =>
      [...queryKeys.audit.all, 'events', params] as const,
  },
} as const
