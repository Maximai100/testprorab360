-- Ensure public bucket 'logos' exists
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Enable RLS on storage.objects (enabled by default in newer projects)
alter table storage.objects enable row level security;

-- Allow anyone to read files from 'logos'
drop policy if exists "Logos public read" on storage.objects;
create policy "Logos public read" on storage.objects
  for select using (bucket_id = 'logos');

-- Allow authenticated users to manage their own files in 'logos'
drop policy if exists "Logos users write own" on storage.objects;
create policy "Logos users write own" on storage.objects
  for insert with check (bucket_id = 'logos' and auth.role() = 'authenticated' and owner = auth.uid());

drop policy if exists "Logos users update own" on storage.objects;
create policy "Logos users update own" on storage.objects
  for update using (bucket_id = 'logos' and owner = auth.uid()) with check (bucket_id = 'logos' and owner = auth.uid());

drop policy if exists "Logos users delete own" on storage.objects;
create policy "Logos users delete own" on storage.objects
  for delete using (bucket_id = 'logos' and owner = auth.uid());

