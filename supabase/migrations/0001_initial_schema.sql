-- ============================================================================
-- Quotestream: Initial Database Schema
-- Migration: 0001_initial_schema.sql
-- Generated: 2026-02-08
--
-- Tables:  businesses, profiles, customers, quotes, quote_line_items,
--          quote_photos, quote_activities, pricing_catalog, default_pricing_data
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================

create extension if not exists "pgcrypto" schema "extensions";

-- ============================================================================
-- 2. CUSTOM TYPES
-- ============================================================================

create type public.user_role as enum (
  'owner',
  'admin',
  'technician',
  'viewer'
);

create type public.quote_status as enum (
  'draft',
  'sent',
  'viewed',
  'accepted',
  'declined',
  'expired'
);

create type public.line_item_type as enum (
  'service',
  'material',
  'labor',
  'other'
);

create type public.industry_type as enum (
  'hvac',
  'plumbing',
  'electrical',
  'general'
);

-- ============================================================================
-- 3. HELPER FUNCTIONS (table-independent)
-- ============================================================================

-- Generic trigger function: sets updated_at = now() on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Auto-computes line_total_cents = round(quantity * unit_price_cents).
create or replace function public.compute_line_total()
returns trigger
language plpgsql
as $$
begin
  new.line_total_cents = round(new.quantity * new.unit_price_cents)::integer;
  return new;
end;
$$;

-- ============================================================================
-- 4. TABLES
-- ============================================================================

-- 4a. businesses -----------------------------------------------------------

create table public.businesses (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  slug                text not null unique,
  industry            public.industry_type not null default 'general',
  phone               text,
  email               text,
  address_line1       text,
  address_line2       text,
  city                text,
  state               text,
  zip_code            text,
  logo_url            text,
  primary_color       text not null default '#3b82f6',
  quote_prefix        text not null default 'QF',
  quote_counter       integer not null default 0,
  default_expiry_days integer not null default 30,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint businesses_primary_color_hex
    check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  constraint businesses_phone_format
    check (phone is null or length(regexp_replace(phone, '[^0-9]', '', 'g')) between 7 and 15),
  constraint businesses_email_format
    check (email is null or email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'),
  constraint businesses_quote_counter_non_negative
    check (quote_counter >= 0),
  constraint businesses_default_expiry_positive
    check (default_expiry_days > 0)
);

-- 4b. profiles (extends auth.users) ----------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  business_id  uuid references public.businesses on delete set null,
  role         public.user_role not null default 'viewer',
  first_name   text not null default '',
  last_name    text not null default '',
  phone        text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint profiles_phone_format
    check (phone is null or length(regexp_replace(phone, '[^0-9]', '', 'g')) between 7 and 15)
);

-- 4c. customers -------------------------------------------------------------

