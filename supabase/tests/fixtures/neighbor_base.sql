-- Minimal copy of the production tables and policies needed to exercise
-- neighbor_visibility.sql in an isolated Supabase Postgres container.
create schema private;

create table public.profiles (
  id uuid primary key references auth.users(id),
  username text unique,
  role text default 'user',
  status text default 'active'
);

create table public.posts (
  id bigint primary key,
  author_id uuid references public.profiles(id),
  title text not null,
  content text not null,
  slug text not null,
  type text default 'article',
  status text default 'draft',
  visibility text default 'public',
  deleted_at timestamptz
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id),
  post_id bigint not null references public.posts(id),
  content text not null,
  is_deleted boolean not null default false,
  is_hidden boolean not null default false
);

create table public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id bigint not null references public.posts(id),
  user_id uuid not null references public.profiles(id),
  is_active boolean not null default true
);

create table public.comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id),
  user_id uuid not null references public.profiles(id),
  is_active boolean not null default true
);

create table public.user_follows (
  follower_id uuid not null references public.profiles(id),
  following_id uuid not null references public.profiles(id),
  status text not null,
  accepted_at timestamptz,
  primary key (follower_id, following_id)
);

create or replace function private.is_admin_role()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('owner', 'admin', 'moderator')
  );
$$;

grant usage on schema public to anon, authenticated;
grant usage on schema private to authenticated;
grant select on public.profiles, public.posts, public.comments,
  public.post_likes, public.comment_likes to anon, authenticated;
grant select on public.user_follows to authenticated;
grant insert on public.comments, public.post_likes, public.comment_likes to authenticated;
grant execute on function private.is_admin_role() to authenticated;

alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.comment_likes enable row level security;
alter table public.user_follows enable row level security;

create policy "Participants can read own follow relationships"
on public.user_follows for select to authenticated
using (follower_id = (select auth.uid()) or following_id = (select auth.uid()));

create policy "Anonymous can read published posts"
on public.posts for select to anon
using (status = 'published' and visibility in ('public', 'unlisted') and deleted_at is null);
create policy "Authenticated can read posts safely"
on public.posts for select to authenticated
using (
  (status = 'published' and visibility in ('public', 'unlisted') and deleted_at is null)
  or author_id = (select auth.uid()) or private.is_admin_role()
);

create policy "Anonymous can read visible comments"
on public.comments for select to anon
using (is_deleted = false and is_hidden = false);
create policy "Authenticated can read comments safely"
on public.comments for select to authenticated
using (is_deleted = false and is_hidden = false or author_id = (select auth.uid()) or private.is_admin_role());
create policy "Active users can create comments"
on public.comments for insert to authenticated
with check (author_id = (select auth.uid()));

create policy "Anonymous can read active post likes"
on public.post_likes for select to anon using (is_active = true);
create policy "Authenticated can read active or own post likes"
on public.post_likes for select to authenticated
using (is_active = true or user_id = (select auth.uid()));
create policy "Anonymous can read active comment likes"
on public.comment_likes for select to anon using (is_active = true);
create policy "Authenticated can read active or own comment likes"
on public.comment_likes for select to authenticated
using (is_active = true or user_id = (select auth.uid()));
