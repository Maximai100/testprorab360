-- Table: company_profiles
create table if not exists public.company_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null default '',
  details text not null default '',
  logo_url text null,
  updated_at timestamptz not null default now()
);

-- Trigger to auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end
$$;

drop trigger if exists set_company_profiles_updated_at on public.company_profiles;
create trigger set_company_profiles_updated_at
before update on public.company_profiles
for each row execute function public.set_updated_at();

-- Enable RLS and add policies so each user manages only their profile
alter table public.company_profiles enable row level security;

drop policy if exists "company_profiles_select_own" on public.company_profiles;
create policy "company_profiles_select_own" on public.company_profiles
  for select using (auth.uid() = user_id);

drop policy if exists "company_profiles_insert_own" on public.company_profiles;
create policy "company_profiles_insert_own" on public.company_profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "company_profiles_update_own" on public.company_profiles;
create policy "company_profiles_update_own" on public.company_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "company_profiles_delete_own" on public.company_profiles;
create policy "company_profiles_delete_own" on public.company_profiles
  for delete using (auth.uid() = user_id);

