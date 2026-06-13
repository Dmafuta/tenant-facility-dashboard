import type { Department } from '@/lib/types'

export const DEPARTMENTS: Department[] = [
  {
    id: 'DEP-01',
    name: 'Security',
    description: 'Gate access control, perimeter patrol, and visitor management.',
    head_person_id: 'S-02',   // Bob Ochieng — Security Officer
    budget_monthly: 95000,    // direct staff payroll + Eagle Eye vendor contract
    created_at: '2018-01-01',
  },
  {
    id: 'DEP-02',
    name: 'Maintenance',
    description: 'Plumbing, electrical, structural repairs, and preventive maintenance.',
    head_person_id: 'S-01',   // Alice Kamau — Maintenance Technician
    budget_monthly: 60000,
    created_at: '2018-01-01',
  },
  {
    id: 'DEP-03',
    name: 'Cleaning',
    description: 'Common areas, corridors, parking, and waste management.',
    head_person_id: 'S-05',   // Ruth Adhiambo — Cleaning Supervisor
    budget_monthly: 55000,    // direct staff + CleanPro vendor
    created_at: '2018-01-01',
  },
  {
    id: 'DEP-04',
    name: 'Admin & Reception',
    description: 'Front desk, resident communications, and administrative support.',
    head_person_id: undefined,
    budget_monthly: 40000,
    created_at: '2020-01-01',
  },
]