create table public.customers (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses on delete cascade,
  first_name     text,
  last_name      text,
  email          text,
  phone          text,
  company_name   text,
  address_line1  text,
  address_line2  text,
  city           text,
  state          text,
  zip_code       text,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint customers_phone_format
    check (phone is null or length(regexp_replace(phone, '[^0-9]', '', 'g')) between 7 and 15),
  constraint customers_email_format
    check (email is null or email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$')
);

-- 4d. quotes ----------------------------------------------------------------

create table public.quotes (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses on delete cascade,
  customer_id     uuid references public.customers on delete set null,
  created_by      uuid not null references public.profiles on delete restrict,
  quote_number    text not null,
  title           text not null,
  description     text,
  status          public.quote_status not null default 'draft',
  subtotal_cents  integer not null default 0,
  tax_rate        numeric(5,3) not null default 0,
  tax_cents       integer not null default 0,
  discount_cents  integer not null default 0,
  total_cents     integer not null default 0,
  notes           text,
  customer_notes  text,
  expires_at      timestamptz,
  sent_at         timestamptz,
  viewed_at       timestamptz,
  accepted_at     timestamptz,
  declined_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint quotes_number_unique_per_business
    unique (business_id, quote_number),
  constraint quotes_subtotal_non_negative
    check (subtotal_cents >= 0),
  constraint quotes_tax_rate_range
    check (tax_rate >= 0 and tax_rate <= 100),
  constraint quotes_tax_non_negative
    check (tax_cents >= 0),
  constraint quotes_discount_non_negative
    check (discount_cents >= 0),
  constraint quotes_total_non_negative
    check (total_cents >= 0)
);

-- 4e. quote_line_items ------------------------------------------------------

create table public.quote_line_items (
  id               uuid primary key default gen_random_uuid(),
  quote_id         uuid not null references public.quotes on delete cascade,
  title            text not null,
  description      text,
  quantity         numeric(12,4) not null default 1,
  unit             text not null default 'ea',
  unit_price_cents integer not null default 0,
  line_total_cents integer not null default 0,
  item_type        public.line_item_type not null default 'service',
  sort_order       integer not null default 0,
  ai_confidence    numeric(3,2),
  ai_reasoning     text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint line_items_quantity_positive
    check (quantity > 0),
  constraint line_items_unit_price_non_negative
    check (unit_price_cents >= 0),
  constraint line_items_total_non_negative
    check (line_total_cents >= 0),
  constraint line_items_confidence_range
    check (ai_confidence is null or (ai_confidence >= 0 and ai_confidence <= 1))
);

-- 4f. quote_photos ----------------------------------------------------------

create table public.quote_photos (
  id                uuid primary key default gen_random_uuid(),
  quote_id          uuid not null references public.quotes on delete cascade,
  storage_path      text not null,
  original_filename text,
  mime_type         text,
  size_bytes        integer,
  sort_order        integer not null default 0,
  ai_analysis       jsonb,
  created_at        timestamptz not null default now(),

  constraint photos_size_positive
    check (size_bytes is null or size_bytes > 0)
);

-- 4g. quote_activities ------------------------------------------------------

create table public.quote_activities (
  id         uuid primary key default gen_random_uuid(),
  quote_id   uuid not null references public.quotes on delete cascade,
  actor_id   uuid references public.profiles on delete set null,
  action     text not null,
  metadata   jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 4h. pricing_catalog (business-specific overrides) -------------------------

create table public.pricing_catalog (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses on delete cascade,
  title            text not null,
  description      text,
  category         text,
  unit             text not null default 'ea',
  unit_price_cents integer not null default 0,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint catalog_price_non_negative
    check (unit_price_cents >= 0)
);

-- 4i. default_pricing_data (system-wide market rates) -----------------------

create table public.default_pricing_data (
  id                     uuid primary key default gen_random_uuid(),
  industry               text not null,
  service_type           text not null,
  service_tier           text not null default 'residential',
  region                 text,
  zip_code_prefix        text,
  price_min_cents        integer not null default 0,
  price_avg_cents        integer not null default 0,
  price_max_cents        integer not null default 0,
  labor_rate_min_cents   integer not null default 0,
  labor_rate_avg_cents   integer not null default 0,
  labor_rate_max_cents   integer not null default 0,
  data_source            text,
  confidence_score       numeric(3,2) not null default 0.5,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint default_pricing_cents_non_negative
    check (
      price_min_cents >= 0 and price_avg_cents >= 0 and price_max_cents >= 0
      and labor_rate_min_cents >= 0 and labor_rate_avg_cents >= 0 and labor_rate_max_cents >= 0
    ),
  constraint default_pricing_min_lte_max
    check (price_min_cents <= price_max_cents and labor_rate_min_cents <= labor_rate_max_cents),
  constraint default_pricing_confidence_range
    check (confidence_score >= 0 and confidence_score <= 1)
);

-- ============================================================================
-- 5. HELPER FUNCTIONS (table-dependent)
-- ============================================================================

-- Returns the business_id for the currently authenticated user.
-- Used in every RLS policy to enforce tenant isolation.
-- Returns NULL when not authenticated, which causes all business_id comparisons
-- to evaluate to FALSE (NULL != uuid), correctly denying access.
create or replace function public.get_my_business_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select business_id from public.profiles where id = auth.uid()
$$;

-- Generates a sequential quote number per business.
-- Format: {quote_prefix}-{zero-padded 5-digit counter}
-- Uses FOR UPDATE to prevent race conditions on concurrent inserts.
create or replace function public.generate_quote_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_num integer;
  prefix   text;
begin
  select
    quote_counter + 1,
    quote_prefix
  into next_num, prefix
  from public.businesses
  where id = new.business_id
  for update;

  update public.businesses
  set quote_counter = next_num
  where id = new.business_id;

  new.quote_number = prefix || '-' || lpad(next_num::text, 5, '0');
  return new;
end;
$$;

-- After any line-item change, recalculates subtotal/tax/total on the parent quote.
create or replace function public.recalculate_quote_totals()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_quote_id uuid;
  new_subtotal    integer;
begin
  -- Determine which quote was affected
  if tg_op = 'DELETE' then
    target_quote_id = old.quote_id;
  else
    target_quote_id = new.quote_id;
  end if;

  select coalesce(sum(line_total_cents), 0)
  into new_subtotal
  from public.quote_line_items
  where quote_id = target_quote_id;

  update public.quotes
  set
    subtotal_cents = new_subtotal,
    tax_cents      = round(new_subtotal * tax_rate / 100)::integer,
    total_cents    = new_subtotal
                     + round(new_subtotal * tax_rate / 100)::integer
                     - discount_cents
  where id = target_quote_id;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- Creates a profile row when a new auth.users row is inserted (Supabase trigger).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', '')
  );
  return new;
end;
$$;

-- ============================================================================
-- 6. INDEXES
-- ============================================================================

-- profiles
create index idx_profiles_business_id on public.profiles (business_id);

-- customers
create index idx_customers_business_id on public.customers (business_id);
create index idx_customers_email       on public.customers (business_id, email)
  where email is not null;
create index idx_customers_phone       on public.customers (business_id, phone)
  where phone is not null;
create index idx_customers_name        on public.customers (business_id, last_name, first_name);
create index idx_customers_zip         on public.customers (business_id, zip_code)
  where zip_code is not null;

-- quotes
create index idx_quotes_business_id    on public.quotes (business_id);
create index idx_quotes_customer_id    on public.quotes (customer_id);
create index idx_quotes_created_by     on public.quotes (created_by);
create index idx_quotes_status         on public.quotes (business_id, status);
create index idx_quotes_created_at     on public.quotes (business_id, created_at desc);

-- quote_line_items
create index idx_line_items_quote_id   on public.quote_line_items (quote_id);

-- quote_photos
create index idx_photos_quote_id       on public.quote_photos (quote_id);

-- quote_activities
create index idx_activities_quote_id   on public.quote_activities (quote_id);
create index idx_activities_created_at on public.quote_activities (quote_id, created_at desc);

-- pricing_catalog
create index idx_catalog_business_id   on public.pricing_catalog (business_id);
create index idx_catalog_category      on public.pricing_catalog (business_id, category)
  where is_active = true;

-- default_pricing_data
create index idx_default_pricing_lookup on public.default_pricing_data (industry, service_type, service_tier);
create index idx_default_pricing_region on public.default_pricing_data (region, zip_code_prefix);

-- ============================================================================
-- 7. ROW-LEVEL SECURITY
-- ============================================================================

alter table public.businesses          enable row level security;
alter table public.profiles            enable row level security;
alter table public.customers           enable row level security;
alter table public.quotes              enable row level security;
alter table public.quote_line_items    enable row level security;
alter table public.quote_photos        enable row level security;
alter table public.quote_activities    enable row level security;
alter table public.pricing_catalog     enable row level security;
alter table public.default_pricing_data enable row level security;

-- 7a. businesses -----------------------------------------------------------
-- Authenticated users see their own business.
-- Public users can read basic business info (shown on shared quote pages).

create policy "businesses_select_own"
  on public.businesses for select
  to authenticated
  using (id = public.get_my_business_id());

create policy "businesses_select_public"
  on public.businesses for select
  to anon
  using (true);

create policy "businesses_update_own"
  on public.businesses for update
  to authenticated
  using (id = public.get_my_business_id())
  with check (id = public.get_my_business_id());

-- INSERT handled by signup flow (service_role), not direct client access.

-- 7b. profiles -------------------------------------------------------------

create policy "profiles_select_own_business"
  on public.profiles for select
  to authenticated
  using (business_id = public.get_my_business_id());

create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- 7c. customers ------------------------------------------------------------

create policy "customers_select_own"
  on public.customers for select
  to authenticated
  using (business_id = public.get_my_business_id());

create policy "customers_insert_own"
  on public.customers for insert
  to authenticated
  with check (business_id = public.get_my_business_id());

create policy "customers_update_own"
  on public.customers for update
  to authenticated
  using (business_id = public.get_my_business_id())
  with check (business_id = public.get_my_business_id());

create policy "customers_delete_own"
  on public.customers for delete
  to authenticated
  using (business_id = public.get_my_business_id());

-- Public: allow reading customer data when it belongs to a publicly-viewable quote.
-- This enables the public quote page to join quotes → customers.
create policy "customers_select_public"
  on public.customers for select
  to anon
  using (
    exists (
      select 1 from public.quotes q
      where q.customer_id = customers.id
        and q.status in ('sent', 'viewed', 'accepted', 'declined', 'expired')
    )
  );

-- 7d. quotes ---------------------------------------------------------------

create policy "quotes_select_own"
  on public.quotes for select
  to authenticated
  using (business_id = public.get_my_business_id());

create policy "quotes_insert_own"
  on public.quotes for insert
  to authenticated
  with check (business_id = public.get_my_business_id());

create policy "quotes_update_own"
  on public.quotes for update
  to authenticated
  using (business_id = public.get_my_business_id())
  with check (business_id = public.get_my_business_id());

create policy "quotes_delete_own"
  on public.quotes for delete
  to authenticated
  using (business_id = public.get_my_business_id());

-- Public quote view: anon users can SELECT non-draft quotes by exact id.
-- Security relies on UUID being cryptographically random (share-link model).
create policy "quotes_select_public"
  on public.quotes for select
  to anon
  using (status in ('sent', 'viewed', 'accepted', 'declined', 'expired'));

-- 7e. quote_line_items -----------------------------------------------------

create policy "line_items_select_own"
  on public.quote_line_items for select
  to authenticated
  using (
    exists (
      select 1 from public.quotes q
      where q.id = quote_line_items.quote_id
        and q.business_id = public.get_my_business_id()
    )
  );

create policy "line_items_insert_own"
  on public.quote_line_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.quotes q
      where q.id = quote_line_items.quote_id
        and q.business_id = public.get_my_business_id()
    )
  );

