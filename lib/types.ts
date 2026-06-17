// ── Unit ──────────────────────────────────────────────────────────────────
export type UnitUseType = 'residential' | 'commercial' | 'bnb' | 'office' | 'vacant'
export type UnitStatus  = 'occupied' | 'vacant' | 'maintenance' | 'reserved'

export interface Unit {
  id: string
  block: string
  floor: number
  number: string
  size_sqm: number
  bedrooms: number
  bathrooms: number
  use_type: UnitUseType
  status: UnitStatus
  monthly_rate: number
  owners: UnitOwner[]
  current_occupant?: string
  lease_end?: string
}

export type OwnershipType = 'individual' | 'company'

export interface UnitOwner {
  person_id?: string
  company_id?: string
  ownership_type: OwnershipType
  name: string                  // person full name OR company name
  share_percent: number
  is_resident: boolean
  is_primary: boolean
}

// ── Person ─────────────────────────────────────────────────────────────────
export type PersonType =
  | 'resident_owner' | 'non_resident_owner'
  | 'tenant' | 'short_stay_guest'
  | 'permanent_staff' | 'casual_staff' | 'outsourced'

export type PersonStatus = 'pending_verification' | 'active' | 'inactive' | 'suspended' | 'former'

export type KycStatus =
  | 'not_started'
  | 'pending_docs'
  | 'docs_uploaded'
  | 'approved'
  | 'rejected'

export type KycDocumentType =
  | 'national_id'
  | 'passport'
  | 'employment_letter'
  | 'payslip'
  | 'bank_statement'
  | 'title_deed'
  | 'sale_agreement'
  | 'cert_of_incorporation'
  | 'cr12'
  | 'police_clearance'
  | 'reference_letter'
  | 'employment_contract'
  | 'guarantor_form'
  | 'agency_clearance'
  | 'other'

export interface KycDocument {
  id: string
  person_id?: string
  company_id?: string
  document_type: KycDocumentType
  file_url: string
  file_name: string
  uploaded_at: string
  uploaded_by: string
  verified_at?: string
  rejected_at?: string
  rejection_reason?: string
  notes?: string
}

export interface Person {
  id: string
  type: PersonType
  first_name: string
  last_name: string
  email: string
  phone: string                 // E.164 — masked in UI (+254 *** *** 789)
  national_id?: string          // masked in UI (******* 123A)
  avatar?: string
  unit_ids: string[]
  home_unit_id?: string
  status: PersonStatus
  kyc_status: KycStatus
  phone_verified_at?: string
  email_verified_at?: string
  joined_date: string
  // Outsourced staff only
  agency_name?: string
  agency_contact?: string
  agency_clearance_ref?: string
  is_outsourced?: boolean
}

// ── Company Owner ──────────────────────────────────────────────────────────
export interface CompanyOwner {
  id: string
  company_name: string
  registration_number?: string
  kra_pin?: string              // masked in UI
  email?: string
  phone?: string                // masked in UI
  authorized_rep_id?: string    // FK to Person
  authorized_rep_name?: string  // denormalised
  status: 'active' | 'suspended' | 'dissolved'
  cert_of_incorporation_url?: string
  cr12_url?: string
  unit_ids: string[]
  created_at: string
  notes?: string
}

// ── OTP / Reveal ──────────────────────────────────────────────────────────
export type OtpPurpose =
  | 'phone_verification'
  | 'reveal_phone'
  | 'reveal_national_id'
  | 'reveal_kra_pin'
  | 'portal_login'

export interface OtpVerification {
  id: string
  phone: string
  purpose: OtpPurpose
  person_id?: string
  requested_by?: string
  expires_at: string
  used_at?: string
  attempts: number
  created_at: string
}

export interface DataRevealAuditEntry {
  id: string
  revealed_field: 'phone' | 'national_id' | 'kra_pin'
  subject_type: 'person' | 'company'
  subject_id: string
  subject_name: string
  requested_by: string
  requested_by_name: string
  revealed_at: string
}

// ── Portal Invite ──────────────────────────────────────────────────────────
export interface PortalInvite {
  id: string
  person_id: string
  email: string
  sent_at: string
  expires_at: string
  accepted_at?: string
  resent_count: number
}

// ── Lease ──────────────────────────────────────────────────────────────────
export type LeaseStatus = 'active' | 'expired' | 'terminated' | 'notice_given' | 'draft'

export interface Lease {
  id: string
  unit_id: string
  unit_label: string
  tenant_id: string
  tenant_name: string
  start_date: string
  end_date: string
  monthly_rent: number
  deposit: number
  status: LeaseStatus
  notice_date?: string
}

// ── Work Order ─────────────────────────────────────────────────────────────
export type WorkOrderStatus   = 'open' | 'in_progress' | 'completed' | 'cancelled'
export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface WorkOrder {
  id: string
  unit_id: string
  unit_label: string
  title: string
  description: string
  category: string
  priority: WorkOrderPriority
  status: WorkOrderStatus
  reported_by: string
  assigned_to?: string
  created_at: string
  resolved_at?: string
}

// ── Utility / Meter ────────────────────────────────────────────────────────
export type UtilityType =
  | 'water' | 'sewerage' | 'water_sewer'
  | 'electricity' | 'gas_piped' | 'gas_cylinder'
  | 'internet'

export type MeterType   = 'postpaid' | 'prepaid' | 'smart'
export type MeterStatus = 'active' | 'inactive' | 'replaced'

// Position of a meter in the water supply chain
export type MeterRole =
  | 'supplier'       // incoming from a water source
  | 'tank_inflow'    // at the pipe entering the reserve tank
  | 'tank_outflow'   // at the pipe leaving the reserve tank
  | 'distribution'   // zone/block meter between tank and units
  | 'consumer'       // individual unit meter (default)

