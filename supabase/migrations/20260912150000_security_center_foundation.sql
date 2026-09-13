begin;

create schema if not exists private;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.security_feature_flags (
  id smallint primary key default 1,
  security_center_enabled boolean not null default true,
  security_event_collection_enabled boolean not null default true,
  risk_evaluation_enabled boolean not null default false,
  automatic_enforcement_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint security_feature_flags_singleton_check check (id = 1)
);

create table public.security_risk_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  risk_level text not null default 'low',
  review_status text not null default 'no_review_required',
  last_event_at timestamptz,
  last_reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint security_risk_profiles_risk_level_check
    check (risk_level in ('low', 'medium', 'high', 'critical')),
  constraint security_risk_profiles_review_status_check
    check (review_status in ('no_review_required', 'pending', 'reviewed')),
  constraint security_risk_profiles_notes_check
    check (notes is null or char_length(notes) <= 2000)
);

create table public.security_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  request_fingerprint text not null,
  event_type text not null,
  category text not null,
  -- Historical identifiers intentionally outlive profiles and remain immutable.
  user_id uuid,
  actor_id uuid,
  reason text not null,
  severity text not null,
  source text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint security_events_request_fingerprint_check
    check (
      char_length(request_fingerprint) = 64
      and request_fingerprint ~ '^[0-9a-f]{64}$'
    ),
  constraint security_events_type_check
    check (event_type in (
      'risk_level_changed',
      'review_marked_pending',
      'review_marked_complete',
      'internal_note_updated'
    )),
  constraint security_events_category_check
    check (category in (
      'auth',
      'account',
      'admin',
      'moderation',
      'permission',
      'relationship',
      'vip',
      'system'
    )),
  constraint security_events_reason_check
    check (btrim(reason) <> '' and char_length(reason) <= 500),
  constraint security_events_severity_check
    check (severity in ('low', 'medium', 'high', 'critical')),
  constraint security_events_source_check
    check (source = 'security_center_manual'),
  constraint security_events_metadata_check
    check (jsonb_typeof(metadata) = 'object')
);

insert into public.security_feature_flags (id)
values (1);

insert into public.security_risk_profiles (user_id)
select profile.id
from public.profiles as profile
on conflict (user_id) do nothing;

create index security_events_severity_occurred_idx
on public.security_events (severity, occurred_at desc);

create index security_events_user_occurred_idx
on public.security_events (user_id, occurred_at desc);

create index security_events_actor_occurred_idx
on public.security_events (actor_id, occurred_at desc);

create index security_risk_profiles_review_updated_idx
on public.security_risk_profiles (review_status, updated_at desc);

create index security_risk_profiles_risk_updated_idx
on public.security_risk_profiles (risk_level, updated_at desc);

alter table public.security_feature_flags enable row level security;
alter table public.security_risk_profiles enable row level security;
alter table public.security_events enable row level security;

revoke all on table
  public.security_feature_flags,
  public.security_risk_profiles,
  public.security_events
from public, anon, authenticated;

grant select on table
  public.security_feature_flags,
  public.security_risk_profiles,
  public.security_events
to service_role;

create or replace function private.initialize_security_risk_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.security_risk_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function private.initialize_security_risk_profile()
from public, anon, authenticated;

create trigger profiles_initialize_security_risk_profile
after insert on public.profiles
for each row execute function private.initialize_security_risk_profile();

create or replace function private.prevent_security_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Security events are append-only'
    using errcode = '42501';
end;
$$;

revoke all on function private.prevent_security_event_mutation()
from public, anon, authenticated;

create trigger security_events_append_only
before update or delete on public.security_events
for each row execute function private.prevent_security_event_mutation();

create or replace function public.security_get_feature_flags()
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
    'security_center_enabled', flags.security_center_enabled,
    'security_event_collection_enabled', flags.security_event_collection_enabled,
    'risk_evaluation_enabled', flags.risk_evaluation_enabled,
    'automatic_enforcement_enabled', flags.automatic_enforcement_enabled
  )
  into v_flags
  from public.security_feature_flags as flags
  where flags.id = 1;

  return coalesce(
    v_flags,
    pg_catalog.jsonb_build_object(
      'security_center_enabled', false,
      'security_event_collection_enabled', false,
      'risk_evaluation_enabled', false,
      'automatic_enforcement_enabled', false
    )
  );
