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
  people: {
    all: ['people'] as const,
    paged: (type: string, search: string, page: number) =>
      [...queryKeys.people.all, 'paged', type, search, page] as const,
    householdMembers: (personId: string) =>
      [...queryKeys.people.all, 'household', personId] as const,
    vehicles: (personId: string) =>
      [...queryKeys.people.all, 'vehicles', personId] as const,
    emergencyContacts: (personId: string) =>
      [...queryKeys.people.all, 'emergency-contacts', personId] as const,
    personalStaff: (personId: string) =>
      [...queryKeys.people.all, 'staff', personId] as const,
    visitors: (personId: string) =>
      [...queryKeys.people.all, 'visitors', personId] as const,
    crbStatus: (personId: string) =>
      [...queryKeys.people.all, 'crb', personId] as const,
    kycStatus: (personId: string) =>
      [...queryKeys.people.all, 'kyc', personId] as const,
    access: (personId: string) =>
      [...queryKeys.people.all, 'access', personId] as const,
    activeLeases: (personId: string, unitIds: string[]) =>
      [...queryKeys.people.all, 'active-leases', personId, ...unitIds] as const,
  },
  property: {
    all: ['property'] as const,
    leases: (unitId: string) => [...queryKeys.property.all, 'leases', unitId] as const,
    charges: (unitId: string) => [...queryKeys.property.all, 'charges', unitId] as const,
    meters: (unitId: string) => [...queryKeys.property.all, 'meters', unitId] as const,
    visitors: (unitId: string) => [...queryKeys.property.all, 'visitors', unitId] as const,
  },
  hr: {
    all: ['hr'] as const,
    onboarding: () => [...queryKeys.hr.all, 'onboarding'] as const,
    leave: () => [...queryKeys.hr.all, 'leave'] as const,
    staffDocs: () => [...queryKeys.hr.all, 'staff-docs'] as const,
    roster: (from: string, to: string, dept: string) =>
      [...queryKeys.hr.all, 'roster', from, to, dept] as const,
    disciplinary: () => [...queryKeys.hr.all, 'disciplinary'] as const,
    training: () => [...queryKeys.hr.all, 'training'] as const,
    payroll: (month: string) => [...queryKeys.hr.all, 'payroll', month] as const,
  },
  financials: {
    all: ['financials'] as const,
    charges: () => [...queryKeys.financials.all, 'charges'] as const,
    transactions: () => [...queryKeys.financials.all, 'transactions'] as const,
    openInvoices: () => [...queryKeys.financials.all, 'open-invoices'] as const,
  },
  issues: {
    all: ['issues'] as const,
    list: () => [...queryKeys.issues.all, 'list'] as const,
  },
  casualPayroll: {
    all: ['casual-payroll'] as const,
    runs: () => [...queryKeys.casualPayroll.all, 'runs'] as const,
  },
  consumables: {
    all: ['consumables'] as const,
    types: () => [...queryKeys.consumables.all, 'types'] as const,
    stock: () => [...queryKeys.consumables.all, 'stock'] as const,
    issuances: (period: string) => [...queryKeys.consumables.all, 'issuances', period] as const,
  },
  integrations: {
    all: ['integrations'] as const,
    settings: () => [...queryKeys.integrations.all, 'settings'] as const,
    mpesaAccounts: () => [...queryKeys.integrations.all, 'mpesa-accounts'] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    liveData: () => [...queryKeys.dashboard.all, 'live-data'] as const,
  },
} as const