export type BillingArrangement =
  | 'direct_bill'        // utility bill goes directly to occupant
  | 'billed_to_occupant' // management bills the occupant
  | 'billed_to_unit'     // billed against unit (owner pays)
  | 'included_in_rent'   // utility cost absorbed into rent
  | 'management_bill'    // management handles and recharges
  | 'bnb_absorbed'       // BnB operator absorbs the cost

export interface MeterBillingPerson {
  person_id: string
  name: string
}

export interface Meter {
  id: string
  unit_id?: string              // undefined for supplier/tank/distribution meters
  unit_label?: string           // display name — unit label OR "Supplier: NCWSC" etc.
  utility_type: UtilityType
  meter_type: MeterType
  meter_number: string
  account_number: string
  installation_date: string
  status: MeterStatus
  current_billing_person?: MeterBillingPerson
  billing_arrangement: BillingArrangement
  management_fee_pct?: number
  last_reading?: number
  last_reading_date?: string
  // Water supply chain position
  meter_role?: MeterRole        // defaults to 'consumer' when absent
  supplier_id?: string          // links to WaterSupplier if role = 'supplier'
  tank_id?: string              // links to ReserveTank if role = 'tank_*'
  zone_id?: string              // links to WaterZone if role = 'distribution'
}

export type MeterReadingSource = 'manual' | 'estimated' | 'auto' | 'smart_iot'
export type MeterReadingStatus = 'draft' | 'pending_bill' | 'billed' | 'cancelled'

export interface MeterReading {
  id: string
  meter_id: string
  unit_label: string
  utility_type: UtilityType
  meter_number: string
  previous_value: number
  current_value: number
  units_consumed: number
  reading_date: string
  billing_period: string
  source: MeterReadingSource
  read_by: string
  unit_cost: number
  amount_due: number
  management_fee?: number
  status: MeterReadingStatus
}

export interface MeterTypeHistory {
  id: string
  meter_id: string
  unit_label: string
  from_type: MeterType
  to_type: MeterType
  migration_date: string
  final_reading: number
  migrated_by: string
  notes?: string
}

// ── Expanded Charge Types ─────────────────────────────────────────────────
export type ChargeType =
  | 'rent'
  | 'utility_water' | 'utility_water_sewer' | 'utility_sewerage'
  | 'utility_electricity' | 'utility_gas' | 'utility_internet'
  | 'utility_management_fee'
  | 'service_charge'
  | 'advertisement'
  | 'fine'
  | 'penalty'
  | 'deposit'
  | 'key_replacement'
  | 'other'

export type ChargeStatus = 'pending' | 'paid' | 'overdue' | 'waived' | 'partial'

export interface Charge {
  id: string
  unit_id: string
  unit_label: string
  person_id: string
  person_name: string
  type: ChargeType
  amount: number
  paid_amount?: number
  due_date: string
  paid_date?: string
  status: ChargeStatus
  period: string
  description?: string
  meter_reading_id?: string
  receipt_no?: string
}

// ── Vehicle ────────────────────────────────────────────────────────────────
export type VehicleType = 'car' | 'suv' | 'pickup' | 'motorcycle' | 'van' | 'truck' | 'bicycle' | 'other'
export type VehicleStatus = 'active' | 'suspended' | 'blacklisted' | 'deregistered'

export interface Vehicle {
  id: string
  unit_id: string
  unit_label: string
  household_id: string
  registered_to_person_id: string
  registered_to_name: string
  make: string
  model: string
  year: number
  color: string
  plate_number: string           // primary identifier at the gate
  sticker_number?: string        // facility-issued physical sticker
  vehicle_type: VehicleType
  status: VehicleStatus
  registered_date: string
  insurance_expiry?: string
  notes?: string
}

// ── Household Member ───────────────────────────────────────────────────────
export type MemberRelationship =
  | 'spouse' | 'child' | 'parent' | 'sibling'
  | 'partner' | 'relative' | 'other'

export interface HouseholdMember {
  id: string
  household_id: string
  unit_id: string
  first_name: string
  last_name: string
  relationship: MemberRelationship
  national_id?: string
  phone?: string
  email?: string
  date_of_birth?: string
  is_minor: boolean
  can_authorize_visitors: boolean  // adult members who can approve visitors at gate
  photo_url?: string
  status: 'active' | 'inactive'
  added_date: string
}

// ── Emergency Contact ──────────────────────────────────────────────────────
export interface EmergencyContact {
  id: string
  person_id: string               // whose emergency contact this is
  unit_id: string
  name: string
  relationship: string            // free text — "Mother", "Brother", "Doctor"
  phone_primary: string
  phone_secondary?: string
  email?: string
  address?: string
  priority: 1 | 2 | 3            // contact order
  notes?: string
}

// ── Personal Staff ─────────────────────────────────────────────────────────
export type PersonalStaffRole =
  | 'nanny' | 'driver' | 'housekeeper' | 'gardener'
  | 'cook' | 'security_personal' | 'other'

export type PersonalStaffAccessDays =
  | 'weekdays' | 'weekends' | 'all' | 'custom'

export interface PersonalStaff {
  id: string
  household_id: string
  unit_id: string
  unit_label: string
  employer_person_id: string     // resident who employs them
  employer_name: string
  first_name: string
  last_name: string
  national_id: string
  phone: string
  role: PersonalStaffRole
  status: 'active' | 'suspended' | 'terminated'
  access_days: PersonalStaffAccessDays
  access_hours_start?: string    // e.g. "07:00"
  access_hours_end?: string      // e.g. "20:00"
  background_check_done: boolean
  background_check_date?: string
  approved_by?: string           // facility manager who approved
  approved_date?: string
  photo_url?: string
  registered_date: string
  notes?: string
}

