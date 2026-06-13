import type { FacilityStaffMember, VendorContract } from '@/lib/types'

// Personal details (name, phone, national_id, email) live on the linked Person record.
// FACILITY_STAFF contains employment-specific data only.

export const FACILITY_STAFF: FacilityStaffMember[] = [
  {
    id: 'FS-001',
    person_id: 'S-01',            // Alice Kamau
    staff_type: 'permanent',
    department_id: 'DEP-02',      // Maintenance
    job_title: 'Maintenance Technician',
    reporting_to: 'Facility Manager',
    contract_status: 'active',
    start_date: '2019-03-01',
    national_id_verified: true,
    background_check_done: true,
    background_check_date: '2019-02-25',
    emergency_contact_name: 'Jane Kamau',
    emergency_contact_phone: '+254710010101',
  },
  {
    id: 'FS-002',
    person_id: 'S-02',            // Bob Ochieng
    staff_type: 'permanent',
    department_id: 'DEP-01',      // Security
    job_title: 'Security Officer',
    reporting_to: 'Facility Manager',
    contract_status: 'active',
    start_date: '2020-06-15',
    national_id_verified: true,
    background_check_done: true,
    background_check_date: '2020-06-10',
    emergency_contact_name: 'Mary Ochieng',
    emergency_contact_phone: '+254721020202',
  },
  {
    id: 'FS-003',
    person_id: 'S-03',            // Carol Mwangi
    staff_type: 'casual',
    department_id: 'DEP-02',      // Maintenance
    job_title: 'Casual Labourer',
    contract_status: 'active',
    start_date: '2024-01-02',
    end_date: '2024-07-31',
    national_id_verified: true,
    background_check_done: false,
    notes: 'Engaged for Block C renovation works',
  },
  {
    id: 'FS-004',
    person_id: 'S-05',            // Ruth Adhiambo
    staff_type: 'permanent',
    department_id: 'DEP-03',      // Cleaning
    job_title: 'Cleaning Supervisor',
    reporting_to: 'Facility Manager',
    contract_status: 'probation',
    start_date: '2024-05-01',
    probation_end_date: '2024-07-31',
    national_id_verified: true,
    background_check_done: true,
    background_check_date: '2024-04-28',
    emergency_contact_name: 'Tom Adhiambo',
    emergency_contact_phone: '+254703050505',
  },
]

// Outsourced agency staff (S-04, Dan Njoroge — Eagle Eye) tracked in PEOPLE with
// is_outsourced=true. They do NOT have FACILITY_STAFF employment records.

export const VENDOR_CONTRACTS: VendorContract[] = [
  {
    id: 'VC-001',
    vendor_name: 'Eagle Eye Security Ltd',
    service_type: 'Security Services',
    contact_person: 'James Ndirangu',
    contact_phone: '+254722100100',
    contact_email: 'ops@eagleeye.co.ke',
    contract_start: '2024-01-01',
    contract_end: '2024-12-31',
    monthly_value: 85000,
    status: 'active',
    department_id: 'DEP-01',
    notes: '6 guards — 2 day shift, 2 night shift, 2 gate. Reviewed quarterly.',
  },
  {
    id: 'VC-002',
    vendor_name: 'CleanPro Services',
    service_type: 'Cleaning & Waste',
    contact_person: 'Nancy Waweru',
    contact_phone: '+254733200200',
    contact_email: 'nancy@cleanpro.co.ke',
    contract_start: '2024-01-01',
    contract_end: '2024-12-31',
    monthly_value: 42000,
    status: 'active',
    department_id: 'DEP-03',
    notes: 'Common areas, corridors, parking. Daily cleaning schedule.',
  },
  {
    id: 'VC-003',
    vendor_name: 'GreenThumb Landscaping',
    service_type: 'Landscaping',
    contact_person: 'Brian Mwenda',
    contact_phone: '+254711300300',
    contract_start: '2023-06-01',
    contract_end: '2024-05-31',
    monthly_value: 18000,
    status: 'expired',
    notes: 'Contract expired — renewal under negotiation.',
  },
  {
    id: 'VC-004',
    vendor_name: 'SwiftLift Elevators',
    service_type: 'Elevator Maintenance',
    contact_person: 'Patrick Maina',
    contact_phone: '+254720400400',
    contact_email: 'service@swiftlift.co.ke',
    contract_start: '2024-03-01',
    contract_end: '2025-02-28',
    monthly_value: 25000,
    status: 'active',
    department_id: 'DEP-02',
    notes: 'Monthly service + 24hr emergency callout included.',
  },
]
