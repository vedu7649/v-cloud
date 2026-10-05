-- 1. Create a private bucket for personal files (if it doesn't already exist)
insert into storage.buckets (id, name, public)
values ('vault', 'vault', false)
on conflict (id) do nothing;

-- 2. Storage RLS: Restrict access strictly to the owner's user folder
drop policy if exists "Allow user full access to own storage folder" on storage.objects;

create policy "Allow user full access to own storage folder"
on storage.objects
for all
to authenticated
using (bucket_id = 'vault' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'vault' and (storage.foldername(name))[1] = auth.uid()::text);

-- 3. File metadata table for fast search and listing
create table if not exists public.files (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  size bigint not null,
  type text not null,
  storage_path text not null,
  starred boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Enable RLS on metadata table
alter table public.files enable row level security;

-- Delete any existing matching policies first to avoid name conflicts
drop policy if exists "Users can manage their own files" on public.files;

create policy "Users can manage their own files"
on public.files
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 5. Migration: Add starred column if migrating from an existing table structure
alter table public.files add column if not exists starred boolean default false not null;

-- 6. RPC Function: Multi-User Storage Breakdown for Admin Cockpit
create or replace function get_storage_breakdown()
returns table (
  user_id uuid,
  user_email text,
  total_bytes bigint,
  file_count bigint
)
language sql
security definer
as $$
  select 
    f.user_id,
    coalesce(u.email, 'Admin User (' || substring(f.user_id::text from 1 for 8) || ')') as user_email,
    coalesce(sum(f.size), 0)::bigint as total_bytes,
    count(f.id)::bigint as file_count
  from public.files f
  left join auth.users u on f.user_id = u.id
  group by f.user_id, u.email
  order by total_bytes desc;
$$;