// ── Household ──────────────────────────────────────────────────────────────
export interface Household {
  id: string
  unit_id: string
  unit_label: string
  primary_person_id: string
  primary_person_name: string
  status: 'active' | 'vacated'
  move_in_date: string
  move_out_date?: string
  members: HouseholdMember[]
  vehicles: Vehicle[]
  personal_staff: PersonalStaff[]
  emergency_contacts: EmergencyContact[]
}

// ── HR / Facility Staff ────────────────────────────────────────────────────
export type FacilityStaffType = 'permanent' | 'casual' | 'outsourced'
export type ContractStatus = 'active' | 'expired' | 'terminated' | 'probation'

export interface Department {
  id: string
  name: string
  description?: string
  head_person_id?: string        // FK → Person (a facility staff member who leads it)
  budget_monthly?: number
  created_at: string
}

export interface FacilityStaffMember {
  id: string
  person_id: string              // FK → Person (source of truth for name, phone, ID, KYC)
  // ── Employment fields only — personal details are on Person ──
  staff_type: FacilityStaffType
  department_id: string          // FK → Department
  job_title: string
  reporting_to?: string
  contract_status: ContractStatus
  start_date: string
  end_date?: string              // for casual/outsourced
  probation_end_date?: string
  national_id_verified: boolean  // whether ID has been sighted/verified by management
  background_check_done: boolean
  background_check_date?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  notes?: string
}

export interface VendorContract {
  id: string
  vendor_name: string
  service_type: string           // Security, Cleaning, Landscaping, Waste, etc.
  contact_person: string
  contact_phone: string
  contact_email?: string
  contract_start: string
  contract_end: string
  monthly_value: number
  status: 'active' | 'expired' | 'terminated' | 'pending_renewal'
  department_id?: string         // optional — links vendor to a department
  notes?: string
}

// ── Consumables ────────────────────────────────────────────────────────────
export type IssueFrequency = 'monthly' | 'bi_monthly' | 'quarterly' | 'on_request'
export type IssuanceStatus = 'issued' | 'withheld' | 'pending'

export interface ConsumableType {
  id: string
  name: string                          // "Garbage Bags"
  description?: string
  unit_of_issue: string                 // "roll", "piece", "pack", "box"
  quantity_per_unit: number             // e.g. 10 bags per roll
  quantity_per_issue: number            // how many units given per issuance
  issue_frequency: IssueFrequency
  eligible_unit_types: UnitUseType[]    // which unit types receive this
  requires_clearance: boolean
  clearance_charge_types: ChargeType[]
  active: boolean
  notes?: string
}

export interface ConsumableIssuance {
  id: string
  consumable_type_id: string
  consumable_name: string
  unit_id: string
  unit_label: string
  person_id: string
  person_name: string
  quantity_issued: number
  issued_date: string
  billing_period: string               // "2024-06"
  issued_by: string
  status: IssuanceStatus
  withheld_reason?: string             // "Service charge outstanding: KES 3,500"
  notes?: string
}

export interface ConsumableStock {
  id: string
  consumable_type_id: string
  consumable_name: string
  current_stock: number
  unit_of_issue: string
  reorder_level: number                // trigger warning below this
  last_restocked_date: string
  last_restocked_quantity: number
  last_restocked_by: string
  notes?: string
}

// ── Water Supply Chain ─────────────────────────────────────────────────────
export type WaterSourceType = 'municipal' | 'borehole' | 'tanker' | 'recycled' | 'rainwater'

export interface WaterSupplier {
  id: string
  name: string
  source_type: WaterSourceType
  contact_name?: string
  contact_phone?: string
  contracted_rate_per_m3: number   // KES per cubic metre
  currency: string
  active: boolean
  meter_ids: string[]              // supplier meters that measure inflow from this source
  notes?: string
}

export interface ReserveTank {
  id: string
  name: string
  capacity_m3: number
  current_level_m3: number         // updated from sensor or manual dip
  location: string
  compartments: number
  inflow_meter_ids: string[]       // meters measuring water IN to tank
  outflow_meter_ids: string[]      // meters measuring water OUT of tank
  low_level_threshold_pct: number  // alert when level < X% of capacity
  notes?: string
}

export interface WaterZone {
  id: string
  name: string                     // "Block A", "Floors 1–4", "Commercial Wing"
  description?: string
  tank_id: string                  // which tank feeds this zone
  distribution_meter_id: string    // the zone-level meter
  unit_ids: string[]               // units whose consumer meters are in this zone
}

export interface WaterZoneBalance {
  zone_id: string
  zone_name: string
  distribution_m3: number          // what the zone meter recorded
  consumer_m3: number              // sum of all unit meters in this zone
  loss_m3: number                  // distribution - consumer
  loss_pct: number
}

export interface WaterBalancePeriod {
  id: string
  period: string                   // "2024-06"
  period_start: string
  period_end: string
  total_inflow_m3: number          // sum of supplier meters for the period
  total_outflow_m3: number         // sum of consumer unit meters
  tank_level_start_m3: number      // tank level at period start
  tank_level_end_m3: number        // tank level at period end
  tank_change_m3: number           // end - start (positive = topped up, negative = drew down)
  gross_loss_m3: number            // inflow - outflow - tank_change
  loss_pct: number                 // (gross_loss / inflow) * 100
  zone_breakdown: WaterZoneBalance[]
  generated_at: string
  flagged: boolean                 // true when loss_pct exceeds threshold
  notes?: string
}
// ── Lease Lifecycle ────────────────────────────────────────────────────────
export type LeaseApplicationStatus =
  | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'withdrawn'

