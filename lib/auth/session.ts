import type { Subject } from '@/lib/abac/types'

const PERSONAS: Record<string, Subject> = {
  facility_manager:      { id: 'u1', role: 'facility_manager',      name: 'Alice Kamau' },
  finance_officer:       { id: 'u2', role: 'finance_officer',       name: 'Bob Ochieng' },
  maintenance_supervisor:{ id: 'u3', role: 'maintenance_supervisor', name: 'Carol Mwangi' },
  security_officer:      { id: 'u4', role: 'security_officer',       name: 'Dan Otieno' },
  receptionist:          { id: 'u5', role: 'receptionist',           name: 'Eve Ndung\'u' },
  owner:                 { id: 'u6', role: 'owner',                  name: 'Frank Mutua', unit_ids: ['U-101','U-205'] },
}

export async function getSubjectFromSession(): Promise<Subject> {
  const persona = process.env.DEMO_PERSONA ?? 'facility_manager'
  return PERSONAS[persona] ?? PERSONAS['facility_manager']
}
