begin;

create schema if not exists private;

create table public.vip_feature_flags (
  id boolean primary key default true,
  vip_entitlement_enabled boolean not null default false,
  vip_public_ui_enabled boolean not null default false,
  vip_purchase_enabled boolean not null default false,
  vip_referral_reward_enabled boolean not null default false,
  vip_public_badge_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vip_feature_flags_singleton_check check (id)
);

create table public.vip_memberships (
  user_id uuid primary key references public.profiles(id),
  status text not null default 'active',
  started_at timestamptz not null,
  expires_at timestamptz not null,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vip_memberships_status_check
    check (status in ('active', 'cancelled', 'revoked')),
  constraint vip_memberships_time_window_check
    check (expires_at > started_at)
);

create table public.vip_membership_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  event_type text not null,
  previous_state jsonb,
  new_state jsonb not null,
  reason text not null,
  actor_id uuid not null references public.profiles(id),
  request_id uuid not null unique,
  created_at timestamptz not null default now(),
  constraint vip_membership_events_type_check
    check (event_type in ('grant', 'extend', 'cancel', 'revoke')),
  constraint vip_membership_events_reason_check
    check (btrim(reason) <> '' and char_length(reason) <= 500),
  constraint vip_membership_events_previous_state_check
    check (previous_state is null or jsonb_typeof(previous_state) = 'object'),
  constraint vip_membership_events_new_state_check
    check (jsonb_typeof(new_state) = 'object')
);

create index vip_memberships_active_expiry_idx
on public.vip_memberships (expires_at)
where status = 'active';

create index vip_membership_events_user_created_idx
on public.vip_membership_events (user_id, created_at desc);

create index vip_membership_events_actor_created_idx
on public.vip_membership_events (actor_id, created_at desc);

alter table public.vip_feature_flags enable row level security;
alter table public.vip_memberships enable row level security;
alter table public.vip_membership_events enable row level security;

revoke all on table
  public.vip_feature_flags,
  public.vip_memberships,
  public.vip_membership_events
from public, anon, authenticated;

grant select on table
  public.vip_feature_flags,
  public.vip_memberships,
  public.vip_membership_events
to service_role;

create or replace function private.prevent_vip_membership_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'VIP membership events are append-only'
    using errcode = '42501';
end;
$$;

revoke all on function private.prevent_vip_membership_event_mutation()
from public, anon, authenticated;

create trigger vip_membership_events_append_only
before update or delete on public.vip_membership_events
for each row execute function private.prevent_vip_membership_event_mutation();

create or replace function public.vip_get_feature_flags()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_flags jsonb;
begin
  select pg_catalog.jsonb_build_object(
    'vip_entitlement_enabled', vip_entitlement_enabled,
    'vip_public_ui_enabled', vip_public_ui_enabled,
    'vip_purchase_enabled', vip_purchase_enabled,
    'vip_referral_reward_enabled', vip_referral_reward_enabled,
    'vip_public_badge_enabled', vip_public_badge_enabled
  )
  into v_flags
  from public.vip_feature_flags
  where id = true;

  return coalesce(
    v_flags,
    pg_catalog.jsonb_build_object(
      'vip_entitlement_enabled', false,
      'vip_public_ui_enabled', false,
      'vip_purchase_enabled', false,
      'vip_referral_reward_enabled', false,
      'vip_public_badge_enabled', false
    )
  );
end;
$$;