export type LeaseLifecycleStatus =
  | 'draft' | 'active' | 'notice_given' | 'expired' | 'terminated' | 'renewed'

export interface LeaseApplication {
  id: string
  unit_id: string
  unit_label: string
  applicant_name: string
  applicant_email: string
  applicant_phone: string
  national_id: string
  employer?: string
  monthly_income?: number
  submitted_date: string
  status: LeaseApplicationStatus
  reviewed_by?: string
  review_date?: string
  rejection_reason?: string
  notes?: string
}

export interface DepositLedgerEntry {
  id: string
  lease_id: string
  type: 'received' | 'deduction' | 'refund' | 'top_up'
  amount: number
  date: string
  description: string
  recorded_by: string
  reference?: string
}

export interface LeaseEvent {
  id: string
  lease_id: string
  event_type:
    | 'created' | 'activated' | 'notice_issued' | 'notice_withdrawn'
    | 'rent_increased' | 'renewed' | 'terminated' | 'expired' | 'inspection_done'
    | 'deposit_received' | 'deposit_refunded' | 'document_added'
  date: string
  description: string
  performed_by: string
  metadata?: Record<string, string>
}

// ── Inspection ─────────────────────────────────────────────────────────────
export type InspectionType = 'move_in' | 'move_out' | 'periodic' | 'defect_check'
export type InspectionStatus = 'scheduled' | 'in_progress' | 'completed' | 'signed_off'
export type ConditionRating = 1 | 2 | 3 | 4 | 5  // 1=poor, 5=excellent
export type DefectSeverity = 'minor' | 'moderate' | 'major' | 'critical'

export interface InspectionDefect {
  id: string
  room: string
  description: string
  severity: DefectSeverity
  chargeable: boolean
  estimated_cost?: number
  status: 'open' | 'resolved' | 'disputed'
  photo_urls?: string[]
}

export interface InspectionRoom {
  name: string                   // "Living Room", "Master Bedroom", "Kitchen"
  condition: ConditionRating
  notes?: string
  defects: InspectionDefect[]
}

export interface Inspection {
  id: string
  unit_id: string
  unit_label: string
  lease_id?: string
  inspection_type: InspectionType
  status: InspectionStatus
  scheduled_date: string
  completed_date?: string
  inspector_name: string
  resident_present: boolean
  resident_name?: string
  overall_condition: ConditionRating
  rooms: InspectionRoom[]
  general_notes?: string
  resident_signature?: string
  manager_signature?: string
  signed_off_date?: string
  signed_off_by?: string
}

// ── Onboarding ─────────────────────────────────────────────────────────────
export type OnboardingStage =
  | 'applied'
  | 'under_review'
  | 'approved'
  | 'lease_signing'
  | 'deposit_payment'
  | 'move_in_inspection'
  | 'key_handover'
  | 'active'

export type OnboardingStatus = 'in_progress' | 'completed' | 'cancelled' | 'on_hold'

export interface OnboardingStageRecord {
  stage: OnboardingStage
  completed_at?: string
  completed_by?: string
  notes?: string
}

export interface OnboardingApplication {
  id: string
  unit_id: string
  unit_label: string
  applicant_name: string
  applicant_email: string
  applicant_phone: string
  national_id: string
  current_stage: OnboardingStage
  status: OnboardingStatus
  submitted_date: string
  target_move_in: string
  lease_id?: string
  stage_history: OnboardingStageRecord[]
  assigned_to?: string
  notes?: string
}

// ── Visitor ────────────────────────────────────────────────────────────────
export type VisitorPurpose =
  | 'personal_visit' | 'delivery' | 'contractor' | 'viewing'
  | 'event' | 'service' | 'other'

export type VisitorStatus = 'expected' | 'signed_in' | 'signed_out' | 'denied'

export type PassType = 'single_use' | 'multi_use' | 'recurring' | 'contractor'

export interface Visitor {
  id: string
  full_name: string
  phone: string
  national_id?: string
  host_unit_id: string
  host_unit_label: string
  host_name: string
  purpose: VisitorPurpose
  vehicle_plate?: string
  expected_date?: string
  time_in?: string
  time_out?: string
  signed_in_by?: string
  signed_out_by?: string
  status: VisitorStatus
  denied_reason?: string
  notes?: string
  // Premium fields
  is_pre_registered?: boolean
  recurring_profile_id?: string
  pass_id?: string
}

export interface VisitorPass {
  id: string
  visitor_id?: string
  pass_type: PassType
  visitor_name: string
  host_unit_id: string
  host_unit_label: string
  valid_from: string
  valid_until: string
  max_uses?: number
  used_count: number
  vehicle_plates?: string[]
  access_hours_start?: string
  access_hours_end?: string
  issued_by: string
  issued_at: string
  active: boolean
  notes?: string
}

export interface GateLog {
  id: string
  timestamp: string
  direction: 'entry' | 'exit'
  person_name: string
  person_type: 'resident' | 'visitor' | 'staff' | 'contractor' | 'vehicle_only'
  unit_id?: string
  unit_label?: string
  vehicle_plate?: string
  pass_id?: string
  visitor_id?: string
  verified_by?: string
  method: 'manual' | 'card' | 'qr' | 'plate_recognition' | 'intercom'
  notes?: string
}