create policy "line_items_update_own"
  on public.quote_line_items for update
  to authenticated
  using (
    exists (
      select 1 from public.quotes q
      where q.id = quote_line_items.quote_id
        and q.business_id = public.get_my_business_id()
    )
  );

create policy "line_items_delete_own"
  on public.quote_line_items for delete
  to authenticated
  using (
    exists (
      select 1 from public.quotes q
      where q.id = quote_line_items.quote_id
        and q.business_id = public.get_my_business_id()
    )
  );

-- Public: line items are visible on the shared quote page.
create policy "line_items_select_public"
  on public.quote_line_items for select
  to anon
  using (
    exists (
      select 1 from public.quotes q
      where q.id = quote_line_items.quote_id
        and q.status in ('sent', 'viewed', 'accepted', 'declined', 'expired')
    )
  );

-- 7f. quote_photos ---------------------------------------------------------

create policy "photos_select_own"
  on public.quote_photos for select
  to authenticated
  using (
    exists (
      select 1 from public.quotes q
      where q.id = quote_photos.quote_id
        and q.business_id = public.get_my_business_id()
    )
  );

create policy "photos_insert_own"
  on public.quote_photos for insert
  to authenticated
  with check (
    exists (
      select 1 from public.quotes q
      where q.id = quote_photos.quote_id
        and q.business_id = public.get_my_business_id()
    )
  );

