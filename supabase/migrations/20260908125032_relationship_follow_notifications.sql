alter table public.notifications
  add column relationship_id uuid;

alter table public.notifications
  add constraint notifications_relationship_id_fkey
  foreign key (relationship_id)
  references public.user_follows(id)
  on delete set null;

create index notifications_relationship_id_idx
on public.notifications (relationship_id)
where relationship_id is not null;

create unique index notifications_relationship_event_unique
on public.notifications (user_id, type, relationship_id)
where relationship_id is not null
  and type in ('follow', 'follow_request', 'follow_accepted');

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
  actor_username text;
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

  select p.status, coalesce(nullif(btrim(p.username), ''), '有位居民')
  into actor_status, actor_username
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

  insert into public.notifications (
    user_id,
    actor_id,
    relationship_id,
    type,
    title,
    content,
    is_read,
    deleted_at,
    last_activity_at
  ) values (
    p_target_id,
    p_actor_id,
    relationship.id,
    case relationship.status
      when 'accepted' then 'follow'
      else 'follow_request'
    end,
    case relationship.status
      when 'accepted' then '有居民关注了你'
      else '新的关注申请'
    end,
    case relationship.status
      when 'accepted' then format('%s 开始关注你的房间。', actor_username)
      else format('%s 想关注你的房间，正在等待回应。', actor_username)
    end,
    false,
    null,
    now()
  )
  on conflict (user_id, type, relationship_id)
  where relationship_id is not null
    and type in ('follow', 'follow_request', 'follow_accepted')
  do nothing;

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
declare
  relationship_id_to_cancel uuid;
begin
  perform private.lock_relationship_profiles(p_actor_id, p_target_id);

  select f.id into relationship_id_to_cancel
  from public.user_follows f
  where f.follower_id = p_actor_id
    and f.following_id = p_target_id
    and f.status = 'pending'
  for update;

  if not found then
    return false;
  end if;

  update public.notifications n
  set is_read = true,
      deleted_at = coalesce(n.deleted_at, now())
  where n.relationship_id = relationship_id_to_cancel
    and n.user_id = p_target_id
    and n.type = 'follow_request';

  delete from public.user_follows f
  where f.id = relationship_id_to_cancel;

  return true;
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
  recipient_username text;
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

  select p.status, coalesce(nullif(btrim(p.username), ''), '有位居民')
  into recipient_status, recipient_username
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

  update public.notifications n
  set is_read = true,
      deleted_at = null
  where n.relationship_id = relationship.id
    and n.user_id = p_actor_id
    and n.type = 'follow_request';

  insert into public.notifications (
    user_id,
    actor_id,
    relationship_id,
    type,
    title,
    content,
    is_read,
    deleted_at,
    last_activity_at
  ) values (
    relationship.follower_id,
    p_actor_id,
    relationship.id,
    'follow_accepted',
    '关注申请已接受',
    format('%s 接受了你的关注申请。', recipient_username),
    false,
    null,
    now()
  )
  on conflict (user_id, type, relationship_id)
  where relationship_id is not null
    and type in ('follow', 'follow_request', 'follow_accepted')
  do nothing;

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

  update public.notifications n
  set is_read = true,
      deleted_at = coalesce(n.deleted_at, now())
  where n.relationship_id = p_request_id
    and n.user_id = p_actor_id
    and n.type = 'follow_request';

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

create or replace function public.relationship_get_public_summary(
  p_resident_id uuid
)
returns table (
  followers_count bigint,
  following_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_resident_id is null
    or not exists (select 1 from public.profiles p where p.id = p_resident_id) then
    raise no_data_found using message = 'RELATIONSHIP_USER_NOT_FOUND';
  end if;

  return query
  select
    (select count(*) from public.user_follows f
     where f.following_id = p_resident_id and f.status = 'accepted'),
    (select count(*) from public.user_follows f
     where f.follower_id = p_resident_id and f.status = 'accepted');
end;
$$;

create or replace function public.relationship_list_public(
  p_resident_id uuid,
  p_kind text,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  resident_id uuid,
  username text,
  avatar_url text,
  relationship_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_kind is null
    or p_kind not in ('followers', 'following')
    or p_limit is null
    or p_limit < 1
    or p_limit > 100
    or p_offset is null
    or p_offset < 0 then
    raise check_violation using message = 'RELATIONSHIP_INVALID_LIST_REQUEST';
  end if;

  if p_resident_id is null
    or not exists (select 1 from public.profiles p where p.id = p_resident_id) then
    raise no_data_found using message = 'RELATIONSHIP_USER_NOT_FOUND';
  end if;

  if p_kind = 'followers' then
    return query
    select
      p.id,
      p.username,
      p.avatar_url,
      f.accepted_at,
      count(*) over ()
    from public.user_follows f
    join public.profiles p on p.id = f.follower_id
    where f.following_id = p_resident_id
      and f.status = 'accepted'
    order by f.accepted_at desc, f.id desc
    limit p_limit offset p_offset;
  else
    return query
    select
      p.id,
      p.username,
      p.avatar_url,
      f.accepted_at,
      count(*) over ()
    from public.user_follows f
    join public.profiles p on p.id = f.following_id
    where f.follower_id = p_resident_id
      and f.status = 'accepted'
    order by f.accepted_at desc, f.id desc
    limit p_limit offset p_offset;
  end if;
end;
$$;

revoke all on function public.relationship_follow_user(uuid, uuid)
from public, anon, authenticated;
revoke all on function public.relationship_unfollow_user(uuid, uuid)
from public, anon, authenticated;
revoke all on function public.relationship_cancel_pending(uuid, uuid)
from public, anon, authenticated;
revoke all on function public.relationship_accept_request(uuid, uuid)
from public, anon, authenticated;
revoke all on function public.relationship_reject_request(uuid, uuid)
from public, anon, authenticated;
revoke all on function public.relationship_remove_follower(uuid, uuid)
from public, anon, authenticated;

grant execute on function public.relationship_follow_user(uuid, uuid)
to service_role;
grant execute on function public.relationship_unfollow_user(uuid, uuid)
to service_role;
grant execute on function public.relationship_cancel_pending(uuid, uuid)
to service_role;
grant execute on function public.relationship_accept_request(uuid, uuid)
to service_role;
grant execute on function public.relationship_reject_request(uuid, uuid)
to service_role;
grant execute on function public.relationship_remove_follower(uuid, uuid)
to service_role;

revoke all on function public.relationship_get_public_summary(uuid)
from public, anon, authenticated;
revoke all on function public.relationship_list_public(uuid, text, integer, integer)
from public, anon, authenticated;
grant execute on function public.relationship_get_public_summary(uuid)
to anon, authenticated, service_role;
grant execute on function public.relationship_list_public(uuid, text, integer, integer)
to anon, authenticated, service_role;