// ── House Rules & Breaches ─────────────────────────────────────────────────
export type RuleCategory =
  | 'noise' | 'parking' | 'waste' | 'pets' | 'guests' | 'common_areas'
  | 'property_damage' | 'subletting' | 'payments' | 'safety' | 'other'

export type BreachSeverity = 'minor' | 'moderate' | 'serious' | 'critical'
export type BreachStatus = 'open' | 'warned' | 'fined' | 'resolved' | 'disputed'

export interface HouseRule {
  id: string
  title: string
  description: string
  category: RuleCategory
  severity: BreachSeverity        // default severity if breached
  fine_amount?: number            // default fine if escalated
  active: boolean
  added_date: string
}

export interface BreachRecord {
  id: string
  rule_id: string
  rule_title: string
  unit_id: string
  unit_label: string
  person_id?: string
  person_name: string
  incident_date: string
  reported_date: string
  reported_by: string
  severity: BreachSeverity
  description: string
  status: BreachStatus
  warning_issued_date?: string
  warning_issued_by?: string
  fine_charge_id?: string         // links to Charge in Financials
  fine_amount?: number
  resolved_date?: string
  resolution_notes?: string
  notes?: string
}

// ── Notice ─────────────────────────────────────────────────────────────────
export type NoticeType =
  | 'arrears_demand' | 'breach_notice' | 'notice_to_vacate'
  | 'rent_increase' | 'lease_renewal' | 'maintenance_notice'
  | 'general_notice' | 'eviction_notice'

export type NoticeStatus =
  | 'draft' | 'sent' | 'acknowledged' | 'disputed' | 'expired' | 'withdrawn'

export type NoticeDeliveryMethod = 'email' | 'sms' | 'hand_delivered' | 'posted'

export interface NoticeTemplate {
  id: string
  name: string
  notice_type: NoticeType
  subject: string
  body: string                    // supports {{variable}} placeholders
  variables: string[]             // list of variable names in the template
  active: boolean
}

export interface NoticeDelivery {
  method: NoticeDeliveryMethod
  delivered_at?: string
  delivered_to?: string
  acknowledged_at?: string
  failed?: boolean
  fail_reason?: string
}

export interface Notice {
  id: string
  notice_type: NoticeType
  template_id?: string
  unit_id: string
  unit_label: string
  person_id?: string
  person_name: string
  subject: string
  body: string
  status: NoticeStatus
  created_date: string
  sent_date?: string
  response_deadline?: string
  acknowledged_date?: string
  disputed_date?: string
  dispute_reason?: string
  delivery: NoticeDelivery[]
  created_by: string
  linked_breach_id?: string
  linked_charge_id?: string
  notes?: string
}

// ── Document ───────────────────────────────────────────────────────────────
export type DocumentCategory =
  | 'lease_agreement' | 'inspection_report' | 'id_kyc'
  | 'insurance' | 'compliance_certificate' | 'vendor_contract'
  | 'financial_statement' | 'notice' | 'correspondence' | 'other'

export type DocumentEntityType = 'unit' | 'person' | 'vendor' | 'lease' | 'general'

export interface FacilityDocument {
  id: string
  name: string
  category: DocumentCategory
  entity_type: DocumentEntityType
  entity_id?: string
  entity_label?: string
  file_url?: string
  file_size_kb?: number
  file_type?: string              // 'pdf', 'docx', 'jpg'
  upload_date: string
  uploaded_by: string
  expiry_date?: string            // for insurance, compliance certs, contracts
  expiry_alert_days?: number      // alert X days before expiry
  description?: string
  tags?: string[]
  status: 'active' | 'superseded' | 'archived'
}

// ── Communication / Message ────────────────────────────────────────────────
export type MessageAudienceType =
  | 'all_residents' | 'all_owners' | 'all_tenants' | 'block'
  | 'floor' | 'unit' | 'staff_only'

export type MessageChannel = 'sms' | 'email' | 'in_app' | 'whatsapp'
export type MessageStatus = 'draft' | 'sending' | 'sent' | 'failed' | 'partial'

export interface FacilityMessage {
  id: string
  subject: string
  body: string
  audience_type: MessageAudienceType
  audience_filter?: string        // block name, floor number, unit id
  recipient_count: number
  channels: MessageChannel[]
  status: MessageStatus
  created_by: string
  created_at: string
  sent_at?: string
  delivery_stats?: {
    sent: number
    delivered: number
    read?: number
    failed: number
  }
}

// ── Audit Trail ────────────────────────────────────────────────────────────
export type AuditModule =
  | 'people' | 'units' | 'leases' | 'financials' | 'utilities'
  | 'maintenance' | 'visitors' | 'notices' | 'rules' | 'documents'
  | 'consumables' | 'hr' | 'settings' | 'access' | 'onboarding' | 'inspections'

export type AuditAction =
  | 'created' | 'updated' | 'deleted' | 'approved' | 'rejected'
  | 'sent' | 'signed' | 'exported' | 'login' | 'logout'

export interface AuditEvent {
  id: string
  timestamp: string
  user_name: string
  user_role: string
  module: AuditModule
  action: AuditAction
  entity_type: string            // "Charge", "Lease", "Person", etc.
  entity_id: string
  entity_label: string           // human-readable name of the entity
  description: string            // full human-readable description
  ip_address?: string
  changes?: {                    // for 'updated' actions
    field: string
    from: string
    to: string
  }[]
}

// ── Preventive Maintenance Schedule ───────────────────────────────────────
export type MaintenanceFrequency = 'weekly' | 'monthly' | 'quarterly' | 'bi_annual' | 'annual'