create policy "photos_delete_own"
  on public.quote_photos for delete
  to authenticated
  using (
    exists (
      select 1 from public.quotes q
      where q.id = quote_photos.quote_id
        and q.business_id = public.get_my_business_id()
    )
  );

-- 7g. quote_activities -----------------------------------------------------

create policy "activities_select_own"
  on public.quote_activities for select
  to authenticated
  using (
    exists (
      select 1 from public.quotes q
      where q.id = quote_activities.quote_id
        and q.business_id = public.get_my_business_id()
    )
  );

create policy "activities_insert_own"
  on public.quote_activities for insert
  to authenticated
  with check (
    exists (
      select 1 from public.quotes q
      where q.id = quote_activities.quote_id
        and q.business_id = public.get_my_business_id()
    )
  );

-- 7h. pricing_catalog ------------------------------------------------------

create policy "catalog_select_own"
  on public.pricing_catalog for select
  to authenticated
  using (business_id = public.get_my_business_id());

create policy "catalog_insert_own"
  on public.pricing_catalog for insert
  to authenticated
  with check (business_id = public.get_my_business_id());

create policy "catalog_update_own"
  on public.pricing_catalog for update
  to authenticated
  using (business_id = public.get_my_business_id())
  with check (business_id = public.get_my_business_id());

create policy "catalog_delete_own"
  on public.pricing_catalog for delete
  to authenticated
  using (business_id = public.get_my_business_id());

-- 7i. default_pricing_data -------------------------------------------------
-- System-wide reference data: readable by all authenticated users, not editable
-- via client. Managed through service_role or Supabase dashboard.

create policy "default_pricing_select_all"
  on public.default_pricing_data for select
  to authenticated
  using (true);

-- ============================================================================
-- 8. TRIGGERS
-- ============================================================================

-- 8a. updated_at auto-touch ------------------------------------------------

create trigger set_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.quotes
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.quote_line_items
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.pricing_catalog
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.default_pricing_data
  for each row execute function public.set_updated_at();

-- 8b. Quote number generation ----------------------------------------------

create trigger generate_quote_number
  before insert on public.quotes
  for each row execute function public.generate_quote_number();

-- 8c. Line-item total computation ------------------------------------------

create trigger compute_line_total
  before insert or update of quantity, unit_price_cents on public.quote_line_items
  for each row execute function public.compute_line_total();

-- 8d. Quote totals recalculation -------------------------------------------

create trigger recalculate_quote_totals
  after insert or update or delete on public.quote_line_items
  for each row execute function public.recalculate_quote_totals();

-- 8e. Auto-create profile on signup ----------------------------------------

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
