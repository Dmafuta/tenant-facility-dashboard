import type { Lease } from '@/lib/types'

export const LEASES: (Lease & {
  billing_cycle: import('@/lib/types').BillingCycle
  next_billing_date: string
  pro_rate_first: boolean
})[] = [
  {
    id: 'L-001', unit_id: 'U-101', unit_label: 'A-101',
    tenant_id: 'T-01', tenant_name: 'James Mwangi',
    start_date: '2023-01-01', end_date: '2025-12-31',
    monthly_rent: 45000, deposit: 90000, status: 'active',
    billing_cycle: 'monthly',
    next_billing_date: '2026-07-01',
    pro_rate_first: false,
  },
  {
    id: 'L-002', unit_id: 'U-102', unit_label: 'A-102',
    tenant_id: 'T-02', tenant_name: 'Sarah Otieno',
    start_date: '2022-10-01', end_date: '2025-09-30',
    monthly_rent: 45000, deposit: 90000, status: 'active',
    billing_cycle: 'monthly',
    next_billing_date: '2026-07-01',
    pro_rate_first: false,
  },
  {
    id: 'L-003', unit_id: 'U-201', unit_label: 'A-201',
    tenant_id: 'T-03', tenant_name: 'Peter Ochieng',
    start_date: '2023-04-01', end_date: '2026-03-31',
    monthly_rent: 60000, deposit: 120000, status: 'active',
    billing_cycle: 'quarterly',        // billed every 3 months
    next_billing_date: '2026-07-01',
    pro_rate_first: true,
  },
  {
    id: 'L-004', unit_id: 'U-302', unit_label: 'A-302',
    tenant_id: 'T-04', tenant_name: 'Rose Akinyi',
    start_date: '2022-09-01', end_date: '2025-08-31',
    monthly_rent: 65000, deposit: 130000, status: 'notice_given',
    notice_date: '2025-05-01',
    billing_cycle: 'monthly',
    next_billing_date: '2026-07-01',
    pro_rate_first: false,
  },
  {
    id: 'L-005', unit_id: 'U-203', unit_label: 'A-203',
    tenant_id: 'T-05', tenant_name: 'TechCorp Ltd',
    start_date: '2023-07-01', end_date: '2026-06-30',
    monthly_rent: 70000, deposit: 140000, status: 'active',
    billing_cycle: 'semi_annual',      // office — billed every 6 months
    next_billing_date: '2026-07-01',
    pro_rate_first: false,
  },
  {
    id: 'L-006', unit_id: 'S-01', unit_label: 'S-01',
    tenant_id: 'T-06', tenant_name: 'Mini Market',
    start_date: '2020-02-01', end_date: '2027-01-31',
    monthly_rent: 80000, deposit: 160000, status: 'active',
    billing_cycle: 'annual',           // commercial — billed annually
    next_billing_date: '2027-02-01',
    pro_rate_first: false,
  },
]