export interface PreventiveSchedule {
  id: string
  title: string
  description: string
  category: string
  frequency: MaintenanceFrequency
  last_done_date?: string
  next_due_date: string
  assigned_to?: string
  vendor_id?: string
  estimated_cost?: number
  active: boolean
  notes?: string
}

// ── Short Stay Booking ─────────────────────────────────────────────────────
export type BookingStatus =
  | 'enquiry' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show'

export type BookingSource = 'direct' | 'airbnb' | 'booking_com' | 'expedia' | 'agent' | 'other'

export interface ShortStayBooking {
  id: string
  unit_id: string
  unit_label: string
  guest_name: string
  guest_email: string
  guest_phone: string
  guest_national_id?: string
  check_in_date: string
  check_out_date: string
  nights: number
  nightly_rate: number
  total_amount: number
  deposit_amount?: number
  status: BookingStatus
  source: BookingSource
  source_reference?: string
  adults: number
  children?: number
  special_requests?: string
  checked_in_at?: string
  checked_out_at?: string
  actual_departure?: string
  created_by: string
  created_at: string
  notes?: string
}

// ── Access Control ─────────────────────────────────────────────────────────
export type AccessZone = 'main_gate' | 'parking' | 'pool' | 'gym' | 'rooftop' | 'service_area' | 'all'
export type AccessLevelType = 'resident' | 'owner' | 'tenant' | 'staff' | 'visitor' | 'contractor'
export type BlacklistReason = 'security_threat' | 'unpaid_dues' | 'court_order' | 'management_decision' | 'other'

export interface AccessLevel {
  id: string
  name: string
  person_type: AccessLevelType
  zones: AccessZone[]
  valid_hours_start: string
  valid_hours_end: string
  valid_days: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[]
  active: boolean
}

export interface BlacklistEntry {
  id: string
  person_name: string
  national_id?: string
  vehicle_plates?: string[]
  reason: BlacklistReason
  description: string
  blacklisted_date: string
  blacklisted_by: string
  expires_date?: string
  active: boolean
}

// ── Vehicle Gate Pass ──────────────────────────────────────────────────────
export type VehiclePassStatus = 'active' | 'expired' | 'suspended' | 'revoked'

export interface VehicleGatePass {
  id: string
  vehicle_id: string
  plate_number: string
  vehicle_label: string          // "KCA 123A — White Toyota"
  unit_id: string
  unit_label: string
  owner_name: string
  sticker_number?: string
  pass_status: VehiclePassStatus
  valid_from: string
  valid_until?: string
  issued_date: string
  issued_by: string
  suspended_reason?: string
  notes?: string
}

export interface VehicleGateLog {
  id: string
  timestamp: string
  direction: 'entry' | 'exit'
  plate_number: string
  vehicle_label?: string
  unit_label?: string
  resident_name?: string
  pass_id?: string
  verified: boolean
  method: 'manual' | 'plate_recognition' | 'sticker_scan' | 'intercom'
  operator?: string
  notes?: string
}

// ─── INTEGRATIONS — Multi-provider registry ────────────────────────────────

export type IntegrationCategory =
  | 'mpesa'
  | 'sms'
  | 'whatsapp'
  | 'telegram'
  | 'email'

export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'testing'

// M-Pesa / Daraja API
export interface MPesaConfig {
  environment: 'sandbox' | 'production'
  shortcode: string                  // Paybill or Till number
  shortcode_type: 'paybill' | 'till'
  consumer_key: string
  consumer_secret: string
  passkey: string                    // Lipa Na M-Pesa passkey
  callback_url: string               // STK Push callback
  c2b_confirmation_url: string
  c2b_validation_url: string
  account_reference: string          // e.g. "RENT" shown on M-Pesa prompt
}

// Africa's Talking SMS
export interface AfricasTalkingConfig {
  api_key: string
  username: string                   // AT username (sandbox or production)
  sender_id?: string                 // Alphanumeric sender ID (requires approval)
  environment: 'sandbox' | 'production'
}

// Twilio SMS / WhatsApp
export interface TwilioConfig {
  account_sid: string
  auth_token: string
  from_number: string                // E.164 format, e.g. +12125551234
  whatsapp_number?: string           // WhatsApp-enabled number, e.g. whatsapp:+14155238886
  messaging_service_sid?: string
}

// Vonage (formerly Nexmo) SMS
export interface VonageConfig {
  api_key: string
  api_secret: string
  from_name: string                  // Alphanumeric sender, e.g. "AptManager"
}

// Meta WhatsApp Business API (Cloud API)
export interface WhatsAppMetaConfig {
  phone_number_id: string
  access_token: string               // Permanent system user token
  waba_id: string                    // WhatsApp Business Account ID
  verify_token: string               // Webhook verify token
  webhook_url: string
}

// Telegram Bot
export interface TelegramConfig {
  bot_token: string
  bot_username: string               // e.g. @ApartmentManagerBot
  management_chat_id?: string        // Default chat/group for management alerts
  webhook_url?: string
}

// SendGrid Email
export interface SendGridConfig {
  api_key: string
  from_email: string
  from_name: string
  reply_to?: string
}

export type IntegrationConfig =
  | ({ provider: 'mpesa_daraja' } & MPesaConfig)
  | ({ provider: 'africas_talking' } & AfricasTalkingConfig)
  | ({ provider: 'twilio' } & TwilioConfig)
  | ({ provider: 'vonage' } & VonageConfig)
  | ({ provider: 'whatsapp_meta' } & WhatsAppMetaConfig)
  | ({ provider: 'telegram' } & TelegramConfig)
  | ({ provider: 'sendgrid' } & SendGridConfig)

