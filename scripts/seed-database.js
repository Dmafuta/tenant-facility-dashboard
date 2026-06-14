#!/usr/bin/env node
/**
 * Seed script — inserts all mock data into Supabase using the service role key.
 * 
 * REQUIRES: Migrations 001 + 002 must be run first.
 * 
 * RUN:
 *   node scripts/seed-database.js
 *
 * The SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are read from .env.local automatically.
 */

// Load env
const fs = require('fs')
const path = require('path')
const envFile = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf-8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=')
    if (k && v.length) process.env[k.trim()] = v.join('=').trim()
  })
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

// UUID map — people.id is uuid, so we use deterministic UUIDs derived from
// the logical IDs via uuid5(NAMESPACE_OID, original_id)
const P = {
  'P-01': '4c0a7f97-f3ac-537f-9a01-6918e0e9a08e',
  'P-02': 'ad0e0c60-fe36-57af-bcd4-0063f3923498',
  'P-03': '4efb9d49-0cfa-536e-a253-0d65890aed5c',
  'P-04': '72a63ba7-6559-5f32-aa56-3fe88f749834',
  'P-05': '61a47f67-a31e-5fc4-a28f-7f79eb3a3d5a',
  'P-06': 'e7e7a5eb-9748-5797-a299-cfa7371d2f92',
  'P-07': '7e6239e6-f3ae-52c4-9e98-aa139df6a52a',
  'P-08': 'da4de8e1-98a4-5034-968c-5c41727fc7a4',
  'P-09': 'e050338f-87fb-5096-a7c3-0f0393f823cc',
  'T-01': 'd59cb482-cc09-5fba-a51a-d6032d98c290',
  'T-02': 'b562201e-d265-56f8-90d5-297162fe21e0',
  'T-03': '4e2bed6a-1a7e-557c-a9ab-dbf05de3b73f',
  'T-04': 'cfbaa120-edd3-5fe8-afee-fc6bcd7465e8',
  'S-01': '909e4e55-0796-5af9-899b-7da53bee2a7a',
  'S-02': '560fd400-8f4e-59b2-96ff-252fab8161d4',
  'S-03': '18f2999e-9577-5bef-8834-88e9f520815d',
  'S-04': 'dff37089-533c-5529-a654-ff75377721a0',
  'S-05': '58a6c491-a62c-5a7f-8c80-5827009fb060',
}

