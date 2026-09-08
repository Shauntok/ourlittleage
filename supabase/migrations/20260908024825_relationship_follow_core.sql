alter table public.profiles
  add column follow_mode text not null default 'open';

alter table public.profiles
  add constraint profiles_follow_mode_check
  check (follow_mode in ('open', 'approval_required'));

create or replace function private.guard_follow_mode_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.follow_mode is distinct from old.follow_mode
    and (select auth.uid()) is not null
    and (select auth.uid()) <> old.id then
    raise insufficient_privilege using message = 'RELATIONSHIP_FOLLOW_MODE_NOT_OWNED';
  end if;

  return new;
end;
$$;

create trigger guard_follow_mode_update
before update of follow_mode on public.profiles
for each row execute function private.guard_follow_mode_update();

create table public.user_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,
  constraint user_follows_not_self check (follower_id <> following_id),
  constraint user_follows_pair_unique unique (follower_id, following_id),
  constraint user_follows_status_check check (status in ('pending', 'accepted')),
  constraint user_follows_acceptance_check check (
    (status = 'pending' and accepted_at is null)
    or (status = 'accepted' and accepted_at is not null)
  )
);

create index user_follows_followers_lookup_idx
on public.user_follows (following_id, status, created_at desc, id);

create index user_follows_following_lookup_idx
on public.user_follows (follower_id, status, created_at desc, id);

alter table public.user_follows enable row level security;

create policy "Participants can read own follow relationships"
on public.user_follows
for select
to authenticated
using (
  follower_id = (select auth.uid())
  or following_id = (select auth.uid())
  or private.is_owner_or_admin()
);

revoke all on public.user_follows from public, anon, authenticated;
grant select on public.user_follows to authenticated;
grant all on public.user_follows to service_role;

