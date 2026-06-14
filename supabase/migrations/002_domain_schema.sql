-- ============================================================
-- Tenant Portal — Migration 002: Full Domain Schema (FIXED)
-- All person_id FK columns are uuid to match people.id from migration 001
-- Run in: https://supabase.com/dashboard/project/eijjcffyfenrspqxjrsl/sql/new
-- ============================================================

-- ── Helper trigger function ────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Units ─────────────────────────────────────────────────────────────────
create type unit_status as enum ('vacant','occupied','reserved','maintenance');

create table if not exists units (
  id              text primary key default gen_random_uuid()::text,
  block           text,
  floor           integer,
  number          text not null,
  label           text,
  bedrooms        integer,
  bathrooms       numeric(3,1),
  size_sqm        numeric(8,2),
  status          unit_status not null default 'vacant',
  monthly_rent    numeric(12,2),
  deposit_months  integer default 2,
  amenities       text[] default '{}',
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create trigger trg_units_updated before update on units
  for each row execute function set_updated_at();

-- ── Departments ────────────────────────────────────────────────────────────
create table if not exists departments (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  code       text unique not null,
  head_id    uuid references people(id),
  budget     numeric(14,2),
  notes      text,
  created_at timestamptz default now()
);

-- ── HR Staff ───────────────────────────────────────────────────────────────
create type employment_type as enum ('full_time','part_time','contract','outsourced');

create table if not exists hr_staff (
  id               text primary key default gen_random_uuid()::text,
  person_id        uuid references people(id),
  department_id    text references departments(id),
  role             text not null,
  employment_type  employment_type not null default 'full_time',
  salary           numeric(12,2),
  start_date       date,
  end_date         date,
  is_active        boolean default true,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create trigger trg_hr_staff_updated before update on hr_staff
  for each row execute function set_updated_at();

-- ── Leases ────────────────────────────────────────────────────────────────
create type lease_status as enum ('draft','active','expired','terminated','renewed');
create type billing_cycle as enum ('monthly','quarterly','annual');

create table if not exists leases (
  id               text primary key default gen_random_uuid()::text,
  unit_id          text references units(id),
  tenant_id        uuid references people(id),
  status           lease_status not null default 'draft',
  start_date       date not null,
  end_date         date not null,
  monthly_rent     numeric(12,2) not null,
  deposit          numeric(12,2),
  billing_cycle    billing_cycle default 'monthly',
  next_billing_date date,
  escalation_rate  numeric(5,2) default 0,
  terms            text,
  signed_at        timestamptz,
  terminated_at    timestamptz,
  termination_reason text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create trigger trg_leases_updated before update on leases
  for each row execute function set_updated_at();

-- ── Lease Applications ─────────────────────────────────────────────────────
create type application_status as enum (
  'submitted','screening','viewing_scheduled','offer_sent',
  'negotiating','approved','rejected','withdrawn'
);

create table if not exists lease_applications (
  id              text primary key default gen_random_uuid()::text,
  applicant_id    uuid references people(id),
  unit_id         text references units(id),
  status          application_status not null default 'submitted',
  submitted_at    timestamptz default now(),
  desired_move_in date,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create trigger trg_applications_updated before update on lease_applications
  for each row execute function set_updated_at();

-- ── Charges & Payments ────────────────────────────────────────────────────
create type charge_status as enum ('pending','paid','partial','overdue','waived','disputed');
create type charge_type as enum (
  'rent','water','electricity','gas','internet','service_charge',
  'garbage','parking','penalty','deposit','maintenance','other'
);
create type payment_method as enum ('mpesa','bank_transfer','cash','card','cheque','offset');

create table if not exists charges (
  id           text primary key default gen_random_uuid()::text,
  unit_id      text references units(id),
  lease_id     text references leases(id),
  person_id    uuid references people(id),
  type         charge_type not null,
  description  text,
  amount       numeric(12,2) not null,
  due_date     date,
  status       charge_status not null default 'pending',
  period_start date,
  period_end   date,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create trigger trg_charges_updated before update on charges
  for each row execute function set_updated_at();

create table if not exists payments (
  id           text primary key default gen_random_uuid()::text,
  charge_id    text references charges(id),
  person_id    uuid references people(id),
  amount       numeric(12,2) not null,
  method       payment_method not null default 'mpesa',
  reference    text,
  paid_at      timestamptz default now(),
  notes        text,
  created_at   timestamptz default now()
);

-- ── Meters & Readings ─────────────────────────────────────────────────────
create type meter_category as enum ('electricity','water','gas','internet','solar');
create type billing_mode as enum ('flat','unit_rate','tiered','shared');
create type meter_status as enum ('active','inactive','faulty','replaced');

create table if not exists meters (
  id             text primary key default gen_random_uuid()::text,
  unit_id        text references units(id),
  category       meter_category not null default 'electricity',
  serial_number  text,
  make           text,
  model          text,
  billing_mode   billing_mode not null default 'unit_rate',
  rate_per_unit  numeric(10,4),
  status         meter_status not null default 'active',
  installed_at   date,
  last_service   date,
  notes          text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
create trigger trg_meters_updated before update on meters
  for each row execute function set_updated_at();

create table if not exists meter_readings (
  id           text primary key default gen_random_uuid()::text,
  meter_id     text references meters(id),
  reading      numeric(14,4) not null,
  read_at      timestamptz not null default now(),
  read_by      uuid references people(id),
  notes        text,
  created_at   timestamptz default now()
);

-- ── Work Orders ───────────────────────────────────────────────────────────
create type work_order_status as enum ('open','in_progress','on_hold','completed','cancelled');
create type work_order_priority as enum ('low','medium','high','critical');
create type work_order_category as enum (
  'plumbing','electrical','hvac','structural','cleaning',
  'security','landscaping','appliances','other'
);

create table if not exists work_orders (
  id            text primary key default gen_random_uuid()::text,
  unit_id       text references units(id),
  reported_by   uuid references people(id),
  assigned_to   uuid references people(id),
  category      work_order_category not null default 'other',
  priority      work_order_priority not null default 'medium',
  status        work_order_status not null default 'open',
  title         text not null,
  description   text,
  estimated_cost numeric(12,2),
  actual_cost   numeric(12,2),
  scheduled_at  timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create trigger trg_work_orders_updated before update on work_orders
  for each row execute function set_updated_at();

-- ── Inspections ───────────────────────────────────────────────────────────
create type inspection_type as enum ('move_in','move_out','routine','emergency','compliance');
create type inspection_status as enum ('scheduled','in_progress','completed','cancelled');

create table if not exists inspections (
  id            text primary key default gen_random_uuid()::text,
  unit_id       text references units(id),
  type          inspection_type not null default 'routine',
  status        inspection_status not null default 'scheduled',
  inspector_id  uuid references people(id),
  scheduled_at  timestamptz,
  completed_at  timestamptz,
  score         integer check (score between 0 and 100),
  notes         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create trigger trg_inspections_updated before update on inspections
  for each row execute function set_updated_at();

-- ── Notices ───────────────────────────────────────────────────────────────
create type notice_type as enum (
  'demand_letter','eviction_notice','rent_increase','maintenance_notice',
  'lease_renewal','general','compliance'
);
create type notice_status as enum ('draft','sent','acknowledged','escalated','resolved');

create table if not exists notices (
  id           text primary key default gen_random_uuid()::text,
  person_id    uuid references people(id),
  unit_id      text references units(id),
  type         notice_type not null,
  status       notice_status not null default 'draft',
  title        text not null,
  body         text,
  sent_at      timestamptz,
  due_date     date,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create trigger trg_notices_updated before update on notices
  for each row execute function set_updated_at();

-- ── Visitors ──────────────────────────────────────────────────────────────
create type visitor_status as enum ('expected','arrived','departed','denied');

create table if not exists visitors (
  id              text primary key default gen_random_uuid()::text,
  host_person_id  uuid references people(id),
  host_unit_id    text references units(id),
  name            text not null,
  phone           text,
  id_number       text,
  vehicle_plate   text,
  purpose         text,
  status          visitor_status not null default 'expected',
  expected_at     timestamptz,
  arrived_at      timestamptz,
  departed_at     timestamptz,
  denied_reason   text,
  created_at      timestamptz default now()
);

-- ── Vehicles ──────────────────────────────────────────────────────────────
create type vehicle_type as enum ('car','motorcycle','truck','van','bicycle','other');

create table if not exists vehicles (
  id           text primary key default gen_random_uuid()::text,
  person_id    uuid references people(id),
  unit_id      text references units(id),
  type         vehicle_type not null default 'car',
  make         text,
  model        text,
  color        text,
  plate        text not null,
  year         integer,
  is_active    boolean default true,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create trigger trg_vehicles_updated before update on vehicles
  for each row execute function set_updated_at();

-- ── Entry Points & Access ─────────────────────────────────────────────────
create type entry_point_type as enum ('gate','door','barrier','turnstile','elevator');

create table if not exists entry_points (
  id           text primary key default gen_random_uuid()::text,
  name         text not null,
  type         entry_point_type not null default 'gate',
  location     text,
  is_active    boolean default true,
  created_at   timestamptz default now()
);

create type access_log_direction as enum ('in','out');

create table if not exists access_logs (
  id               text primary key default gen_random_uuid()::text,
  entry_point_id   text references entry_points(id),
  person_id        uuid references people(id),
  vehicle_id       text references vehicles(id),
  direction        access_log_direction not null default 'in',
  method           text,
  granted          boolean not null default true,
  deny_reason      text,
  logged_at        timestamptz default now()
);

-- ── Household Members ─────────────────────────────────────────────────────
create table if not exists household_members (
  id           text primary key default gen_random_uuid()::text,
  person_id    uuid references people(id),
  unit_id      text references units(id),
  name         text not null,
  relationship text,
  dob          date,
  id_number    text,
  phone        text,
  is_active    boolean default true,
  created_at   timestamptz default now()
);

-- ── Emergency Contacts ────────────────────────────────────────────────────
create table if not exists emergency_contacts (
  id           text primary key default gen_random_uuid()::text,
  person_id    uuid references people(id),
  name         text not null,
  relationship text,
  phone        text not null,
  email        text,
  is_primary   boolean default false,
  created_at   timestamptz default now()
);

-- ── Personal Staff ────────────────────────────────────────────────────────
create table if not exists personal_staff (
  id           text primary key default gen_random_uuid()::text,
  employer_id  uuid references people(id),
  unit_id      text references units(id),
  name         text not null,
  role         text,
  phone        text,
  id_number    text,
  is_active    boolean default true,
  created_at   timestamptz default now()
);

-- ── Consumables ───────────────────────────────────────────────────────────
create type consumable_status as enum ('in_stock','low_stock','out_of_stock','discontinued');

create table if not exists consumables (
  id             text primary key default gen_random_uuid()::text,
  name           text not null,
  category       text,
  sku            text,
  quantity       integer not null default 0,
  reorder_level  integer default 0,
  unit_price     numeric(10,2),
  status         consumable_status not null default 'in_stock',
  supplier       text,
  location       text,
  notes          text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
create trigger trg_consumables_updated before update on consumables
  for each row execute function set_updated_at();

-- ── Documents ─────────────────────────────────────────────────────────────
create type document_type as enum (
  'lease','id_copy','utility_bill','payment_receipt','notice','contract',
  'insurance','permit','report','other'
);

create table if not exists documents (
  id           text primary key default gen_random_uuid()::text,
  person_id    uuid references people(id),
  unit_id      text references units(id),
  lease_id     text references leases(id),
  type         document_type not null default 'other',
  name         text not null,
  storage_path text,
  mime_type    text,
  size_bytes   bigint,
  expires_at   date,
  uploaded_by  uuid references people(id),
  created_at   timestamptz default now()
);

-- ── Communications ────────────────────────────────────────────────────────
create type comm_channel as enum ('email','sms','whatsapp','push','in_app');
create type comm_status as enum ('draft','queued','sent','delivered','failed');

create table if not exists communications (
  id           text primary key default gen_random_uuid()::text,
  person_id    uuid references people(id),
  channel      comm_channel not null default 'email',
  subject      text,
  body         text not null,
  status       comm_status not null default 'draft',
  sent_at      timestamptz,
  provider     text,
  provider_ref text,
  created_at   timestamptz default now()
);

-- ── Engagement ────────────────────────────────────────────────────────────
create type poll_status as enum ('draft','active','closed');

create table if not exists polls (
  id           text primary key default gen_random_uuid()::text,
  title        text not null,
  description  text,
  options      jsonb default '[]',
  status       poll_status not null default 'draft',
  closes_at    timestamptz,
  created_by   uuid references people(id),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create trigger trg_polls_updated before update on polls
  for each row execute function set_updated_at();

create table if not exists poll_votes (
  id           text primary key default gen_random_uuid()::text,
  poll_id      text references polls(id) on delete cascade,
  person_id    uuid references people(id),
  option_index integer not null,
  voted_at     timestamptz default now(),
  unique (poll_id, person_id)
);

-- ── Rules & Breaches ──────────────────────────────────────────────────────
create type rule_status as enum ('active','inactive','draft');
create type breach_status as enum ('reported','investigating','resolved','dismissed');

create table if not exists rules (
  id           text primary key default gen_random_uuid()::text,
  title        text not null,
  category     text,
  description  text,
  penalty      numeric(10,2) default 0,
  status       rule_status not null default 'active',
  created_at   timestamptz default now()
);

create table if not exists breaches (
  id           text primary key default gen_random_uuid()::text,
  rule_id      text references rules(id),
  person_id    uuid references people(id),
  unit_id      text references units(id),
  description  text,
  status       breach_status not null default 'reported',
  reported_at  timestamptz default now(),
  resolved_at  timestamptz
);

-- ── Short Stay ────────────────────────────────────────────────────────────
create type short_stay_status as enum ('inquiry','confirmed','checked_in','checked_out','cancelled','no_show');

create table if not exists short_stays (
  id             text primary key default gen_random_uuid()::text,
  unit_id        text references units(id),
  guest_id       uuid references people(id),
  status         short_stay_status not null default 'inquiry',
  check_in_date  date not null,
  check_out_date date not null,
  nightly_rate   numeric(10,2),
  total_amount   numeric(12,2),
  platform       text,
  platform_ref   text,
  notes          text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
create trigger trg_short_stays_updated before update on short_stays
  for each row execute function set_updated_at();

-- ── Audit Events ──────────────────────────────────────────────────────────
create table if not exists audit_events (
  id           text primary key default gen_random_uuid()::text,
  actor_id     uuid references people(id),
  action       text not null,
  entity_type  text,
  entity_id    text,
  diff         jsonb,
  ip_address   inet,
  user_agent   text,
  created_at   timestamptz default now()
);

-- ── Notifications ─────────────────────────────────────────────────────────
create type notification_severity as enum ('info','warning','critical');

create table if not exists notifications (
  id           text primary key default gen_random_uuid()::text,
  person_id    uuid references people(id),
  category     text not null,
  severity     notification_severity not null default 'info',
  title        text not null,
  body         text,
  link_href    text,
  link_label   text,
  read         boolean default false,
  created_at   timestamptz default now()
);

-- ── Water Supply ──────────────────────────────────────────────────────────
create table if not exists water_supply_events (
  id           text primary key default gen_random_uuid()::text,
  type         text not null,
  volume_m3    numeric(10,3),
  source       text,
  notes        text,
  created_at   timestamptz default now()
);

-- ── RLS Policies ──────────────────────────────────────────────────────────
do $$ 
declare
  t text;
  tables text[] := array[
    'units','departments','hr_staff','leases','lease_applications',
    'charges','payments','meters','meter_readings','work_orders',
    'inspections','notices','visitors','vehicles','entry_points',
    'access_logs','household_members','emergency_contacts','personal_staff',
    'consumables','documents','communications','polls','poll_votes',
    'rules','breaches','short_stays','audit_events','notifications',
    'water_supply_events'
  ];
begin
  foreach t in array tables loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "service_role_all" on %I for all to service_role using (true) with check (true)',
      t
    );
    execute format(
      'create policy "authenticated_read" on %I for select to authenticated using (true)',
      t
    );
  end loop;
end $$;