export type ProviderKey =
  | 'mpesa_daraja'
  | 'africas_talking'
  | 'twilio'
  | 'vonage'
  | 'whatsapp_meta'
  | 'telegram'
  | 'sendgrid'

export interface IntegrationProvider {
  id: string
  category: IntegrationCategory
  provider: ProviderKey
  display_name: string               // e.g. "Africa's Talking (SMS)"
  is_active: boolean                 // Only one per category can be active
  status: IntegrationStatus
  last_tested_at?: string
  last_error?: string
  config: IntegrationConfig
  created_at: string
  updated_at: string
}

// ─── PAYMENTS — M-Pesa transactions ────────────────────────────────────────

export type PaymentMethod =
  | 'mpesa_stk'      // STK Push (Lipa Na M-Pesa)
  | 'mpesa_c2b'      // Customer-to-Business (paybill manual payment)
  | 'bank_transfer'
  | 'cash'
  | 'cheque'

export type PaymentStatus =
  | 'pending'        // STK Push sent, awaiting callback
  | 'completed'      // Confirmed by Daraja callback
  | 'failed'         // Daraja returned ResultCode != 0
  | 'cancelled'      // User cancelled on phone
  | 'reversed'       // Daraja reversal processed
  | 'reconciled'     // Manually matched to a charge

export interface PaymentTransaction {
  id: string
  charge_ids: string[]               // One payment can settle multiple charges
  unit_id: string
  unit_label: string
  tenant_id: string
  tenant_name: string
  amount: number
  currency: string                   // 'KES'
  method: PaymentMethod
  status: PaymentStatus
  // M-Pesa fields (populated after Daraja callback)
  mpesa_receipt_number?: string      // e.g. "PGH4KXYZ3Q"
  mpesa_phone?: string               // Phone that paid, e.g. "0712345678"
  mpesa_account_ref?: string         // Account reference entered by payer
  mpesa_transaction_date?: string    // From Daraja TransactionDate
  merchant_request_id?: string       // STK Push merchant request ID
  checkout_request_id?: string       // STK Push checkout request ID
  result_code?: number               // 0 = success
  result_desc?: string
  // Manual fields
  reference?: string                 // Bank ref, cheque number, etc.
  received_by?: string               // Staff who recorded cash
  notes?: string
  initiated_at: string
  confirmed_at?: string
}

// ─── BILLING CYCLE ───────────────────────────────────────────

// ─── BILLING CYCLE ─────────────────────────────────────────────────────────

export type BillingCycle = 'monthly' | 'quarterly' | 'semi_annual' | 'annual'

export interface BillingRunItem {
  lease_id: string
  unit_label: string
  tenant_name: string
  charge_type: 'rent' | 'service_charge' | 'utility' | 'penalty'
  amount: number
  period: string        // 'YYYY-MM'
  pro_rated: boolean
  billing_cycle: BillingCycle
}

// ─── ALERT NOTIFICATIONS ───────────────────────────────────────────────────

export type AlertSeverity = 'critical' | 'warning' | 'info'

export type AlertCategory =
  | 'payment_overdue'
  | 'lease_expiry'
  | 'disconnection_due'
  | 'maintenance_overdue'
  | 'low_stock'
  | 'water_loss'
  | 'document_expiry'
  | 'inspection_due'
  | 'breach_escalation'

export interface AlertNotification {
  id: string
  category: AlertCategory
  severity: AlertSeverity
  title: string
  body: string
  link_href?: string
  link_label?: string
  created_at: string
  read: boolean
  unit_id?: string
  unit_label?: string
}


// ─── ENGAGEMENT — Polls, Votes, Anonymous Feedback ────────────────────────

export type EngagementType   = 'poll' | 'vote' | 'feedback'
export type EngagementStatus = 'draft' | 'open' | 'closed' | 'cancelled'
export type VoteWeight       = 'equal' | 'by_share_percent'
export type EligibleGroup    = 'owners' | 'tenants' | 'all_residents' | 'staff'

export interface EngagementOption {
  id: string
  label: string
}

export interface EngagementResult {
  option_id: string
  label: string
  count: number
  percent: number
  weighted_percent?: number    // for votes weighted by share_percent
}

export interface Engagement {
  id: string
  type: EngagementType
  title: string
  description?: string
  status: EngagementStatus

  // Who can participate
  eligible: EligibleGroup
  // For vote: weight responses by ownership share_percent
  vote_weight?: VoteWeight
  quorum_percent?: number       // minimum participation required (%)
  resolution_text?: string      // formal resolution text for type='vote'

  // For feedback: truly anonymous (no person linkage stored)
  is_anonymous: boolean

  // Options shown to participants (undefined = open-text feedback)
  options?: EngagementOption[]

  opens_at: string
  closes_at: string
  created_by: string
  created_at: string

  // Aggregate results
  total_eligible?: number
  total_responses?: number
  results?: EngagementResult[]
  passed?: boolean              // for vote: reached quorum AND majority?
}

export interface EngagementResponse {
  id: string
  engagement_id: string
  person_id?: string            // set for named polls/votes
  responder_hash?: string       // one-way hash for anonymous feedback (cannot be reversed)
  selected_option_ids: string[]
  open_text?: string
  submitted_at: string
}

// ── Entry Points & Access Devices ─────────────────────────────────────────────

export type EntryPointType      = 'pedestrian' | 'vehicle' | 'service' | 'emergency' | 'mixed'
export type EntryPointDirection = 'entry' | 'exit' | 'both'
export type EntryPointStatus    = 'active' | 'locked' | 'fault' | 'maintenance'

