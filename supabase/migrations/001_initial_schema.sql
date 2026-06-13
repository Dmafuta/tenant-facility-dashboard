-- ============================================================
-- Tenant Portal — Initial Schema Migration
-- ============================================================
-- Conventions:
--   • All sensitive fields (phone, national_id, kra_pin) stored
--     as plain text; encryption-at-rest handled by Supabase vault
--     or column-level encryption added in a later migration.
--   • Masking happens in the application layer.
--   • Every table has compound_id for future multi-tenancy.
--   • RLS enabled on all tables; policies added at the bottom.
-- ============================================================

-- ── Extensions ────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ── Enums ─────────────────────────────────────────────────────────────────

create type person_type as enum (
  'resident_owner',
  'non_resident_owner',
  'tenant',
  'short_stay_guest',
  'permanent_staff',
  'casual_staff',
  'outsourced'
);

create type person_status as enum (
  'pending_verification',
  'active',
  'suspended',
  'former'
);

create type kyc_status as enum (
  'not_started',
  'pending_docs',
  'docs_uploaded',
  'approved',
  'rejected'
);

create type kyc_document_type as enum (
  'national_id',
  'passport',
  'employment_letter',
  'payslip',
  'bank_statement',
  'title_deed',
  'sale_agreement',
  'cert_of_incorporation',
  'cr12',
  'police_clearance',
  'reference_letter',
  'employment_contract',
  'guarantor_form',
  'agency_clearance',
  'other'
);

create type otp_purpose as enum (
  'phone_verification',
  'reveal_phone',
  'reveal_national_id',
  'reveal_kra_pin',
  'portal_login'
);

create type ownership_type as enum (
  'individual',
  'company'
);

-- ── people ─────────────────────────────────────────────────────────────────
-- Core identity record for all human actors in the system.

create table people (
  id                   uuid primary key default uuid_generate_v4(),
  compound_id          uuid not null,                          -- future multi-tenancy scope

  type                 person_type not null,
  status               person_status not null default 'pending_verification',
  kyc_status           kyc_status not null default 'not_started',

  -- Name
  first_name           text not null,
  last_name            text not null,

  -- Sensitive — masked in UI, reveal via OTP
  national_id          text,                                   -- KE National ID or Passport No.
  phone                text not null,                          -- E.164 format e.g. +254712345678
  email                text,

  -- Verification timestamps
  phone_verified_at    timestamptz,
  email_verified_at    timestamptz,

  -- Profile
  profile_photo_url    text,
  date_of_birth        date,
  gender               text,
  nationality          text default 'Kenyan',

  -- Staff-specific
  role                 text,                                   -- job title / role label
  contract_type        text,                                   -- permanent | casual
  access_days          text,                                   -- weekdays | all | custom
  access_hours_start   time,
  access_hours_end     time,
  background_check_done boolean default false,
  background_check_date date,

  -- Outsourced staff — no portal, agency-managed
  is_outsourced        boolean default false,
  agency_name          text,
  agency_contact       text,
  agency_clearance_ref text,

  -- Emergency / next of kin
  nok_name             text,
  nok_phone            text,
  nok_relationship     text,

  -- Audit
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  created_by           uuid,                                   -- admin user who registered them
  notes                text
);

-- Indexes for the primary filter fields
create index people_phone_idx       on people (phone);
create index people_national_id_idx on people (national_id);
create index people_compound_idx    on people (compound_id);
create index people_type_idx        on people (type);
create index people_status_idx      on people (status);
create index people_kyc_idx         on people (kyc_status);

-- ── companies ──────────────────────────────────────────────────────────────
-- Corporate entity that can own one or more units.

create table companies (
  id                       uuid primary key default uuid_generate_v4(),
  compound_id              uuid not null,

  company_name             text not null,
  registration_number      text,                               -- e.g. CPR/2019/123456
  kra_pin                  text,                               -- sensitive — masked in UI
  email                    text,
  phone                    text,                               -- contact number (masked)

  -- Authorized representative — a person record
  authorized_rep_id        uuid references people (id) on delete set null,

  -- Status
  status                   text not null default 'active',     -- active | suspended | dissolved

  -- Documents (Supabase Storage paths)
  cert_of_incorporation_url text,
  cr12_url                  text,

  -- Audit
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  created_by               uuid,
  notes                    text
);

