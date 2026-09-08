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

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  content text,
  type text default 'system',
  is_read boolean default false,
  created_at timestamptz default now(),
  deleted_at timestamptz,
  is_starred boolean default false,
  is_important boolean default false,
  actor_id uuid references public.profiles(id) on delete set null,
  post_id bigint,
  comment_id uuid,
  actor_count integer not null default 1,
  recent_actor_ids uuid[] not null default '{}'::uuid[],
  last_activity_at timestamptz not null default now(),
  constraint notifications_actor_count_nonnegative check (actor_count >= 0)
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
alter table public.notifications enable row level security;

create policy "Profiles can be read for public pages"
on public.profiles for select to anon, authenticated using (true);

create policy "Users can update own profile or admins can update all"
on public.profiles for update to authenticated
using (id = (select auth.uid()) or private.is_admin_role())
with check (id = (select auth.uid()) or private.is_admin_role());

create policy "Users can read own notifications"
on public.notifications for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can update own notifications"
on public.notifications for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant usage on schema public to anon, authenticated, service_role;
grant select on public.profiles to anon, authenticated, service_role;
grant update on public.profiles to authenticated;
grant insert, update, delete on public.profiles to service_role;
grant select on public.notifications to authenticated;
grant update (is_read, is_starred, is_important, deleted_at)
on public.notifications to authenticated;
grant all on public.notifications to service_role;
grant usage on schema private to authenticated, service_role;
grant execute on function private.is_owner_or_admin() to authenticated, service_role;
grant execute on function private.is_admin_role() to authenticated, service_role;