export interface OperatingHours {
  always_open: boolean
  open_time?: string   // e.g. "06:00"
  close_time?: string  // e.g. "22:00"
  days?: string[]      // ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
}

export interface EntryPoint {
  id: string
  name: string
  type: EntryPointType
  direction: EntryPointDirection
  status: EntryPointStatus
  location_description?: string
  operating_hours: OperatingHours
  requires_staff?: boolean       // manned gate vs automated
  notes?: string
  created_at: string
}

export type AccessDeviceType   = 'biometric_fingerprint' | 'biometric_face' | 'rfid_reader' | 'anpr_camera' | 'intercom' | 'boom_gate_controller' | 'magloc_controller' | 'keypad'
export type AccessDeviceStatus = 'online' | 'offline' | 'fault' | 'maintenance'

export interface AccessDevice {
  id: string
  entry_point_id: string
  name: string                   // e.g. "Main Gate Fingerprint Reader"
  device_type: AccessDeviceType
  make: string                   // e.g. "ZKTECO"
  model: string                  // e.g. "SF100"
  serial_number?: string
  firmware_version?: string
  ip_address?: string
  status: AccessDeviceStatus
  last_heartbeat?: string
  installed_at: string
  notes?: string
}

export interface AccessLogEntry {
  id: string
  entry_point_id: string
  device_id?: string             // null for manual log
  person_id?: string             // null for unrecognised / visitor
  vehicle_id?: string
  visitor_id?: string
  direction: 'in' | 'out'
  method: 'biometric' | 'rfid' | 'anpr' | 'manual' | 'intercom_buzz' | 'mobile_qr'
  result: 'granted' | 'denied' | 'tailgate_alert'
  timestamp: string
  notes?: string
}

export interface AccessRule {
  id: string
  name: string
  entry_point_ids: string[]      // which gates this rule applies to
  // who is allowed
  applies_to: 'all_residents' | 'owners' | 'tenants' | 'staff' | 'specific_units' | 'specific_persons'
  unit_ids?: string[]
  person_ids?: string[]
  // when
  operating_hours: OperatingHours
  is_active: boolean
  created_at: string
}

// ── Meter extended types ───────────────────────────────────────────────────

export type MeterCategory     = 'water' | 'electricity' | 'gas'
export type MeterBillingMode  = 'postpaid' | 'prepaid'

export type WaterMeterSubtype =
  | 'bulk'         // building main from utility
  | 'unit_sub'     // per-apartment sub-meter
  | 'borehole'     // own borehole / well
  | 'recycled'     // grey / recycled water circuit
  | 'fire_main'    // fire suppression (non-billing)

export type ElectricityMeterSubtype =
  | 'bulk'         // building main
  | 'unit_sub'     // per-apartment
  | 'common_area'  // lifts, lobby, parking
  | 'solar_export' // net metering / solar feed-in

export type GasMeterSubtype =
  | 'bulk'         // building main
  | 'unit_sub'     // per-apartment
  | 'lpg_tank'     // LPG tank gauge

// Expanded meter status including inventory lifecycle
export type MeterStatusExtended =
  | 'inventory'           // registered, not yet assigned/installed
  | 'active'              // installed and operational
  | 'fault'               // hardware or reading issue
  | 'disconnected'        // deliberately disconnected
  | 'pending_replacement' // flagged for swap
  | 'decommissioned'      // permanently removed

// Category-specific technical specifications
export interface WaterMeterSpecs {
  pipe_diameter_mm: 15 | 20 | 25 | 32 | 40 | 50 | 80 | 100
  meter_class: 'B' | 'C' | 'D'
  connection_type: 'inline' | 'turbine' | 'ultrasonic' | 'electromagnetic'
  max_flow_rate_lph?: number
}

export interface ElectricityMeterSpecs {
  phase: 'single' | 'three'
  ct_ratio?: string       // e.g. "100/5" for large/bulk meters
  max_demand_kva?: number
  voltage_rating?: '240V' | '415V' | '11kV'
}

export interface GasMeterSpecs {
  gas_type: 'natural_gas' | 'lpg'
  capacity_m3_per_hr: number
  working_pressure_mbar: number
}

// Calibration certificate (optional on all meter types)
export interface MeterCalibration {
  cert_number?: string
  calibration_date?: string
  expiry_date?: string
  calibrated_by?: string
  document_uploaded?: boolean
}

// Extended meter record (additive — does not break existing Meter)
export interface MeterExtended {
  id: string

  // Classification
  category: MeterCategory
  meter_subtype: WaterMeterSubtype | ElectricityMeterSubtype | GasMeterSubtype
  billing_mode: MeterBillingMode

  // Identity
  serial_number: string
  make?: string
  model?: string
  meter_number?: string          // utility/manufacturer meter number
  utility_account_number?: string
  token_number?: string          // prepaid meters only

  // Assignment (null until assigned from inventory)
  unit_id?: string
  unit_label?: string
  location_description?: string

  // Technical specs (one set populated based on category)
  water_specs?: WaterMeterSpecs
  electricity_specs?: ElectricityMeterSpecs
  gas_specs?: GasMeterSpecs

  // Opening reading (captured at registration)
  opening_reading: number
  opening_reading_date: string
  unit_of_measure: string        // 'm³', 'kWh', 'm³ (gas)'

  // Billing config
  rate_per_unit: number
  billing_cycle: 'monthly' | 'quarterly'
  auto_generate_charges: boolean // false for prepaid
  billing_arrangement?: BillingArrangement

  // Calibration (optional)
  calibration?: MeterCalibration

  // Status
  status: MeterStatusExtended
  installed_at?: string          // set when moved from inventory → active
  created_at: string
  notes?: string
}