create index companies_kra_pin_idx   on companies (kra_pin);
create index companies_phone_idx     on companies (phone);
create index companies_compound_idx  on companies (compound_id);

-- ── unit_owners ────────────────────────────────────────────────────────────
-- Links a unit to its owner(s) — individual or corporate.
-- Multiple rows per unit supported (fractional ownership).

create table unit_owners (
  id               uuid primary key default uuid_generate_v4(),
  unit_id          uuid not null,                              -- FK to units table (added later)
  unit_label       text,                                       -- denormalised display label

  ownership_type   ownership_type not null default 'individual',

  -- Exactly one of these will be set
  person_id        uuid references people  (id) on delete cascade,
  company_id       uuid references companies (id) on delete cascade,

  share_percent    numeric(5,2) not null default 100.00,
  is_primary       boolean not null default false,             -- one per unit marked primary

  -- Supporting document
  ownership_doc_url text,
  from_date         date,
  to_date           date,                                      -- null = current owner

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- Exactly one owner reference must be set
  constraint unit_owners_one_ref check (
    (person_id is not null)::int + (company_id is not null)::int = 1
  ),
  -- Share cannot exceed 100%
  constraint unit_owners_share_range check (share_percent > 0 and share_percent <= 100)
);

create index unit_owners_unit_idx    on unit_owners (unit_id);
create index unit_owners_person_idx  on unit_owners (person_id);
create index unit_owners_company_idx on unit_owners (company_id);

-- Ensure only one primary owner per unit
create unique index unit_owners_primary_unique
  on unit_owners (unit_id)
  where is_primary = true;

-- ── kyc_documents ──────────────────────────────────────────────────────────
-- Each uploaded document for a person or company.

create table kyc_documents (
  id              uuid primary key default uuid_generate_v4(),

  -- Belongs to either a person or a company
  person_id       uuid references people    (id) on delete cascade,
  company_id      uuid references companies (id) on delete cascade,

  document_type   kyc_document_type not null,
  file_url        text not null,                               -- Supabase Storage path
  file_name       text,
  file_size_bytes bigint,
  mime_type       text,

  -- Upload was sufficient to advance kyc_status — admin can optionally verify
  uploaded_at     timestamptz not null default now(),
  uploaded_by     uuid,                                        -- admin user

  -- Optional manual verification step
  verified_at     timestamptz,
  verified_by     uuid,
  rejected_at     timestamptz,
  rejection_reason text,

  notes           text,

  constraint kyc_documents_one_ref check (
    (person_id is not null)::int + (company_id is not null)::int = 1
  )
);

create index kyc_documents_person_idx  on kyc_documents (person_id);
create index kyc_documents_company_idx on kyc_documents (company_id);

-- ── otp_verifications ──────────────────────────────────────────────────────
-- One-time codes for phone verification and sensitive field reveal.

create table otp_verifications (
  id              uuid primary key default uuid_generate_v4(),

  phone           text not null,                               -- phone the OTP was sent to
  code_hash       text not null,                               -- bcrypt hash of the 6-digit code
  purpose         otp_purpose not null,

  -- Context
  person_id       uuid references people (id) on delete set null,  -- whose data is being revealed
  requested_by    uuid,                                             -- admin user making the request

  -- Lifecycle
  expires_at      timestamptz not null default (now() + interval '10 minutes'),
  used_at         timestamptz,                                 -- null = not yet used
  attempts        int not null default 0,                      -- failed attempts counter
  max_attempts    int not null default 3,

  -- Metadata
  ip_address      inet,
  user_agent      text,
  created_at      timestamptz not null default now()
);

create index otp_phone_idx      on otp_verifications (phone);
create index otp_purpose_idx    on otp_verifications (purpose);
create index otp_expires_idx    on otp_verifications (expires_at);

-- ── data_reveal_audit ──────────────────────────────────────────────────────
-- Immutable log of every sensitive field reveal.

