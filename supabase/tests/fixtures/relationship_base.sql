create schema auth;
create schema private;

create role anon noinherit;
create role authenticated noinherit;
create role service_role noinherit bypassrls;

create table auth.users (
  id uuid primary key,
  email text
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  avatar_url text,
  role text default 'user',
  status text default 'active',
  updated_at timestamptz
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create or replace function private.is_owner_or_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in ('owner', 'admin')
  );
$$;

create or replace function private.is_admin_role()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('owner', 'admin', 'moderator')
  );
$$;

alter table public.profiles enable row level security;

create policy "Profiles can be read for public pages"
on public.profiles for select to anon, authenticated using (true);

create policy "Users can update own profile or admins can update all"
on public.profiles for update to authenticated
using (id = (select auth.uid()) or private.is_admin_role())
with check (id = (select auth.uid()) or private.is_admin_role());

grant usage on schema public to anon, authenticated, service_role;
grant select on public.profiles to anon, authenticated, service_role;
grant update on public.profiles to authenticated;
grant insert, update, delete on public.profiles to service_role;
grant usage on schema private to authenticated, service_role;
grant execute on function private.is_owner_or_admin() to authenticated, service_role;
grant execute on function private.is_admin_role() to authenticated, service_role;
