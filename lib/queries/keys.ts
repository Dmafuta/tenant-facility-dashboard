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
} as const