end;
$$;

create or replace function public.security_admin_get_overview(
  p_actor_id uuid,
  p_page integer default 1,
  p_page_size integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_pending_review_count bigint;
  v_risk_counts jsonb;
  v_event_total bigint;
  v_event_items jsonb;
begin
  if p_actor_id is null
    or p_page is null
    or p_page_size is null
    or p_page < 1
    or p_page > 1000000
    or p_page_size < 1
    or p_page_size > 100
  then
    raise exception 'Invalid security overview request'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_actor_id
      and role in ('owner', 'admin')
      and status in ('active', 'warned')
  ) then
    raise exception 'Security administrator required'
      using errcode = '42501';
  end if;

  select pg_catalog.count(*)
  into v_pending_review_count
  from public.security_risk_profiles
  where review_status = 'pending';

  select pg_catalog.jsonb_build_object(
    'low', pg_catalog.count(*) filter (where risk_level = 'low'),
    'medium', pg_catalog.count(*) filter (where risk_level = 'medium'),
    'high', pg_catalog.count(*) filter (where risk_level = 'high'),
    'critical', pg_catalog.count(*) filter (where risk_level = 'critical')
  )
  into v_risk_counts
  from public.security_risk_profiles;

  select pg_catalog.count(*)
  into v_event_total
  from public.security_events;

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'id', event_row.id,
        'event_type', event_row.event_type,
        'category', event_row.category,
        'user_id', event_row.user_id,
        'username', event_row.username,
        'actor_id', event_row.actor_id,
        'actor_username', event_row.actor_username,
        'reason', event_row.reason,
        'severity', event_row.severity,
        'source', event_row.source,
        'metadata', event_row.metadata,
        'occurred_at', event_row.occurred_at
      )
      order by event_row.occurred_at desc, event_row.id desc
    ),
    '[]'::jsonb
  )
  into v_event_items
  from (
    select
      event.id,
      event.event_type,
      event.category,
      event.user_id,
      target.username,
      event.actor_id,
      actor.username as actor_username,
      event.reason,
      event.severity,
      event.source,
      event.metadata,
      event.occurred_at
    from public.security_events as event
    left join public.profiles as target on target.id = event.user_id
    left join public.profiles as actor on actor.id = event.actor_id
    order by event.occurred_at desc, event.id desc
    limit p_page_size
    offset ((p_page - 1) * p_page_size)
  ) as event_row;

  return pg_catalog.jsonb_build_object(
    'flags', public.security_get_feature_flags(),
    'pending_review_count', v_pending_review_count,
    'risk_counts', v_risk_counts,
    'events', pg_catalog.jsonb_build_object(
      'items', v_event_items,
      'total', v_event_total,
      'page', p_page,
      'page_size', p_page_size
    )
  );
end;
$$;

create or replace function public.security_admin_get_resident(
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
  v_profile jsonb;
  v_event_total bigint;
  v_event_items jsonb;
begin
  if p_actor_id is null
    or p_user_id is null
    or p_page is null
    or p_page_size is null
    or p_page < 1
    or p_page > 1000000
    or p_page_size < 1
    or p_page_size > 100
  then
    raise exception 'Invalid resident security request'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_actor_id
      and role in ('owner', 'admin')
      and status in ('active', 'warned')
  ) then
    raise exception 'Security administrator required'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Security resident not found'
      using errcode = 'P0002';
  end if;

  select pg_catalog.jsonb_build_object(
    'user_id', risk.user_id,
    'risk_level', risk.risk_level,
    'review_status', risk.review_status,
    'last_event_at', risk.last_event_at,
    'last_reviewed_at', risk.last_reviewed_at,
    'reviewed_by', risk.reviewed_by,
    'notes', risk.notes,
    'updated_at', risk.updated_at
  )
  into v_profile
  from public.security_risk_profiles as risk
  where risk.user_id = p_user_id;

  if v_profile is null then
    raise exception 'Security risk profile unavailable';
  end if;

  select pg_catalog.count(*)
  into v_event_total
  from public.security_events
  where user_id = p_user_id;

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'id', event_row.id,
        'event_type', event_row.event_type,
        'category', event_row.category,
        'user_id', event_row.user_id,
        'username', event_row.username,
        'actor_id', event_row.actor_id,
        'actor_username', event_row.actor_username,
        'reason', event_row.reason,
        'severity', event_row.severity,
        'source', event_row.source,
        'metadata', event_row.metadata,
        'occurred_at', event_row.occurred_at
      )
      order by event_row.occurred_at desc, event_row.id desc
    ),
    '[]'::jsonb
  )
  into v_event_items
  from (
    select
      event.id,
      event.event_type,
      event.category,
      event.user_id,
      target.username,
      event.actor_id,
      actor.username as actor_username,
      event.reason,
      event.severity,
      event.source,
      event.metadata,
      event.occurred_at
    from public.security_events as event
    left join public.profiles as target on target.id = event.user_id
    left join public.profiles as actor on actor.id = event.actor_id
    where event.user_id = p_user_id
    order by event.occurred_at desc, event.id desc
    limit p_page_size
    offset ((p_page - 1) * p_page_size)
  ) as event_row;

  return pg_catalog.jsonb_build_object(
    'profile', v_profile,
    'events', pg_catalog.jsonb_build_object(
      'items', v_event_items,
      'total', v_event_total,
      'page', p_page,
      'page_size', p_page_size
    )
  );