// Minimal fetch wrapper using Supabase REST
async function upsert(table, rows) {
  if (!rows || rows.length === 0) return
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${table}: HTTP ${res.status} — ${text}`)
  }
}

async function seed() {
  console.log('🌱 Seeding Supabase database…\n')

  // ── Units ──────────────────────────────────────────────────────────────
  const units = [
    { id:'U-101',  block:'A', floor:1, number:'101', size_sqm:65, bedrooms:2, bathrooms:1, use_type:'residential', status:'occupied',    monthly_rent:45000 },
    { id:'U-102',  block:'A', floor:1, number:'102', size_sqm:65, bedrooms:2, bathrooms:1, use_type:'residential', status:'occupied',    monthly_rent:45000 },
    { id:'U-103',  block:'A', floor:1, number:'103', size_sqm:55, bedrooms:1, bathrooms:1, use_type:'residential', status:'vacant',      monthly_rent:38000 },
    { id:'U-201',  block:'A', floor:2, number:'201', size_sqm:80, bedrooms:3, bathrooms:2, use_type:'residential', status:'occupied',    monthly_rent:60000 },
    { id:'U-202',  block:'A', floor:2, number:'202', size_sqm:80, bedrooms:3, bathrooms:2, use_type:'bnb',         status:'occupied',    monthly_rent:8000  },
    { id:'U-203',  block:'A', floor:2, number:'203', size_sqm:75, bedrooms:3, bathrooms:2, use_type:'office',      status:'occupied',    monthly_rent:70000 },
    { id:'U-301',  block:'A', floor:3, number:'301', size_sqm:90, bedrooms:3, bathrooms:2, use_type:'residential', status:'maintenance', monthly_rent:65000 },
    { id:'U-302',  block:'A', floor:3, number:'302', size_sqm:90, bedrooms:3, bathrooms:2, use_type:'residential', status:'occupied',    monthly_rent:65000 },
    { id:'SHP-01', block:'S', floor:0, number:'S01', size_sqm:40, bedrooms:0, bathrooms:1, use_type:'commercial',  status:'occupied',    monthly_rent:80000 },
    { id:'SHP-02', block:'S', floor:0, number:'S02', size_sqm:35, bedrooms:0, bathrooms:1, use_type:'commercial',  status:'vacant',      monthly_rent:75000 },
  ]
  await upsert('units', units)
  console.log(`✓ units (${units.length})`)

  // compound_id scopes all records to this property installation.
  // Single-property system — every record shares the same compound UUID.
  const CID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

  // ── People — id must be uuid; no joined_date col; compound_id required ──
  const people = [
    { id:P['P-01'], compound_id:CID, type:'non_resident_owner', first_name:'Grace',  last_name:'Njeri',    email:'grace@email.com',   phone:'+254712345678', status:'active', kyc_status:'approved',      national_id:'12345678A' },
    { id:P['P-02'], compound_id:CID, type:'non_resident_owner', first_name:'David',  last_name:'Kamau',    email:'david@email.com',   phone:'+254723456789', status:'active', kyc_status:'approved',      national_id:'23456789B' },
    { id:P['P-03'], compound_id:CID, type:'non_resident_owner', first_name:'Mary',   last_name:'Wanjiku',  email:'mary@email.com',    phone:'+254734567890', status:'active', kyc_status:'docs_uploaded', national_id:'34567890C' },
    { id:P['P-04'], compound_id:CID, type:'non_resident_owner', first_name:'Ann',    last_name:'Mutua',    email:'ann@email.com',     phone:'+254745678901', status:'active', kyc_status:'approved',      national_id:'45678901D' },
    { id:P['P-05'], compound_id:CID, type:'non_resident_owner', first_name:'John',   last_name:'Mutua',    email:'john@email.com',    phone:'+254756789012', status:'active', kyc_status:'approved',      national_id:'56789012E' },
    { id:P['P-06'], compound_id:CID, type:'resident_owner',     first_name:'Lucy',   last_name:'Kariuki',  email:'lucy@email.com',    phone:'+254767890123', status:'active', kyc_status:'approved',      national_id:'67890123F' },
    { id:P['P-07'], compound_id:CID, type:'non_resident_owner', first_name:'Sam',    last_name:'Njoroge',  email:'sam@email.com',     phone:'+254778901234', status:'active', kyc_status:'pending_docs',  national_id:'78901234G' },
    { id:P['P-08'], compound_id:CID, type:'resident_owner',     first_name:'Tom',    last_name:'Oduya',    email:'tom@email.com',     phone:'+254789012345', status:'active', kyc_status:'approved',      national_id:'89012345H' },
    { id:P['P-09'], compound_id:CID, type:'non_resident_owner', first_name:'Jane',   last_name:'Muthoni',  email:'jane@email.com',    phone:'+254790123456', status:'active', kyc_status:'approved',      national_id:'90123456I' },
    { id:P['T-01'], compound_id:CID, type:'tenant',             first_name:'James',  last_name:'Mwangi',   email:'james@email.com',   phone:'+254700234567', status:'active', kyc_status:'approved',      national_id:'11111111A' },
    { id:P['T-02'], compound_id:CID, type:'tenant',             first_name:'Sarah',  last_name:'Otieno',   email:'sarah@email.com',   phone:'+254700345678', status:'active', kyc_status:'docs_uploaded', national_id:'22222222B' },
    { id:P['T-03'], compound_id:CID, type:'tenant',             first_name:'Peter',  last_name:'Ochieng',  email:'peter@email.com',   phone:'+254700456789', status:'active', kyc_status:'approved',      national_id:'33333333C' },
    { id:P['T-04'], compound_id:CID, type:'tenant',             first_name:'Rose',   last_name:'Akinyi',   email:'rose@email.com',    phone:'+254700567890', status:'active', kyc_status:'pending_docs',  national_id:'44444444D' },
    { id:P['S-01'], compound_id:CID, type:'permanent_staff',    first_name:'Alice',  last_name:'Kamau',    email:'alice@estate.com',  phone:'+254722010101', status:'active', kyc_status:'approved',      national_id:'11223344'  },
    { id:P['S-02'], compound_id:CID, type:'permanent_staff',    first_name:'Bob',    last_name:'Ochieng',  email:'bob@estate.com',    phone:'+254733020202', status:'active', kyc_status:'approved',      national_id:'22334455'  },
    { id:P['S-03'], compound_id:CID, type:'casual_staff',       first_name:'Carol',  last_name:'Mwangi',   email:'carol@estate.com',  phone:'+254700890123', status:'active', kyc_status:'docs_uploaded', national_id:'33445566'  },
    { id:P['S-04'], compound_id:CID, type:'outsourced',         first_name:'Dan',    last_name:'Njoroge',  email:'dan@eagleeye.co.ke',phone:'+254700901234', status:'active', kyc_status:'not_started',   national_id:null        },
    { id:P['S-05'], compound_id:CID, type:'permanent_staff',    first_name:'Ruth',   last_name:'Adhiambo', email:'ruth@estate.com',   phone:'+254706050505', status:'active', kyc_status:'docs_uploaded', national_id:'55667788'  },
  ]
  await upsert('people', people)
  console.log(`✓ people (${people.length})`)

  // ── Departments ────────────────────────────────────────────────────────
  const departments = [
    { id:'DEPT-01', name:'Administration',  code:'ADMIN',  budget:500000 },
    { id:'DEPT-02', name:'Maintenance',     code:'MAINT',  budget:800000 },
    { id:'DEPT-03', name:'Security',        code:'SEC',    budget:600000 },
    { id:'DEPT-04', name:'Finance',         code:'FIN',    budget:400000 },
    { id:'DEPT-05', name:'Housekeeping',    code:'HOUSE',  budget:350000 },
  ]
  await upsert('departments', departments)
  console.log(`✓ departments (${departments.length})`)

  // ── Leases — tenant_id is uuid ─────────────────────────────────────────
  const leases = [
    { id:'L-001', unit_id:'U-101', tenant_id:P['T-01'], status:'active',  start_date:'2023-01-01', end_date:'2025-12-31', monthly_rent:45000, deposit:90000,  billing_cycle:'monthly', next_billing_date:'2026-07-01' },
    { id:'L-002', unit_id:'U-102', tenant_id:P['T-02'], status:'active',  start_date:'2022-10-01', end_date:'2025-09-30', monthly_rent:45000, deposit:90000,  billing_cycle:'monthly', next_billing_date:'2026-07-01' },
    { id:'L-003', unit_id:'U-201', tenant_id:P['T-03'], status:'active',  start_date:'2023-04-01', end_date:'2026-03-31', monthly_rent:60000, deposit:120000, billing_cycle:'monthly', next_billing_date:'2026-07-01' },
    { id:'L-004', unit_id:'U-302', tenant_id:P['T-04'], status:'active',  start_date:'2022-09-01', end_date:'2025-08-31', monthly_rent:65000, deposit:130000, billing_cycle:'monthly', next_billing_date:'2026-07-01' },
    { id:'L-005', unit_id:'U-103', tenant_id:P['T-01'], status:'expired', start_date:'2020-01-01', end_date:'2022-12-31', monthly_rent:38000, deposit:76000,  billing_cycle:'monthly', next_billing_date:null },
  ]
  await upsert('leases', leases)
  console.log(`✓ leases (${leases.length})`)

  // ── Entry Points ───────────────────────────────────────────────────────
  const entryPoints = [
    { id:'EP-01', name:'Main Gate',       type:'gate',    location:'North entrance', is_active:true },
    { id:'EP-02', name:'Side Gate',       type:'gate',    location:'East side',      is_active:true },
    { id:'EP-03', name:'Parking Barrier', type:'barrier', location:'Basement',       is_active:true },
    { id:'EP-04', name:'Lobby Door',      type:'door',    location:'Ground floor',   is_active:true },
  ]
  await upsert('entry_points', entryPoints)
  console.log(`✓ entry_points (${entryPoints.length})`)

  // ── Vehicles — person_id is uuid ───────────────────────────────────────
  const vehicles = [
    { id:'V-01', person_id:P['P-01'], unit_id:'U-101', type:'car', make:'Toyota', model:'Prado', color:'Silver', plate:'KAA 001A', year:2020 },
    { id:'V-02', person_id:P['T-01'], unit_id:'U-101', type:'car', make:'Suzuki', model:'Swift',  color:'White',  plate:'KBB 002B', year:2019 },
    { id:'V-03', person_id:P['T-03'], unit_id:'U-201', type:'car', make:'Mazda',  model:'CX-5',   color:'Black',  plate:'KCC 003C', year:2021 },
  ]
  await upsert('vehicles', vehicles)
  console.log(`✓ vehicles (${vehicles.length})`)

  // ── Rules ──────────────────────────────────────────────────────────────
  const rules = [
    { id:'R-01', title:'No Noise After 10pm',         category:'Conduct',    description:'No loud music or noise after 10pm',                  penalty:5000,  status:'active' },
    { id:'R-02', title:'Waste Segregation',            category:'Sanitation', description:'Sort waste into organic/recyclable/hazardous bins',  penalty:2000,  status:'active' },
    { id:'R-03', title:'Pets Require Approval',        category:'Pets',       description:'All pets must be approved by management',            penalty:0,     status:'active' },
    { id:'R-04', title:'No Subletting Without Consent',category:'Lease',      description:'Subletting requires written approval',               penalty:10000, status:'active' },
  ]
  await upsert('rules', rules)
  console.log(`✓ rules (${rules.length})`)

  // ── Consumables ────────────────────────────────────────────────────────
  const consumables = [
    { id:'C-01', name:'Chlorine Tablets',  category:'Water Treatment', quantity:50,  reorder_level:20, unit_price:250,  status:'in_stock'     },
    { id:'C-02', name:'Detergent 5L',      category:'Cleaning',        quantity:8,   reorder_level:10, unit_price:1200, status:'low_stock'    },
    { id:'C-03', name:'Light Bulbs (LED)', category:'Electrical',      quantity:0,   reorder_level:5,  unit_price:350,  status:'out_of_stock' },
    { id:'C-04', name:'Garbage Bags 100pk',category:'Sanitation',      quantity:30,  reorder_level:10, unit_price:450,  status:'in_stock'     },
    { id:'C-05', name:'Toilet Paper 24pk', category:'Sanitation',      quantity:15,  reorder_level:5,  unit_price:800,  status:'in_stock'     },
  ]
  await upsert('consumables', consumables)
  console.log(`✓ consumables (${consumables.length})`)

  // ── Polls — created_by is uuid ─────────────────────────────────────────
  const polls = [
    { id:'POLL-01', title:'Rooftop Garden or Parking?', description:'Vote on how to use the rooftop space',   options:[{label:'Garden',votes:12},{label:'Parking',votes:7},{label:'Both',votes:3}], status:'active', closes_at:null, created_by:P['S-01'] },
    { id:'POLL-02', title:'Security Camera Coverage',   description:'Should we expand CCTV to stairwells?',   options:[{label:'Yes',votes:18},{label:'No',votes:2}],                               status:'closed', closes_at:null, created_by:P['S-01'] },
  ]
  await upsert('polls', polls)
  console.log(`✓ polls (${polls.length})`)

  // ── Meters ─────────────────────────────────────────────────────────────
  const meters = [
    { id:'M-01', unit_id:'U-101', category:'electricity', serial_number:'E-10011', billing_mode:'unit_rate', rate_per_unit:22, status:'active' },
    { id:'M-02', unit_id:'U-101', category:'water',       serial_number:'W-10011', billing_mode:'unit_rate', rate_per_unit:85, status:'active' },
    { id:'M-03', unit_id:'U-102', category:'electricity', serial_number:'E-10021', billing_mode:'unit_rate', rate_per_unit:22, status:'active' },
    { id:'M-04', unit_id:'U-201', category:'electricity', serial_number:'E-20011', billing_mode:'unit_rate', rate_per_unit:22, status:'active' },
    { id:'M-05', unit_id:'U-302', category:'water',       serial_number:'W-30021', billing_mode:'unit_rate', rate_per_unit:85, status:'active' },
  ]
  await upsert('meters', meters)
  console.log(`✓ meters (${meters.length})`)

  // ── Household Members — person_id is uuid ──────────────────────────────
  const householdMembers = [
    { id:'HM-01', person_id:P['T-01'], unit_id:'U-101', name:'Mary Mwangi',  relationship:'Spouse', dob:'1990-05-15', is_active:true },
    { id:'HM-02', person_id:P['T-01'], unit_id:'U-101', name:'Kevin Mwangi', relationship:'Child',  dob:'2015-08-22', is_active:true },
    { id:'HM-03', person_id:P['T-03'], unit_id:'U-201', name:'Anne Ochieng', relationship:'Spouse', dob:'1988-11-30', is_active:true },
  ]
  await upsert('household_members', householdMembers)
  console.log(`✓ household_members (${householdMembers.length})`)

  // ── Emergency Contacts — person_id is uuid ─────────────────────────────
  const emergencyContacts = [
    { id:'EC-01', person_id:P['T-01'], name:'Michael Mwangi',  relationship:'Father',  phone:'+254722100100', is_primary:true },
    { id:'EC-02', person_id:P['T-02'], name:'Catherine Otieno', relationship:'Mother', phone:'+254733200200', is_primary:true },
    { id:'EC-03', person_id:P['T-03'], name:'Paul Ochieng',     relationship:'Brother',phone:'+254744300300', is_primary:true },
  ]
  await upsert('emergency_contacts', emergencyContacts)
  console.log(`✓ emergency_contacts (${emergencyContacts.length})`)

  // ── Work Orders ────────────────────────────────────────────────────────
  const workOrders = [
    { id:'WO-001', unit_id:'U-101', category:'plumbing',   priority:'high',    status:'in_progress', title:'Leaking kitchen tap',          description:'Tenant reports constant drip',  estimated_cost:3500,  actual_cost:null },
    { id:'WO-002', unit_id:'U-302', category:'electrical', priority:'medium',  status:'open',        title:'Faulty socket in bedroom 2',   description:'Socket sparks when used',        estimated_cost:1500,  actual_cost:null },
    { id:'WO-003', unit_id:'U-301', category:'structural', priority:'critical',status:'in_progress', title:'Ceiling crack in living room', description:'5cm crack after rains',          estimated_cost:25000, actual_cost:null },
    { id:'WO-004', unit_id:'U-202', category:'appliances', priority:'low',     status:'completed',   title:'Fridge not cooling',           description:'BnB unit fridge repaired',       estimated_cost:null,  actual_cost:8000 },
  ]
  await upsert('work_orders', workOrders)
  console.log(`✓ work_orders (${workOrders.length})`)

  // ── Inspections ────────────────────────────────────────────────────────
  const inspections = [
    { id:'INS-01', unit_id:'U-103', type:'move_in',  status:'scheduled',  scheduled_at:'2026-07-15T09:00:00Z', completed_at:null, score:null },
    { id:'INS-02', unit_id:'U-302', type:'routine',  status:'completed',  scheduled_at:null,                   completed_at:'2026-05-20T10:00:00Z', score:82 },
    { id:'INS-03', unit_id:'U-301', type:'emergency',status:'in_progress',scheduled_at:'2026-06-10T08:00:00Z', completed_at:null, score:null },
  ]
  await upsert('inspections', inspections)
  console.log(`✓ inspections (${inspections.length})`)

  // ── Notices — person_id is uuid ────────────────────────────────────────
  const notices = [
    { id:'N-001', person_id:P['T-02'], unit_id:'U-102', type:'demand_letter', status:'sent',  title:'Rent Arrears – June 2026',  due_date:'2026-06-30', sent_at:'2026-06-05T08:00:00Z', body:null },
    { id:'N-002', person_id:P['T-04'], unit_id:'U-302', type:'lease_renewal', status:'sent',  title:'Lease Renewal Notice',      due_date:'2026-08-01', sent_at:'2026-06-01T08:00:00Z', body:null },
    { id:'N-003', person_id:P['T-01'], unit_id:'U-101', type:'general',       status:'draft', title:'Upcoming Water Interruption', due_date:null,         sent_at:null,                  body:null },
  ]
  await upsert('notices', notices)
  console.log(`✓ notices (${notices.length})`)

  // ── Visitors — host_person_id is uuid ──────────────────────────────────
  const visitors = [
    { id:'VIS-01', host_person_id:P['T-01'], host_unit_id:'U-101', name:'Kevin Gitau',    phone:'+254700111222', purpose:'Personal visit',  status:'arrived',  arrived_at:'2026-06-14T10:00:00Z', departed_at:null },
    { id:'VIS-02', host_person_id:P['T-03'], host_unit_id:'U-201', name:'Delivery – DHL', phone:'+254700333444', purpose:'Package delivery', status:'departed', arrived_at:'2026-06-14T09:00:00Z', departed_at:'2026-06-14T09:15:00Z' },
  ]
  await upsert('visitors', visitors)
  console.log(`✓ visitors (${visitors.length})`)

  // ── Audit Events — actor_id is uuid ────────────────────────────────────
  const auditEvents = [
    { id:'AUD-01', actor_id:P['S-01'], action:'lease.created',   entity_type:'lease',  entity_id:'L-001',   created_at:'2023-01-01T08:00:00Z' },
    { id:'AUD-02', actor_id:P['S-01'], action:'person.approved', entity_type:'person', entity_id:P['T-01'], created_at:'2023-01-01T09:00:00Z' },
    { id:'AUD-03', actor_id:P['S-02'], action:'charge.created',  entity_type:'charge', entity_id:'CHG-001', created_at:'2026-06-01T08:00:00Z' },
  ]
  await upsert('audit_events', auditEvents)
  console.log(`✓ audit_events (${auditEvents.length})`)

  console.log('\n✅ Seed complete! All data is now in Supabase.')
}

seed().catch(err => {
  console.error('\n✗ Seed failed:', err.message)
  process.exit(1)
})
