import type { EmergencyContact } from '@/lib/types'

export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  // ── James Mwangi — Unit 101 ───────────────────────────────────────────
  {
    id: 'EC-001',
    person_id: 'P-001',
    unit_id: 'U-101',
    name: 'Robert Mwangi',
    relationship: 'Brother',
    phone_primary: '+254 722 111 222',
    phone_secondary: '+254 733 111 222',
    address: 'Westlands, Nairobi',
    priority: 1,
    notes: 'Available on weekends',
  },
  {
    id: 'EC-002',
    person_id: 'P-001',
    unit_id: 'U-101',
    name: 'Dr. Anne Kamau',
    relationship: 'Family Doctor',
    phone_primary: '+254 020 234 5678',
    email: 'dr.kamau@healthclinic.co.ke',
    priority: 2,
  },

  // ── Grace Njoroge — Unit 102 ──────────────────────────────────────────
  {
    id: 'EC-003',
    person_id: 'P-003',
    unit_id: 'U-102',
    name: 'Alice Wambui',
    relationship: 'Mother',
    phone_primary: '+254 711 333 444',
    address: 'Kiambu Town',
    priority: 1,
  },
  {
    id: 'EC-004',
    person_id: 'P-003',
    unit_id: 'U-102',
    name: 'John Njoroge',
    relationship: 'Father-in-law',
    phone_primary: '+254 720 444 555',
    priority: 2,
  },

  // ── Samuel Kipchoge — Unit 201 ────────────────────────────────────────
  {
    id: 'EC-005',
    person_id: 'P-006',
    unit_id: 'U-201',
    name: 'Moses Kipchoge',
    relationship: 'Father',
    phone_primary: '+254 724 555 666',
    address: 'Eldoret',
    priority: 1,
  },

  // ── Beatrice Achieng — Unit 205 ───────────────────────────────────────
  {
    id: 'EC-006',
    person_id: 'P-008',
    unit_id: 'U-205',
    name: 'Paul Odhiambo',
    relationship: 'Husband',
    phone_primary: '+254 700 666 777',
    email: 'paul.odhiambo@gmail.com',
    priority: 1,
  },

  // ── David Otieno — Unit 301 ───────────────────────────────────────────
  {
    id: 'EC-007',
    person_id: 'P-009',
    unit_id: 'U-301',
    name: 'Mary Otieno',
    relationship: 'Mother',
    phone_primary: '+254 712 777 888',
    address: 'Kisumu',
    priority: 1,
  },
]