create table data_reveal_audit (
  id              uuid primary key default uuid_generate_v4(),
  otp_id          uuid references otp_verifications (id),

  revealed_field  text not null,                               -- 'phone' | 'national_id' | 'kra_pin'
  subject_type    text not null,                               -- 'person' | 'company'
  subject_id      uuid not null,                               -- who's data was revealed
  subject_name    text,                                        -- denormalised for log readability

  requested_by    uuid not null,                               -- admin user
  requested_by_name text,
  revealed_at     timestamptz not null default now(),
  ip_address      inet
);

create index reveal_audit_subject_idx    on data_reveal_audit (subject_id);
create index reveal_audit_requester_idx  on data_reveal_audit (requested_by);
create index reveal_audit_time_idx       on data_reveal_audit (revealed_at desc);

-- ── portal_invites ─────────────────────────────────────────────────────────
-- Tracks portal activation invitations sent to people.

create table portal_invites (
  id              uuid primary key default uuid_generate_v4(),
  person_id       uuid not null references people (id) on delete cascade,

  token_hash      text not null,                               -- sha256 of the invite token
  email           text not null,                               -- email sent to

  sent_at         timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '7 days'),
  accepted_at     timestamptz,                                 -- null = not yet activated

  resent_count    int not null default 0,
  last_resent_at  timestamptz
);

create index portal_invites_person_idx on portal_invites (person_id);
create index portal_invites_token_idx  on portal_invites (token_hash);

-- ── updated_at trigger ─────────────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger people_updated_at
  before update on people
  for each row execute function set_updated_at();

create trigger companies_updated_at
  before update on companies
  for each row execute function set_updated_at();

create trigger unit_owners_updated_at
  before update on unit_owners
  for each row execute function set_updated_at();

-- ── KYC status auto-advance ────────────────────────────────────────────────
-- When the first document is uploaded for a person, advance kyc_status
-- from 'not_started' or 'pending_docs' → 'docs_uploaded'.

create or replace function advance_kyc_on_upload()
returns trigger language plpgsql as $$
begin
  if new.person_id is not null then
    update people
    set kyc_status = 'docs_uploaded'
    where id = new.person_id
      and kyc_status in ('not_started', 'pending_docs');
  end if;
  if new.company_id is not null then
    -- Companies don't have kyc_status; could add later
    null;
  end if;
  return new;
end;
$$;

create trigger kyc_documents_advance_status
  after insert on kyc_documents
  for each row execute function advance_kyc_on_upload();

-- ── Row Level Security ─────────────────────────────────────────────────────
-- Enable RLS — actual policies will be tightened once auth is wired.
-- For now: authenticated users can read/write within their compound.

alter table people             enable row level security;
alter table companies          enable row level security;
alter table unit_owners        enable row level security;
alter table kyc_documents      enable row level security;
alter table otp_verifications  enable row level security;
alter table data_reveal_audit  enable row level security;
alter table portal_invites     enable row level security;

-- Service-role bypass (used by server-side API routes)
create policy "service_role_all" on people
  for all to service_role using (true) with check (true);
create policy "service_role_all" on companies
  for all to service_role using (true) with check (true);
create policy "service_role_all" on unit_owners
  for all to service_role using (true) with check (true);
create policy "service_role_all" on kyc_documents
  for all to service_role using (true) with check (true);
create policy "service_role_all" on otp_verifications
  for all to service_role using (true) with check (true);
create policy "service_role_all" on data_reveal_audit
  for all to service_role using (true) with check (true);
create policy "service_role_all" on portal_invites
  for all to service_role using (true) with check (true);

-- Authenticated read within compound (tighten by role in next migration)
create policy "authenticated_read_people" on people
  for select to authenticated
  using (true);

create policy "authenticated_read_companies" on companies
  for select to authenticated
  using (true);

-- OTP verifications: only the requesting admin can see their own requests
create policy "authenticated_own_otp" on otp_verifications
  for select to authenticated
  using (requested_by = auth.uid());

-- ── Supabase Storage buckets (run via dashboard or storage API) ────────────
-- Bucket: kyc-documents  (private, no public access)
-- Signed URLs generated server-side for authorised viewers only.
-- Policy: only service_role can insert; authenticated can read with signed URL.

-- ============================================================
-- End of migration 001
-- ============================================================