end;
$$;

create or replace function public.security_owner_apply_risk_action(
  p_actor_id uuid,
  p_user_id uuid,
  p_action text,
  p_risk_level text,
  p_review_status text,
  p_note text,
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
  v_note text;
  v_request_payload jsonb;
  v_request_fingerprint text;
  v_existing_event public.security_events%rowtype;
  v_previous public.security_risk_profiles%rowtype;
  v_profile public.security_risk_profiles%rowtype;
  v_event public.security_events%rowtype;
  v_event_type text;
  v_admin_action text;
  v_metadata jsonb;
begin
  if p_actor_id is null
    or p_user_id is null
    or p_action is null
    or p_request_id is null
    or p_action not in ('set_risk', 'set_review', 'set_note')
  then
    raise exception 'Invalid security mutation request'
      using errcode = '22023';
  end if;

  v_reason := nullif(pg_catalog.btrim(p_reason), '');
  if v_reason is null or pg_catalog.char_length(v_reason) > 500 then
    raise exception 'Invalid security mutation reason'
      using errcode = '22023';
  end if;

  if p_action = 'set_risk' then
    if p_risk_level is null
      or p_risk_level not in ('low', 'medium', 'high', 'critical')
      or p_review_status is not null
      or p_note is not null
    then
      raise exception 'Invalid risk-level action'
        using errcode = '22023';
    end if;
  elsif p_action = 'set_review' then
    if p_review_status is null
      or p_review_status not in ('no_review_required', 'pending', 'reviewed')
      or p_risk_level is not null
      or p_note is not null
    then
      raise exception 'Invalid review action'
        using errcode = '22023';
    end if;
  else
    if p_risk_level is not null or p_review_status is not null then
      raise exception 'Invalid note action'
        using errcode = '22023';
    end if;

    v_note := nullif(pg_catalog.btrim(p_note), '');
    if v_note is not null and pg_catalog.char_length(v_note) > 2000 then
      raise exception 'Invalid security note'
        using errcode = '22023';
    end if;
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_actor_id
      and role = 'owner'
      and status in ('active', 'warned')
  ) then
    raise exception 'Security owner required'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Security resident not found'
      using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from public.security_feature_flags
    where id = 1
      and security_center_enabled
      and security_event_collection_enabled
  ) then
    raise exception 'Security Center mutation is disabled'
      using errcode = '42501';
  end if;

  v_request_payload := pg_catalog.jsonb_build_object(
    'actor_id', p_actor_id,
    'user_id', p_user_id,
    'action', p_action,
    'risk_level', p_risk_level,
    'review_status', p_review_status,
    'note', v_note,
    'reason', v_reason
  );
  v_request_fingerprint := pg_catalog.encode(
    extensions.digest(v_request_payload::pg_catalog.text, 'sha256'),
    'hex'
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_request_id::pg_catalog.text, 0)
  );

  select event.*
  into v_existing_event
  from public.security_events as event
  where event.request_id = p_request_id;

  if found then
    if v_existing_event.actor_id is distinct from p_actor_id
      or v_existing_event.user_id is distinct from p_user_id
      or v_existing_event.request_fingerprint <> v_request_fingerprint
    then
      raise exception 'Security request id was already used for a different mutation'
        using errcode = '22023';
    end if;

    select risk.*
    into v_profile
    from public.security_risk_profiles as risk
    where risk.user_id = p_user_id;

    return pg_catalog.jsonb_build_object(
      'idempotent', true,
      'profile', pg_catalog.to_jsonb(v_profile),
      'event', pg_catalog.to_jsonb(v_existing_event)
    );
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::pg_catalog.text, 1)
  );

  insert into public.security_risk_profiles (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select risk.*
  into v_previous
  from public.security_risk_profiles as risk
  where risk.user_id = p_user_id
  for update;

  if p_action = 'set_risk' then
    update public.security_risk_profiles
    set risk_level = p_risk_level,
        last_event_at = v_now,
        updated_at = v_now
    where user_id = p_user_id
    returning * into v_profile;

    v_event_type := 'risk_level_changed';
    v_admin_action := 'security_set_risk';
  elsif p_action = 'set_review' then
    update public.security_risk_profiles
    set review_status = p_review_status,
        last_event_at = v_now,
        last_reviewed_at = case
          when p_review_status = 'reviewed' then v_now
          else null
        end,
        reviewed_by = case
          when p_review_status = 'reviewed' then p_actor_id
          else null
        end,
        updated_at = v_now
    where user_id = p_user_id
    returning * into v_profile;

    v_event_type := case
      when p_review_status = 'pending' then 'review_marked_pending'
      else 'review_marked_complete'
    end;
    v_admin_action := 'security_set_review';
  else
    update public.security_risk_profiles
    set notes = v_note,
        last_event_at = v_now,
        updated_at = v_now
    where user_id = p_user_id
    returning * into v_profile;

    v_event_type := 'internal_note_updated';
    v_admin_action := 'security_set_note';
  end if;

  v_metadata := pg_catalog.jsonb_build_object(
    'previous', pg_catalog.jsonb_build_object(
      'risk_level', v_previous.risk_level,
      'review_status', v_previous.review_status
    ),
    'new', pg_catalog.jsonb_build_object(
      'risk_level', v_profile.risk_level,
      'review_status', v_profile.review_status
    ),
    'note_changed', p_action = 'set_note'
  );

  insert into public.security_events (
    request_id,
    request_fingerprint,
    event_type,
    category,
    user_id,
    actor_id,
    reason,
    severity,
    source,
    metadata,
    occurred_at
  )
  values (
    p_request_id,
    v_request_fingerprint,
    v_event_type,
    'admin',
    p_user_id,
    p_actor_id,
    v_reason,
    v_profile.risk_level,
    'security_center_manual',
    v_metadata,
    v_now
  )
  returning * into v_event;

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
      'previous_risk_level', v_previous.risk_level,
      'new_risk_level', v_profile.risk_level,
      'previous_review_status', v_previous.review_status,
      'new_review_status', v_profile.review_status,
      'note_changed', p_action = 'set_note'
    )::pg_catalog.text
  );

  return pg_catalog.jsonb_build_object(
    'idempotent', false,
    'profile', pg_catalog.to_jsonb(v_profile),
    'event', pg_catalog.to_jsonb(v_event)
  );
end;
$$;

revoke all on function public.security_get_feature_flags()
from public, anon, authenticated;
revoke all on function public.security_admin_get_overview(uuid, integer, integer)
from public, anon, authenticated;
revoke all on function public.security_admin_get_resident(uuid, uuid, integer, integer)
from public, anon, authenticated;
revoke all on function public.security_owner_apply_risk_action(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  uuid
)
from public, anon, authenticated;

grant execute on function public.security_get_feature_flags()
to service_role;
grant execute on function public.security_admin_get_overview(uuid, integer, integer)
to service_role;
grant execute on function public.security_admin_get_resident(uuid, uuid, integer, integer)
to service_role;
grant execute on function public.security_owner_apply_risk_action(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  uuid
)
to service_role;

commit;