create or replace function private.lock_relationship_profiles(
  p_first_user_id uuid,
  p_second_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked_count integer;
begin
  perform p.id
  from public.profiles p
  where p.id = any(array[p_first_user_id, p_second_user_id])
  order by p.id
  for update;

  get diagnostics locked_count = row_count;

  if locked_count <> 2 then
    raise no_data_found using message = 'RELATIONSHIP_USER_NOT_FOUND';
  end if;
end;
$$;

create or replace function public.relationship_follow_user(
  p_actor_id uuid,
  p_target_id uuid
)
returns public.user_follows
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_status text;
  target_status text;
  target_follow_mode text;
  relationship public.user_follows%rowtype;
begin
  if p_actor_id is null or p_target_id is null then
    raise no_data_found using message = 'RELATIONSHIP_USER_NOT_FOUND';
  end if;

  if p_actor_id = p_target_id then
    raise check_violation using message = 'RELATIONSHIP_SELF_FOLLOW_NOT_ALLOWED';
  end if;

  perform private.lock_relationship_profiles(p_actor_id, p_target_id);

  select f.* into relationship
  from public.user_follows f
  where f.follower_id = p_actor_id
    and f.following_id = p_target_id;

  if found then
    return relationship;
  end if;

  select p.status into actor_status
  from public.profiles p
  where p.id = p_actor_id;

  select p.status, p.follow_mode
  into target_status, target_follow_mode
  from public.profiles p
  where p.id = p_target_id;

  if coalesce(actor_status, '') not in ('active', 'warned')
    or coalesce(target_status, '') not in ('active', 'warned') then
    raise insufficient_privilege using message = 'RELATIONSHIP_ACCOUNT_NOT_ELIGIBLE';
  end if;

  insert into public.user_follows (
    follower_id,
    following_id,
    status,
    accepted_at
  ) values (
    p_actor_id,
    p_target_id,
    case target_follow_mode
      when 'open' then 'accepted'
      else 'pending'
    end,
    case target_follow_mode
      when 'open' then now()
      else null
    end
  )
  returning * into relationship;

  return relationship;
end;
$$;

create or replace function public.relationship_unfollow_user(
  p_actor_id uuid,
  p_target_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.lock_relationship_profiles(p_actor_id, p_target_id);

  delete from public.user_follows f
  where f.follower_id = p_actor_id
    and f.following_id = p_target_id
    and f.status = 'accepted';

  return found;
end;
$$;

create or replace function public.relationship_cancel_pending(
  p_actor_id uuid,
  p_target_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.lock_relationship_profiles(p_actor_id, p_target_id);

  delete from public.user_follows f
  where f.follower_id = p_actor_id
    and f.following_id = p_target_id
    and f.status = 'pending';

  return found;
end;
$$;

create or replace function public.relationship_accept_request(
  p_actor_id uuid,
  p_request_id uuid
)
returns public.user_follows
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester_id uuid;
  requester_status text;
  recipient_status text;
  relationship public.user_follows%rowtype;
begin
  select f.follower_id into requester_id
  from public.user_follows f
  where f.id = p_request_id
    and f.following_id = p_actor_id
    and f.status = 'pending';

  if not found then
    raise insufficient_privilege using message = 'RELATIONSHIP_REQUEST_NOT_OWNED';
  end if;

  perform private.lock_relationship_profiles(requester_id, p_actor_id);

  select f.* into relationship
  from public.user_follows f
  where f.id = p_request_id
    and f.following_id = p_actor_id
    and f.status = 'pending'
  for update;

  if not found then
    raise no_data_found using message = 'RELATIONSHIP_REQUEST_NOT_FOUND';
  end if;

  select p.status into requester_status
  from public.profiles p
  where p.id = relationship.follower_id;

  select p.status into recipient_status
  from public.profiles p
  where p.id = relationship.following_id;

  if coalesce(requester_status, '') not in ('active', 'warned')
    or coalesce(recipient_status, '') not in ('active', 'warned') then
    raise insufficient_privilege using message = 'RELATIONSHIP_ACCOUNT_NOT_ELIGIBLE';
  end if;

  update public.user_follows f
  set status = 'accepted',
      accepted_at = now(),
      updated_at = now()
  where f.id = p_request_id
  returning f.* into relationship;

  return relationship;
end;
$$;

create or replace function public.relationship_reject_request(
  p_actor_id uuid,
  p_request_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester_id uuid;
begin
  select f.follower_id into requester_id
  from public.user_follows f
  where f.id = p_request_id
    and f.following_id = p_actor_id
    and f.status = 'pending';

  if not found then
    raise insufficient_privilege using message = 'RELATIONSHIP_REQUEST_NOT_OWNED';
  end if;

  perform private.lock_relationship_profiles(requester_id, p_actor_id);

  delete from public.user_follows f
  where f.id = p_request_id
    and f.following_id = p_actor_id
    and f.status = 'pending';

  if not found then
    raise insufficient_privilege using message = 'RELATIONSHIP_REQUEST_NOT_OWNED';
  end if;

  return true;
end;
$$;

create or replace function public.relationship_remove_follower(
  p_actor_id uuid,
  p_follower_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.lock_relationship_profiles(p_actor_id, p_follower_id);

  delete from public.user_follows f
  where f.follower_id = p_follower_id
    and f.following_id = p_actor_id
    and f.status = 'accepted';

  return found;
end;
$$;

create or replace function public.relationship_set_follow_mode(
  p_actor_id uuid,
  p_follow_mode text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_mode text;
begin
  if p_follow_mode not in ('open', 'approval_required') then
    raise check_violation using message = 'RELATIONSHIP_INVALID_FOLLOW_MODE';
  end if;

  update public.profiles p
  set follow_mode = p_follow_mode,
      updated_at = now()
  where p.id = p_actor_id
  returning p.follow_mode into next_mode;

  if not found then
    raise no_data_found using message = 'RELATIONSHIP_USER_NOT_FOUND';
  end if;

  return next_mode;
end;
$$;

create or replace function public.relationship_get_state(
  p_actor_id uuid,
  p_target_id uuid
)
returns table (
  outbound_status text,
  inbound_status text,
  is_following boolean,
  is_mutual boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    outbound.status,
    inbound.status,
    coalesce(outbound.status = 'accepted', false),
    coalesce(outbound.status = 'accepted' and inbound.status = 'accepted', false)
  from (values (1)) seed(value)
  left join public.user_follows outbound
    on outbound.follower_id = p_actor_id
   and outbound.following_id = p_target_id
  left join public.user_follows inbound
    on inbound.follower_id = p_target_id
   and inbound.following_id = p_actor_id;
$$;

create or replace function public.admin_get_resident_relationship_summary(
  p_actor_id uuid,
  p_resident_id uuid
)
returns table (
  followers_count bigint,
  following_count bigint,
  mutual_count bigint,
  pending_received_count bigint,
  pending_sent_count bigint,
  follow_mode text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = p_actor_id and p.role in ('owner', 'admin')
  ) then
    raise insufficient_privilege using message = 'RELATIONSHIP_ADMIN_FORBIDDEN';
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_resident_id) then
    raise no_data_found using message = 'RELATIONSHIP_USER_NOT_FOUND';
  end if;

  return query
  select
    (select count(*) from public.user_follows f where f.following_id = p_resident_id and f.status = 'accepted'),
    (select count(*) from public.user_follows f where f.follower_id = p_resident_id and f.status = 'accepted'),
    (
      select count(*)
      from public.user_follows outbound
      where outbound.follower_id = p_resident_id
        and outbound.status = 'accepted'
        and exists (
          select 1
          from public.user_follows inbound
          where inbound.follower_id = outbound.following_id
            and inbound.following_id = p_resident_id
            and inbound.status = 'accepted'
        )
    ),
    (select count(*) from public.user_follows f where f.following_id = p_resident_id and f.status = 'pending'),
    (select count(*) from public.user_follows f where f.follower_id = p_resident_id and f.status = 'pending'),
    (select p.follow_mode from public.profiles p where p.id = p_resident_id);
end;
$$;

create or replace function public.admin_list_resident_relationships(
  p_actor_id uuid,
  p_resident_id uuid,
  p_kind text,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  relationship_id uuid,
  resident_id uuid,
  username text,
  avatar_url text,
  relationship_status text,
  relationship_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = p_actor_id and p.role in ('owner', 'admin')
  ) then
    raise insufficient_privilege using message = 'RELATIONSHIP_ADMIN_FORBIDDEN';
  end if;

  if p_kind not in ('followers', 'following', 'mutual', 'pending_received', 'pending_sent')
    or p_limit < 1 or p_limit > 100 or p_offset < 0 then
    raise check_violation using message = 'RELATIONSHIP_INVALID_LIST_REQUEST';
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_resident_id) then
    raise no_data_found using message = 'RELATIONSHIP_USER_NOT_FOUND';
  end if;

  if p_kind = 'followers' then
    return query
    select f.id, p.id, p.username, p.avatar_url, f.status,
      coalesce(f.accepted_at, f.created_at), count(*) over ()
    from public.user_follows f
    join public.profiles p on p.id = f.follower_id
    where f.following_id = p_resident_id and f.status = 'accepted'
    order by coalesce(f.accepted_at, f.created_at) desc, f.id desc
    limit p_limit offset p_offset;
  elsif p_kind = 'following' then
    return query
    select f.id, p.id, p.username, p.avatar_url, f.status,
      coalesce(f.accepted_at, f.created_at), count(*) over ()
    from public.user_follows f
    join public.profiles p on p.id = f.following_id
    where f.follower_id = p_resident_id and f.status = 'accepted'
    order by coalesce(f.accepted_at, f.created_at) desc, f.id desc
    limit p_limit offset p_offset;
  elsif p_kind = 'mutual' then
    return query
    select outbound.id, p.id, p.username, p.avatar_url, 'accepted'::text,
      greatest(outbound.accepted_at, inbound.accepted_at), count(*) over ()
    from public.user_follows outbound
    join public.user_follows inbound
      on inbound.follower_id = outbound.following_id
     and inbound.following_id = outbound.follower_id
     and inbound.status = 'accepted'
    join public.profiles p on p.id = outbound.following_id
    where outbound.follower_id = p_resident_id
      and outbound.status = 'accepted'
    order by greatest(outbound.accepted_at, inbound.accepted_at) desc, outbound.id desc
    limit p_limit offset p_offset;
  elsif p_kind = 'pending_received' then
    return query
    select f.id, p.id, p.username, p.avatar_url, f.status,
      f.created_at, count(*) over ()
    from public.user_follows f
    join public.profiles p on p.id = f.follower_id
    where f.following_id = p_resident_id and f.status = 'pending'
    order by f.created_at desc, f.id desc
    limit p_limit offset p_offset;
  else
    return query
    select f.id, p.id, p.username, p.avatar_url, f.status,
      f.created_at, count(*) over ()
    from public.user_follows f
    join public.profiles p on p.id = f.following_id
    where f.follower_id = p_resident_id and f.status = 'pending'
    order by f.created_at desc, f.id desc
    limit p_limit offset p_offset;
  end if;
end;
$$;

revoke all on function private.lock_relationship_profiles(uuid, uuid)
from public, anon, authenticated;
revoke all on function private.guard_follow_mode_update()
from public, anon, authenticated;
grant execute on function private.lock_relationship_profiles(uuid, uuid)
to service_role;
grant execute on function private.guard_follow_mode_update()
to service_role;

revoke all on function public.relationship_follow_user(uuid, uuid) from public, anon, authenticated;
revoke all on function public.relationship_unfollow_user(uuid, uuid) from public, anon, authenticated;
revoke all on function public.relationship_cancel_pending(uuid, uuid) from public, anon, authenticated;
revoke all on function public.relationship_accept_request(uuid, uuid) from public, anon, authenticated;
revoke all on function public.relationship_reject_request(uuid, uuid) from public, anon, authenticated;
revoke all on function public.relationship_remove_follower(uuid, uuid) from public, anon, authenticated;
revoke all on function public.relationship_set_follow_mode(uuid, text) from public, anon, authenticated;
revoke all on function public.relationship_get_state(uuid, uuid) from public, anon, authenticated;
revoke all on function public.admin_get_resident_relationship_summary(uuid, uuid) from public, anon, authenticated;
revoke all on function public.admin_list_resident_relationships(uuid, uuid, text, integer, integer) from public, anon, authenticated;

grant execute on function public.relationship_follow_user(uuid, uuid) to service_role;
grant execute on function public.relationship_unfollow_user(uuid, uuid) to service_role;
grant execute on function public.relationship_cancel_pending(uuid, uuid) to service_role;
grant execute on function public.relationship_accept_request(uuid, uuid) to service_role;
grant execute on function public.relationship_reject_request(uuid, uuid) to service_role;
grant execute on function public.relationship_remove_follower(uuid, uuid) to service_role;
grant execute on function public.relationship_set_follow_mode(uuid, text) to service_role;
grant execute on function public.relationship_get_state(uuid, uuid) to service_role;
grant execute on function public.admin_get_resident_relationship_summary(uuid, uuid) to service_role;
grant execute on function public.admin_list_resident_relationships(uuid, uuid, text, integer, integer) to service_role;
