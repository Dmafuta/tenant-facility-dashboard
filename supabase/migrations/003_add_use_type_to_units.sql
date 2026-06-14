-- ============================================================
-- Migration 003: Add use_type to units table
-- Run in: https://supabase.com/dashboard/project/eijjcffyfenrspqxjrsl/sql/new
-- ============================================================

create type unit_use_type as enum ('residential','commercial','bnb','office','vacant');

alter table units
  add column if not exists use_type unit_use_type not null default 'residential';

-- Back-fill known use types for seeded units
update units set use_type = 'bnb'         where id = 'U-202';
update units set use_type = 'office'      where id = 'U-203';
update units set use_type = 'commercial'  where id = 'SHP-01';
update units set use_type = 'commercial'  where id = 'SHP-02';
-- U-103 status is 'vacant' — leave use_type as residential (can be changed in UI)
-- All others default to 'residential' which is correct
