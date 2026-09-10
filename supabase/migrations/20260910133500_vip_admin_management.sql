begin;

alter table public.vip_membership_events
add column if not exists request_payload jsonb;

alter table public.vip_membership_events
add constraint vip_membership_events_request_payload_check
check (request_payload is null or pg_catalog.jsonb_typeof(request_payload) = 'object');

create or replace function public.vip_admin_get_overview(
  p_actor_id uuid,
  p_user_id uuid,
  p_page integer default 1,
  p_page_size integer default 10
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.now();
  v_membership jsonb;
  v_history_items jsonb;
  v_history_total bigint;
begin
  if p_actor_id is null
    or p_user_id is null
    or p_page is null
    or p_page_size is null
    or p_page < 1
    or p_page > 1000000
    or p_page_size < 1
    or p_page_size > 50
  then
    raise exception 'Invalid VIP overview request'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_actor_id
      and role in ('owner', 'admin')
      and status in ('active', 'warned')
  ) then
    raise exception 'VIP administrator required'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'VIP resident not found'
      using errcode = 'P0002';
  end if;

  select pg_catalog.to_jsonb(membership)
  into v_membership
  from public.vip_memberships as membership
  where membership.user_id = p_user_id;

  select pg_catalog.count(*)
  into v_history_total
  from public.vip_membership_events as event
  where event.user_id = p_user_id;

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'id', history.id,
        'event_type', history.event_type,
        'reason', history.reason,
        'actor_id', history.actor_id,
        'actor_username', history.actor_username,
        'request_id', history.request_id,
        'created_at', history.created_at,
        'previous_state', history.previous_state,
        'new_state', history.new_state
      )
      order by history.created_at desc, history.id desc
    ),
    '[]'::pg_catalog.jsonb
  )
  into v_history_items
  from (
    select event.*, actor.username as actor_username
    from public.vip_membership_events as event
    left join public.profiles as actor on actor.id = event.actor_id
    where event.user_id = p_user_id
    order by event.created_at desc, event.id desc
    limit p_page_size
    offset ((p_page - 1) * p_page_size)
  ) as history;

  return pg_catalog.jsonb_build_object(
    'database_now', v_now,
    'flags', public.vip_get_feature_flags(),
    'membership', v_membership,
    'entitlement', public.vip_get_entitlement(p_user_id),
    'history', pg_catalog.jsonb_build_object(
      'items', v_history_items,
      'total', v_history_total,
      'page', p_page,
      'page_size', p_page_size
    )
  );
end;
$$;

