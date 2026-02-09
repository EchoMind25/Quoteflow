-- Activity logs table for audit trail
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  action_type text not null,
  resource_type text not null,
  resource_id text not null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Index for querying by business
create index if not exists idx_activity_logs_business_id on public.activity_logs(business_id);

-- Index for querying by user
create index if not exists idx_activity_logs_user_id on public.activity_logs(user_id);

-- Index for querying by resource
create index if not exists idx_activity_logs_resource on public.activity_logs(resource_type, resource_id);

-- Index for time-based queries
create index if not exists idx_activity_logs_created_at on public.activity_logs(created_at desc);

-- RLS: users can only see activity logs for their own business
alter table public.activity_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'activity_logs'
    and policyname = 'Users can view their business activity logs'
  ) then
    create policy "Users can view their business activity logs"
      on public.activity_logs for select
      using (business_id = public.get_my_business_id());
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'activity_logs'
    and policyname = 'Users can insert activity logs for their business'
  ) then
    create policy "Users can insert activity logs for their business"
      on public.activity_logs for insert
      with check (business_id = public.get_my_business_id());
  end if;
end $$;