create or replace function public.vip_get_membership(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select pg_catalog.to_jsonb(membership)
  from public.vip_memberships as membership
  where membership.user_id = p_user_id;
$$;

create or replace function public.vip_admin_get_membership(
  p_actor_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_membership jsonb;
begin
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

  select pg_catalog.to_jsonb(membership)
  into v_membership
  from public.vip_memberships as membership
  where membership.user_id = p_user_id;

  return v_membership;
end;
$$;

create or replace function public.vip_get_entitlement(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_entitlement_enabled boolean := false;
  v_account_status text;
  v_membership public.vip_memberships%rowtype;
  v_membership_json jsonb;
  v_reason text;
  v_is_active boolean := false;
begin
  select flags.vip_entitlement_enabled
  into v_entitlement_enabled
  from public.vip_feature_flags as flags
  where flags.id = true;

  if not coalesce(v_entitlement_enabled, false) then
    return pg_catalog.jsonb_build_object(
      'is_active', false,
      'reason', 'feature_disabled',
      'membership', null
    );
  end if;

  select profile.status
  into v_account_status
  from public.profiles as profile
  where profile.id = p_user_id;

  select membership.*
  into v_membership
  from public.vip_memberships as membership
  where membership.user_id = p_user_id;

  if found then
    v_membership_json := pg_catalog.to_jsonb(v_membership);
  end if;

  if coalesce(v_account_status, '') not in ('active', 'warned') then
    v_reason := 'account_restricted';
  elsif v_membership.user_id is null then
    v_reason := 'membership_missing';
  elsif v_membership.status <> 'active' then
    v_reason := 'inactive_status';
  elsif v_membership.started_at > pg_catalog.now() then
    v_reason := 'not_started';
  elsif v_membership.expires_at <= pg_catalog.now() then
    v_reason := 'expired';
  else
    v_reason := 'active';
    v_is_active := true;
  end if;

  return pg_catalog.jsonb_build_object(
    'is_active', v_is_active,
    'reason', v_reason,
    'membership', v_membership_json
  );
end;
$$;

create or replace function public.vip_apply_membership_event(
  p_actor_id uuid,
  p_user_id uuid,
  p_event_type text,
  p_started_at timestamptz,
  p_expires_at timestamptz,
  p_reason text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text;
  v_previous public.vip_memberships%rowtype;
  v_membership public.vip_memberships%rowtype;
  v_existing_event public.vip_membership_events%rowtype;
  v_event public.vip_membership_events%rowtype;
  v_had_previous boolean := false;
begin
  if p_actor_id is null
    or p_user_id is null
    or p_request_id is null
    or p_event_type not in ('grant', 'extend', 'cancel', 'revoke')
  then
    raise exception 'Invalid VIP mutation request'
      using errcode = '22023';
  end if;

  v_reason := nullif(pg_catalog.btrim(p_reason), '');

  if v_reason is null or pg_catalog.char_length(v_reason) > 500 then
    raise exception 'Invalid VIP mutation reason'
      using errcode = '22023';
  end if;

  if (
    p_event_type = 'grant'
    and (
      p_started_at is null
      or p_expires_at is null
      or p_expires_at <= p_started_at
    )
  ) or (
    p_event_type = 'extend'
    and (p_started_at is not null or p_expires_at is null)
  ) or (
    p_event_type in ('cancel', 'revoke')
    and (p_started_at is not null or p_expires_at is not null)
  ) then
    raise exception 'Invalid VIP mutation parameters'
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

  if not exists (
    select 1
    from public.profiles
    where id = p_user_id
  ) then
    raise exception 'VIP resident not found'
      using errcode = 'P0002';
  end if;

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
      or (
        p_event_type = 'grant'
        and (
          (v_existing_event.new_state ->> 'started_at')::pg_catalog.timestamptz
            is distinct from p_started_at
          or (v_existing_event.new_state ->> 'expires_at')::pg_catalog.timestamptz
            is distinct from p_expires_at
        )
      )
      or (
        p_event_type = 'extend'
        and (v_existing_event.new_state ->> 'expires_at')::pg_catalog.timestamptz
          is distinct from p_expires_at
      )
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
    if v_had_previous
      and v_previous.status = 'active'
      and v_previous.expires_at > pg_catalog.now()
    then
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
      p_started_at,
      p_expires_at,
      false
    )
    on conflict (user_id) do update
    set status = 'active',
        started_at = excluded.started_at,
        expires_at = excluded.expires_at,
        cancel_at_period_end = false,
        updated_at = pg_catalog.now()
    returning * into v_membership;
  elsif p_event_type = 'extend' then
    if not v_had_previous
      or v_previous.status <> 'active'
      or p_expires_at <= v_previous.expires_at
    then
      raise exception 'Invalid VIP extension'
        using errcode = '22023';
    end if;

    update public.vip_memberships
    set expires_at = p_expires_at,
        updated_at = pg_catalog.now()
    where user_id = p_user_id
    returning * into v_membership;
  else
    if not v_had_previous
      or (p_event_type = 'cancel' and v_previous.status <> 'active')
      or (p_event_type = 'revoke' and v_previous.status = 'revoked')
    then
      raise exception 'Invalid VIP status change'
        using errcode = '22023';
    end if;

    update public.vip_memberships
    set status = case
          when p_event_type = 'cancel' then 'cancelled'
          else 'revoked'
        end,
        cancel_at_period_end = false,
        updated_at = pg_catalog.now()
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
    request_id
  )
  values (
    p_user_id,
    p_event_type,
    case when v_had_previous then pg_catalog.to_jsonb(v_previous) end,
    pg_catalog.to_jsonb(v_membership),
    v_reason,
    p_actor_id,
    p_request_id
  )
  returning * into v_event;

  return pg_catalog.jsonb_build_object(
    'idempotent', false,
    'membership', pg_catalog.to_jsonb(v_membership),
    'event', pg_catalog.to_jsonb(v_event)
  );
end;
$$;

revoke all on function public.vip_get_feature_flags()
from public, anon, authenticated;
revoke all on function public.vip_get_membership(uuid)
from public, anon, authenticated;
revoke all on function public.vip_admin_get_membership(uuid, uuid)
from public, anon, authenticated;
revoke all on function public.vip_get_entitlement(uuid)
from public, anon, authenticated;
revoke all on function public.vip_apply_membership_event(
  uuid,
  uuid,
  text,
  timestamptz,
  timestamptz,
  text,
  uuid
)
from public, anon, authenticated;

grant execute on function public.vip_get_feature_flags()
to service_role;
grant execute on function public.vip_get_membership(uuid)
to service_role;
grant execute on function public.vip_admin_get_membership(uuid, uuid)
to service_role;
grant execute on function public.vip_get_entitlement(uuid)
to service_role;
grant execute on function public.vip_apply_membership_event(
  uuid,
  uuid,
  text,
  timestamptz,
  timestamptz,
  text,
  uuid
)
to service_role;

insert into public.vip_feature_flags (id)
values (true)
on conflict (id) do nothing;

commit;