create or replace function public.vip_admin_apply_membership_action(
  p_actor_id uuid,
  p_user_id uuid,
  p_event_type text,
  p_duration_days integer,
  p_reason text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.now();
  v_reason text;
  v_request_payload jsonb;
  v_previous public.vip_memberships%rowtype;
  v_membership public.vip_memberships%rowtype;
  v_existing_event public.vip_membership_events%rowtype;
  v_event public.vip_membership_events%rowtype;
  v_had_previous boolean := false;
  v_admin_action text;
  v_extension_base timestamptz;
begin
  if p_actor_id is null
    or p_user_id is null
    or p_request_id is null
    or p_event_type is null
    or p_event_type not in ('grant', 'extend', 'cancel', 'revoke')
  then
    raise exception 'Invalid VIP mutation request'
      using errcode = '22023';
  end if;

  if (
    p_event_type in ('grant', 'extend')
    and (p_duration_days is null or p_duration_days < 1 or p_duration_days > 3650)
  ) or (
    p_event_type in ('cancel', 'revoke')
    and p_duration_days is not null
  ) then
    raise exception 'Invalid VIP duration'
      using errcode = '22023';
  end if;

  v_reason := nullif(pg_catalog.btrim(p_reason), '');
  if v_reason is null or pg_catalog.char_length(v_reason) > 500 then
    raise exception 'Invalid VIP mutation reason'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_actor_id
      and role = 'owner'
      and status in ('active', 'warned')
  ) then
    raise exception 'VIP owner required'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'VIP resident not found'
      using errcode = 'P0002';
  end if;

  v_request_payload := pg_catalog.jsonb_build_object(
    'duration_days', p_duration_days
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_request_id::pg_catalog.text, 0)
  );

  select event.*
  into v_existing_event
  from public.vip_membership_events as event
  where event.request_id = p_request_id;

  if found then
    if v_existing_event.actor_id <> p_actor_id
      or v_existing_event.user_id <> p_user_id
      or v_existing_event.event_type <> p_event_type
      or v_existing_event.reason <> v_reason
      or v_existing_event.request_payload is distinct from v_request_payload
    then
      raise exception 'VIP request id was already used for a different mutation'
        using errcode = '22023';
    end if;

    return pg_catalog.jsonb_build_object(
      'idempotent', true,
      'membership', v_existing_event.new_state,
      'event', pg_catalog.to_jsonb(v_existing_event)
    );
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::pg_catalog.text, 1)
  );

  select membership.*
  into v_previous
  from public.vip_memberships as membership
  where membership.user_id = p_user_id
  for update;
  v_had_previous := found;

  if p_event_type in ('grant', 'extend')
    and not exists (
      select 1
      from public.profiles
      where id = p_user_id
        and status in ('active', 'warned')
    )
  then
    raise exception 'VIP resident account is restricted'
      using errcode = '42501';
  end if;

  if p_event_type = 'grant' then
    if v_had_previous and v_previous.status = 'active' then
      raise exception 'Active VIP membership must be extended'
        using errcode = '22023';
    end if;

    insert into public.vip_memberships (
      user_id,
      status,
      started_at,
      expires_at,
      cancel_at_period_end
    )
    values (
      p_user_id,
      'active',
      v_now,
      v_now + pg_catalog.make_interval(days => p_duration_days),
      false
    )
    on conflict (user_id) do update
    set status = 'active',
        started_at = excluded.started_at,
        expires_at = excluded.expires_at,
        cancel_at_period_end = false,
        updated_at = v_now
    returning * into v_membership;
  elsif p_event_type = 'extend' then
    if not v_had_previous or v_previous.status <> 'active' then
      raise exception 'Only active VIP membership can be extended'
        using errcode = '22023';
    end if;

    v_extension_base := case
      when v_previous.expires_at > v_now then v_previous.expires_at
      else v_now
    end;

    update public.vip_memberships
    set expires_at = v_extension_base + pg_catalog.make_interval(days => p_duration_days),
        updated_at = v_now
    where user_id = p_user_id
    returning * into v_membership;
  elsif p_event_type = 'cancel' then
    if not v_had_previous
      or v_previous.status <> 'active'
      or v_previous.cancel_at_period_end
    then
      raise exception 'Invalid VIP period-end cancellation'
        using errcode = '22023';
    end if;

    update public.vip_memberships
    set cancel_at_period_end = true,
        updated_at = v_now
    where user_id = p_user_id
    returning * into v_membership;
  else
    if not v_had_previous or v_previous.status = 'revoked' then
      raise exception 'Invalid VIP revocation'
        using errcode = '22023';
    end if;

    update public.vip_memberships
    set status = 'revoked',
        cancel_at_period_end = false,
        updated_at = v_now
    where user_id = p_user_id
    returning * into v_membership;
  end if;

  insert into public.vip_membership_events (
    user_id,
    event_type,
    previous_state,
    new_state,
    reason,
    actor_id,
    request_id,
    request_payload
  )
  values (
    p_user_id,
    p_event_type,
    case when v_had_previous then pg_catalog.to_jsonb(v_previous) end,
    pg_catalog.to_jsonb(v_membership),
    v_reason,
    p_actor_id,
    p_request_id,
    v_request_payload
  )
  returning * into v_event;

  v_admin_action := case p_event_type
    when 'grant' then 'vip_grant'
    when 'extend' then 'vip_extend'
    when 'cancel' then 'vip_cancel_period_end'
    else 'vip_revoke'
  end;

  insert into public.admin_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details
  )
  values (
    p_actor_id,
    v_admin_action,
    'user',
    p_user_id::pg_catalog.text,
    pg_catalog.jsonb_build_object(
      'reason', v_reason,
      'request_id', p_request_id,
      'event_id', v_event.id,
      'previous_status', case when v_had_previous then v_previous.status end,
      'new_status', v_membership.status,
      'expires_at', v_membership.expires_at
    )::pg_catalog.text
  );

  return pg_catalog.jsonb_build_object(
    'idempotent', false,
    'membership', pg_catalog.to_jsonb(v_membership),
    'event', pg_catalog.to_jsonb(v_event)
  );
end;
$$;

revoke all on function public.vip_admin_get_overview(uuid, uuid, integer, integer)
from public, anon, authenticated;
revoke all on function public.vip_admin_apply_membership_action(
  uuid,
  uuid,
  text,
  integer,
  text,
  uuid
)
from public, anon, authenticated;

grant execute on function public.vip_admin_get_overview(uuid, uuid, integer, integer)
to service_role;
grant execute on function public.vip_admin_apply_membership_action(
  uuid,
  uuid,
  text,
  integer,
  text,
  uuid
)
to service_role;

commit;
