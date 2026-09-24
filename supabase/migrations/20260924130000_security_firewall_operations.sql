begin;

alter table public.security_events
  drop constraint security_events_type_check;

alter table public.security_events
  add constraint security_events_type_check
  check (event_type in (
    'risk_level_changed',
    'review_marked_pending',
    'review_marked_complete',
    'internal_note_updated',
    'firewall_request_created',
    'firewall_request_confirmed',
    'firewall_request_resolved',
    'firewall_request_cancelled',
    'firewall_request_failed',
    'firewall_target_anonymized'
  ));

alter table public.security_events
  drop constraint security_events_source_check;

alter table public.security_events
  add constraint security_events_source_check
  check (source in ('security_center_manual', 'security_center_firewall'));

create table public.security_firewall_requests (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  request_fingerprint text not null,
  target_reference uuid not null default gen_random_uuid(),
  request_type text not null,
  status text not null default 'awaiting_external_publish',
  target_network inet,
  target_masked text,
  hostname_scope text,
  related_request_id uuid references public.security_firewall_requests(id),
  path_match_mode text,
  path_pattern text,
  http_method text,
  window_seconds integer,
  request_threshold integer,
  proposed_followup_action text,
  reason text not null,
  requested_by uuid not null,
  external_rule_id text,
  confirmed_by uuid,
  confirmed_at timestamptz,
  resolved_at timestamptz,
  anonymized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint security_firewall_requests_fingerprint_check
    check (
      char_length(request_fingerprint) = 64
      and request_fingerprint ~ '^[0-9a-f]{64}$'
    ),
  constraint security_firewall_requests_type_check
    check (request_type in (
      'block_ip',
      'block_cidr',
      'unblock',
      'rate_limit_observation'
    )),
  constraint security_firewall_requests_status_check
    check (status in (
      'awaiting_external_publish',
      'active',
      'resolved',
      'cancelled',
      'failed'
    )),
  constraint security_firewall_requests_hostname_check
    check (
      hostname_scope is null
      or hostname_scope in ('ourlittleage.com', 'www.ourlittleage.com')
    ),
  constraint security_firewall_requests_path_mode_check
    check (path_match_mode is null or path_match_mode in ('exact', 'prefix')),
  constraint security_firewall_requests_method_check
    check (
      http_method is null
      or http_method in ('GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS')
    ),
  constraint security_firewall_requests_window_check
    check (window_seconds is null or window_seconds between 10 and 3600),
  constraint security_firewall_requests_threshold_check
    check (request_threshold is null or request_threshold between 10 and 100000),
  constraint security_firewall_requests_followup_check
    check (
      proposed_followup_action is null
      or proposed_followup_action in ('rate_limit', 'challenge', 'deny')
    ),
  constraint security_firewall_requests_reason_check
    check (btrim(reason) <> '' and char_length(reason) <= 500),
  constraint security_firewall_requests_external_id_check
    check (
      external_rule_id is null
      or (
        char_length(external_rule_id) <= 200
        and external_rule_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
      )
    ),
  constraint security_firewall_requests_target_shape_check
    check (
      (
        request_type in ('block_ip', 'block_cidr')
        and (target_network is not null or anonymized_at is not null)
        and target_masked is not null
        and hostname_scope is not null
        and related_request_id is null
        and path_match_mode is null
        and path_pattern is null
        and http_method is null
        and window_seconds is null
        and request_threshold is null
        and proposed_followup_action is null
      )
      or (
        request_type = 'unblock'
        and (target_network is not null or anonymized_at is not null)
        and target_masked is not null
        and hostname_scope is not null
        and related_request_id is not null
        and path_match_mode is null
        and path_pattern is null
        and http_method is null
        and window_seconds is null
        and request_threshold is null
        and proposed_followup_action is null
      )
      or (
        request_type = 'rate_limit_observation'
        and target_network is null
        and target_masked is null
        and hostname_scope is null
        and related_request_id is null
        and path_match_mode is not null
        and path_pattern is not null
        and left(path_pattern, 1) = '/'
        and left(path_pattern, 2) <> '//'
        and position('?' in path_pattern) = 0
        and position('#' in path_pattern) = 0
        and char_length(path_pattern) <= 500
        and http_method is not null
        and window_seconds is not null
        and request_threshold is not null
        and proposed_followup_action is not null
      )
    ),
  constraint security_firewall_requests_block_target_check
    check (
      request_type not in ('block_ip', 'block_cidr')
      or target_network is null
      or (
        (request_type = 'block_ip' and (
          (family(target_network) = 4 and masklen(target_network) = 32)
          or (family(target_network) = 6 and masklen(target_network) = 128)
        ))
        or
        (request_type = 'block_cidr' and (
          (family(target_network) = 4 and masklen(target_network) between 24 and 31)
          or (family(target_network) = 6 and masklen(target_network) between 48 and 127)
        ))
      )
    ),
  constraint security_firewall_requests_lifecycle_check
    check (
      (
        status = 'awaiting_external_publish'
        and confirmed_at is null
        and resolved_at is null
      )
      or (
        status = 'active'
        and confirmed_at is not null
        and resolved_at is null
        and external_rule_id is not null
      )
      or (
        status in ('resolved', 'cancelled', 'failed')
        and resolved_at is not null
      )
    ),
  constraint security_firewall_requests_anonymized_check
    check (
      anonymized_at is null
      or (
        status in ('resolved', 'cancelled', 'failed')
        and target_network is null
      )
    )
);

create index security_firewall_requests_status_created_idx
on public.security_firewall_requests (status, created_at desc);

create index security_firewall_requests_actor_created_idx
on public.security_firewall_requests (requested_by, created_at desc);

create index security_firewall_requests_target_host_idx
on public.security_firewall_requests (target_network, hostname_scope)
where target_network is not null;

create index security_firewall_requests_related_idx
on public.security_firewall_requests (related_request_id)
where related_request_id is not null;

create index security_firewall_requests_retention_idx
on public.security_firewall_requests (resolved_at, id)
where status in ('resolved', 'cancelled', 'failed')
  and target_network is not null
  and anonymized_at is null;

alter table public.security_firewall_requests enable row level security;

revoke all on table public.security_firewall_requests
from public, anon, authenticated;

grant select on table public.security_firewall_requests to service_role;

create or replace function private.security_firewall_target_is_public(
  p_target inet
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_target is not null
    and not (
      p_target <<= '0.0.0.0/8'::pg_catalog.inet
      or p_target <<= '10.0.0.0/8'::pg_catalog.inet
      or p_target <<= '100.64.0.0/10'::pg_catalog.inet
      or p_target <<= '127.0.0.0/8'::pg_catalog.inet
      or p_target <<= '169.254.0.0/16'::pg_catalog.inet
      or p_target <<= '172.16.0.0/12'::pg_catalog.inet
      or p_target <<= '192.0.0.0/24'::pg_catalog.inet
      or p_target <<= '192.0.2.0/24'::pg_catalog.inet
      or p_target <<= '192.168.0.0/16'::pg_catalog.inet
      or p_target <<= '198.18.0.0/15'::pg_catalog.inet
      or p_target <<= '198.51.100.0/24'::pg_catalog.inet
      or p_target <<= '203.0.113.0/24'::pg_catalog.inet
      or p_target <<= '224.0.0.0/4'::pg_catalog.inet
      or p_target <<= '240.0.0.0/4'::pg_catalog.inet
      or p_target <<= '::/128'::pg_catalog.inet
      or p_target <<= '::1/128'::pg_catalog.inet
      or p_target <<= '::ffff:0:0/96'::pg_catalog.inet
      or p_target <<= 'fc00::/7'::pg_catalog.inet
      or p_target <<= 'fe80::/10'::pg_catalog.inet
      or p_target <<= 'ff00::/8'::pg_catalog.inet
      or p_target <<= '2001:db8::/32'::pg_catalog.inet
    );
$$;

create or replace function private.security_firewall_mask_target(
  p_target inet
)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_bytes bytea;
  v_first integer;
  v_second integer;
begin
  if pg_catalog.family(p_target) = 4 then
    return pg_catalog.split_part(pg_catalog.host(p_target), '.', 1)
      || '.' || pg_catalog.split_part(pg_catalog.host(p_target), '.', 2)
      || '.x.x/' || pg_catalog.masklen(p_target)::pg_catalog.text;
  end if;

  v_bytes := pg_catalog.inet_send(p_target);
  v_first := (pg_catalog.get_byte(v_bytes, 4) * 256)
    + pg_catalog.get_byte(v_bytes, 5);
  v_second := (pg_catalog.get_byte(v_bytes, 6) * 256)
    + pg_catalog.get_byte(v_bytes, 7);

  return pg_catalog.to_hex(v_first)
    || ':' || pg_catalog.to_hex(v_second)
    || ':x:x::/' || pg_catalog.masklen(p_target)::pg_catalog.text;
end;
$$;

create or replace function private.security_firewall_request_json(
  p_request public.security_firewall_requests,
  p_reveal_target boolean
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'id', p_request.id,
    'request_id', p_request.request_id,
    'target_reference', p_request.target_reference,
    'request_type', p_request.request_type,
    'status', p_request.status,
    'target_network', case
      when p_reveal_target and p_request.target_network is not null
        then pg_catalog.to_jsonb(p_request.target_network::pg_catalog.text)
      else 'null'::jsonb
    end,
    'target_masked', p_request.target_masked,
    'hostname_scope', p_request.hostname_scope,
    'related_request_id', p_request.related_request_id,
    'path_match_mode', p_request.path_match_mode,
    'path_pattern', p_request.path_pattern,
    'http_method', p_request.http_method,
    'window_seconds', p_request.window_seconds,
    'request_threshold', p_request.request_threshold,
    'proposed_followup_action', p_request.proposed_followup_action,
    'reason', p_request.reason,
    'requested_by', p_request.requested_by,
    'external_rule_id', p_request.external_rule_id,
    'confirmed_by', p_request.confirmed_by,
    'confirmed_at', p_request.confirmed_at,
    'resolved_at', p_request.resolved_at,
    'anonymized_at', p_request.anonymized_at,
    'created_at', p_request.created_at,
    'updated_at', p_request.updated_at
  );
$$;

revoke all on function private.security_firewall_target_is_public(inet)
from public, anon, authenticated;
revoke all on function private.security_firewall_mask_target(inet)
from public, anon, authenticated;
revoke all on function private.security_firewall_request_json(
  public.security_firewall_requests,
  boolean
)
from public, anon, authenticated;

create or replace function public.security_admin_get_firewall_requests(
  p_actor_id uuid,
  p_page integer default 1,
  p_page_size integer default 20,
  p_status text default 'all'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_total bigint;
  v_items jsonb;
begin
  if p_actor_id is null
    or p_page is null
    or p_page_size is null
    or p_page < 1
    or p_page > 1000000
    or p_page_size < 1
    or p_page_size > 100
    or p_status is null
    or p_status not in (
      'all',
      'awaiting_external_publish',
      'active',
      'resolved',
      'cancelled',
      'failed'
    )
  then
    raise exception 'Invalid Firewall request query'
      using errcode = '22023';
  end if;

  select profile.role
  into v_role
  from public.profiles as profile
  where profile.id = p_actor_id
    and profile.role in ('owner', 'admin')
    and profile.status in ('active', 'warned');

  if v_role is null then
    raise exception 'Security administrator required'
      using errcode = '42501';
  end if;

  select pg_catalog.count(*)
  into v_total
  from public.security_firewall_requests as request
  where p_status = 'all' or request.status = p_status;

  select coalesce(
    pg_catalog.jsonb_agg(
      private.security_firewall_request_json(
        request_row.request,
        v_role = 'owner'
      )
      order by request_row.created_at desc, request_row.id desc
    ),
    '[]'::jsonb
  )
  into v_items
  from (
    select request as request,
      request.created_at,
      request.id
    from public.security_firewall_requests as request
    where p_status = 'all' or request.status = p_status
    order by request.created_at desc, request.id desc
    limit p_page_size
    offset ((p_page - 1) * p_page_size)
  ) as request_row;

  return pg_catalog.jsonb_build_object(
    'items', v_items,
    'total', v_total,
    'page', p_page,
    'page_size', p_page_size
  );
end;
$$;

create or replace function public.security_owner_create_firewall_request(
  p_actor_id uuid,
  p_request_id uuid,
  p_request_type text,
  p_target text,
  p_hostname text,
  p_related_request_id uuid,
  p_path_match_mode text,
  p_path_pattern text,
  p_http_method text,
  p_window_seconds integer,
  p_request_threshold integer,
  p_proposed_followup_action text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_reason text := nullif(pg_catalog.btrim(p_reason), '');
  v_hostname text := nullif(pg_catalog.lower(pg_catalog.btrim(p_hostname)), '');
  v_path_pattern text := nullif(pg_catalog.btrim(p_path_pattern), '');
  v_method text := nullif(pg_catalog.upper(pg_catalog.btrim(p_http_method)), '');
  v_target pg_catalog.inet;
  v_target_masked text;
  v_target_reference uuid := extensions.gen_random_uuid();
  v_related public.security_firewall_requests%rowtype;
  v_payload jsonb;
  v_fingerprint text;
  v_existing public.security_firewall_requests%rowtype;
  v_request public.security_firewall_requests%rowtype;
begin
  if p_actor_id is null
    or p_request_id is null
    or p_request_type is null
    or p_request_type not in (
      'block_ip', 'block_cidr', 'unblock', 'rate_limit_observation'
    )
    or v_reason is null
    or pg_catalog.char_length(v_reason) > 500
  then
    raise exception 'Invalid Firewall request'
      using errcode = '22023';
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

  if p_request_type in ('block_ip', 'block_cidr') then
    if p_target is null
      or v_hostname not in ('ourlittleage.com', 'www.ourlittleage.com')
      or p_related_request_id is not null
      or p_path_match_mode is not null
      or p_path_pattern is not null
      or p_http_method is not null
      or p_window_seconds is not null
      or p_request_threshold is not null
      or p_proposed_followup_action is not null
    then
      raise exception 'Invalid Firewall block request'
        using errcode = '22023';
    end if;

    begin
      v_target := pg_catalog.network(p_target::pg_catalog.inet)::pg_catalog.inet;
    exception when invalid_text_representation then
      raise exception 'Invalid Firewall target'
        using errcode = '22023';
    end;

    if not private.security_firewall_target_is_public(v_target)
      or (
        p_request_type = 'block_ip'
        and not (
          (pg_catalog.family(v_target) = 4 and pg_catalog.masklen(v_target) = 32)
          or (pg_catalog.family(v_target) = 6 and pg_catalog.masklen(v_target) = 128)
        )
      )
      or (
        p_request_type = 'block_cidr'
        and not (
          (pg_catalog.family(v_target) = 4 and pg_catalog.masklen(v_target) between 24 and 31)
          or (pg_catalog.family(v_target) = 6 and pg_catalog.masklen(v_target) between 48 and 127)
        )
      )
    then
      raise exception 'Firewall target is not an allowed public range'
        using errcode = '22023';
    end if;

    v_target_masked := private.security_firewall_mask_target(v_target);
  elsif p_request_type = 'unblock' then
    if p_target is not null
      or p_hostname is not null
      or p_related_request_id is null
      or p_path_match_mode is not null
      or p_path_pattern is not null
      or p_http_method is not null
      or p_window_seconds is not null
      or p_request_threshold is not null
      or p_proposed_followup_action is not null
    then
      raise exception 'Invalid Firewall unblock request'
        using errcode = '22023';
    end if;

    select request.*
    into v_related
    from public.security_firewall_requests as request
    where request.id = p_related_request_id
    for update;

    if not found
      or v_related.request_type not in ('block_ip', 'block_cidr')
      or v_related.status <> 'active'
      or v_related.target_network is null
    then
      raise exception 'Active Firewall block request required'
        using errcode = '22023';
    end if;

    if exists (
      select 1
      from public.security_firewall_requests as request
      where request.related_request_id = p_related_request_id
        and request.request_type = 'unblock'
        and request.status = 'awaiting_external_publish'
    ) then
      raise exception 'An unblock request already exists'
        using errcode = '23505';
    end if;

    v_target := v_related.target_network;
    v_target_masked := v_related.target_masked;
    v_target_reference := v_related.target_reference;
    v_hostname := v_related.hostname_scope;
  else
    if p_target is not null
      or p_hostname is not null
      or p_related_request_id is not null
      or p_path_match_mode not in ('exact', 'prefix')
      or v_path_pattern is null
      or pg_catalog.left(v_path_pattern, 1) <> '/'
      or pg_catalog.left(v_path_pattern, 2) = '//'
      or pg_catalog.strpos(v_path_pattern, '?') > 0
      or pg_catalog.strpos(v_path_pattern, '#') > 0
      or pg_catalog.char_length(v_path_pattern) > 500
      or v_method not in ('GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS')
      or p_window_seconds is null
      or p_window_seconds not between 10 and 3600
      or p_request_threshold is null
      or p_request_threshold not between 10 and 100000
      or p_proposed_followup_action not in ('rate_limit', 'challenge', 'deny')
    then
      raise exception 'Invalid rate-limit observation request'
        using errcode = '22023';
    end if;
  end if;

  v_payload := pg_catalog.jsonb_build_object(
    'actor_id', p_actor_id,
    'request_type', p_request_type,
    'target', case when v_target is null then null else v_target::pg_catalog.text end,
    'hostname', v_hostname,
    'related_request_id', p_related_request_id,
    'path_match_mode', p_path_match_mode,
    'path_pattern', v_path_pattern,
    'http_method', v_method,
    'window_seconds', p_window_seconds,
    'request_threshold', p_request_threshold,
    'proposed_followup_action', p_proposed_followup_action,
    'reason', v_reason
  );
  v_fingerprint := pg_catalog.encode(
    extensions.digest(v_payload::pg_catalog.text, 'sha256'),
    'hex'
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_request_id::pg_catalog.text, 0)
  );

  select request.*
  into v_existing
  from public.security_firewall_requests as request
  where request.request_id = p_request_id;

  if found then
    if v_existing.requested_by is distinct from p_actor_id
      or v_existing.request_fingerprint <> v_fingerprint
    then
      raise exception 'Firewall request id was already used for a different request'
        using errcode = '22023';
    end if;

    return pg_catalog.jsonb_build_object(
      'idempotent', true,
      'request', private.security_firewall_request_json(v_existing, true)
    );
  end if;

  if p_request_type in ('block_ip', 'block_cidr') then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        v_target::pg_catalog.text || '|' || v_hostname,
        1
      )
    );

    if exists (
      select 1
      from public.security_firewall_requests as request
      where request.request_type in ('block_ip', 'block_cidr')
        and request.status in ('awaiting_external_publish', 'active')
        and request.target_network = v_target
        and request.hostname_scope = v_hostname
    ) then
      raise exception 'An active Firewall request already exists for this target'
        using errcode = '23505';
    end if;
  end if;

  insert into public.security_firewall_requests (
    request_id,
    request_fingerprint,
    target_reference,
    request_type,
    target_network,
    target_masked,
    hostname_scope,
    related_request_id,
    path_match_mode,
    path_pattern,
    http_method,
    window_seconds,
    request_threshold,
    proposed_followup_action,
    reason,
    requested_by
  )
  values (
    p_request_id,
    v_fingerprint,
    v_target_reference,
    p_request_type,
    v_target,
    v_target_masked,
    v_hostname,
    p_related_request_id,
    p_path_match_mode,
    v_path_pattern,
    v_method,
    p_window_seconds,
    p_request_threshold,
    p_proposed_followup_action,
    v_reason,
    p_actor_id
  )
  returning * into v_request;

  insert into public.security_events (
    request_id,
    request_fingerprint,
    event_type,
    category,
    actor_id,
    reason,
    severity,
    source,
    metadata,
    occurred_at
  )
  values (
    p_request_id,
    v_fingerprint,
    'firewall_request_created',
    'admin',
    p_actor_id,
    v_reason,
    'medium',
    'security_center_firewall',
    pg_catalog.jsonb_build_object(
      'firewall_request_id', v_request.id,
      'target_reference', v_request.target_reference,
      'target_masked', v_request.target_masked,
      'request_type', v_request.request_type,
      'status', v_request.status,
      'hostname_scope', v_request.hostname_scope
    ),
    v_now
  );

  insert into public.admin_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details
  )
  values (
    p_actor_id,
    'security_firewall_request_created',
    'security_firewall_request',
    v_request.id::pg_catalog.text,
    pg_catalog.jsonb_build_object(
      'request_id', p_request_id,
      'target_reference', v_request.target_reference,
      'target_masked', v_request.target_masked,
      'request_type', v_request.request_type,
      'hostname_scope', v_request.hostname_scope
    )::pg_catalog.text
  );

  return pg_catalog.jsonb_build_object(
    'idempotent', false,
    'request', private.security_firewall_request_json(v_request, true)
  );
end;
$$;

create or replace function public.security_owner_transition_firewall_request(
  p_actor_id uuid,
  p_firewall_request_id uuid,
  p_request_id uuid,
  p_action text,
  p_external_rule_id text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_reason text := nullif(pg_catalog.btrim(p_reason), '');
  v_external_rule_id text := nullif(pg_catalog.btrim(p_external_rule_id), '');
  v_payload jsonb;
  v_fingerprint text;
  v_existing_event public.security_events%rowtype;
  v_request public.security_firewall_requests%rowtype;
  v_related public.security_firewall_requests%rowtype;
  v_event_type text;
  v_status text;
begin
  if p_actor_id is null
    or p_firewall_request_id is null
    or p_request_id is null
    or p_action not in (
      'confirm_external', 'cancel', 'mark_failed', 'complete_observation'
    )
    or v_reason is null
    or pg_catalog.char_length(v_reason) > 500
  then
    raise exception 'Invalid Firewall transition request'
      using errcode = '22023';
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

  if p_action = 'confirm_external' then
    if v_external_rule_id is null
      or pg_catalog.char_length(v_external_rule_id) > 200
      or v_external_rule_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
    then
      raise exception 'Valid external rule id required'
        using errcode = '22023';
    end if;
  elsif p_external_rule_id is not null then
    raise exception 'External rule id is not valid for this transition'
      using errcode = '22023';
  end if;

  v_payload := pg_catalog.jsonb_build_object(
    'actor_id', p_actor_id,
    'firewall_request_id', p_firewall_request_id,
    'action', p_action,
    'external_rule_id', v_external_rule_id,
    'reason', v_reason
  );
  v_fingerprint := pg_catalog.encode(
    extensions.digest(v_payload::pg_catalog.text, 'sha256'),
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
      or v_existing_event.request_fingerprint <> v_fingerprint
    then
      raise exception 'Firewall transition request id was already used'
        using errcode = '22023';
    end if;

    select request.*
    into v_request
    from public.security_firewall_requests as request
    where request.id = p_firewall_request_id;

    return pg_catalog.jsonb_build_object(
      'idempotent', true,
      'request', private.security_firewall_request_json(v_request, true)
    );
  end if;

  select request.*
  into v_request
  from public.security_firewall_requests as request
  where request.id = p_firewall_request_id
  for update;

  if not found then
    raise exception 'Firewall request not found'
      using errcode = 'P0002';
  end if;

  if p_action = 'confirm_external' then
    if v_request.status <> 'awaiting_external_publish' then
      raise exception 'Firewall request is not awaiting external publish'
        using errcode = '22023';
    end if;

    if v_request.request_type = 'unblock' then
      select request.*
      into v_related
      from public.security_firewall_requests as request
      where request.id = v_request.related_request_id
      for update;

      if not found or v_related.status <> 'active' then
        raise exception 'Linked Firewall block is not active'
          using errcode = '22023';
      end if;

      update public.security_firewall_requests
      set status = 'resolved',
          external_rule_id = v_external_rule_id,
          confirmed_by = p_actor_id,
          confirmed_at = v_now,
          resolved_at = v_now,
          updated_at = v_now
      where id = v_request.id
      returning * into v_request;

      update public.security_firewall_requests
      set status = 'resolved',
          resolved_at = v_now,
          updated_at = v_now
      where id = v_related.id;

      v_event_type := 'firewall_request_resolved';
    else
      update public.security_firewall_requests
      set status = 'active',
          external_rule_id = v_external_rule_id,
          confirmed_by = p_actor_id,
          confirmed_at = v_now,
          updated_at = v_now
      where id = v_request.id
      returning * into v_request;

      v_event_type := 'firewall_request_confirmed';
    end if;
  elsif p_action = 'cancel' then
    if v_request.status <> 'awaiting_external_publish' then
      raise exception 'Only an awaiting Firewall request can be cancelled'
        using errcode = '22023';
    end if;

    update public.security_firewall_requests
    set status = 'cancelled',
        resolved_at = v_now,
        updated_at = v_now
    where id = v_request.id
    returning * into v_request;

    v_event_type := 'firewall_request_cancelled';
  elsif p_action = 'mark_failed' then
    if v_request.status <> 'awaiting_external_publish' then
      raise exception 'Only an awaiting Firewall request can fail'
        using errcode = '22023';
    end if;

    update public.security_firewall_requests
    set status = 'failed',
        resolved_at = v_now,
        updated_at = v_now
    where id = v_request.id
    returning * into v_request;

    v_event_type := 'firewall_request_failed';
  else
    if v_request.request_type <> 'rate_limit_observation'
      or v_request.status <> 'active'
    then
      raise exception 'Only an active observation can be completed'
        using errcode = '22023';
    end if;

    update public.security_firewall_requests
    set status = 'resolved',
        resolved_at = v_now,
        updated_at = v_now
    where id = v_request.id
    returning * into v_request;

    v_event_type := 'firewall_request_resolved';
  end if;

  v_status := v_request.status;

  insert into public.security_events (
    request_id,
    request_fingerprint,
    event_type,
    category,
    actor_id,
    reason,
    severity,
    source,
    metadata,
    occurred_at
  )
  values (
    p_request_id,
    v_fingerprint,
    v_event_type,
    'admin',
    p_actor_id,
    v_reason,
    'medium',
    'security_center_firewall',
    pg_catalog.jsonb_build_object(
      'firewall_request_id', v_request.id,
      'target_reference', v_request.target_reference,
      'target_masked', v_request.target_masked,
      'request_type', v_request.request_type,
      'status', v_status,
      'hostname_scope', v_request.hostname_scope,
      'external_rule_id', v_request.external_rule_id,
      'related_request_id', v_request.related_request_id
    ),
    v_now
  );

  insert into public.admin_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details
  )
  values (
    p_actor_id,
    'security_firewall_request_' || p_action,
    'security_firewall_request',
    v_request.id::pg_catalog.text,
    pg_catalog.jsonb_build_object(
      'request_id', p_request_id,
      'target_reference', v_request.target_reference,
      'target_masked', v_request.target_masked,
      'request_type', v_request.request_type,
      'status', v_status,
      'external_rule_id', v_request.external_rule_id,
      'related_request_id', v_request.related_request_id
    )::pg_catalog.text
  );

  return pg_catalog.jsonb_build_object(
    'idempotent', false,
    'request', private.security_firewall_request_json(v_request, true)
  );
end;
$$;

create or replace function public.security_cleanup_firewall_targets(
  p_limit integer default 100
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_request public.security_firewall_requests%rowtype;
  v_event_request_id uuid;
  v_fingerprint text;
  v_count integer := 0;
begin
  if p_limit is null or p_limit < 1 or p_limit > 1000 then
    raise exception 'Invalid Firewall cleanup limit'
      using errcode = '22023';
  end if;

  for v_request in
    with due as (
      select request.id
      from public.security_firewall_requests as request
      where request.status in ('resolved', 'cancelled', 'failed')
        and request.resolved_at <= v_now - interval '90 days'
        and request.target_network is not null
        and request.anonymized_at is null
      order by request.resolved_at, request.id
      limit p_limit
      for update skip locked
    )
    update public.security_firewall_requests as request
    set target_network = null,
        anonymized_at = v_now,
        updated_at = v_now
    from due
    where request.id = due.id
    returning request.*
  loop
    v_event_request_id := extensions.gen_random_uuid();
    v_fingerprint := pg_catalog.encode(
      extensions.digest(
        pg_catalog.jsonb_build_object(
          'firewall_request_id', v_request.id,
          'anonymized_at', v_now
        )::pg_catalog.text,
        'sha256'
      ),
      'hex'
    );

    insert into public.security_events (
      request_id,
      request_fingerprint,
      event_type,
      category,
      reason,
      severity,
      source,
      metadata,
      occurred_at
    )
    values (
      v_event_request_id,
      v_fingerprint,
      'firewall_target_anonymized',
      'system',
      'Firewall target retention period completed',
      'low',
      'security_center_firewall',
      pg_catalog.jsonb_build_object(
        'firewall_request_id', v_request.id,
        'target_reference', v_request.target_reference,
        'target_masked', v_request.target_masked,
        'request_type', v_request.request_type,
        'status', v_request.status,
        'hostname_scope', v_request.hostname_scope
      ),
      v_now
    );

    insert into public.admin_logs (
      admin_id,
      action,
      target_type,
      target_id,
      details
    )
    values (
      null,
      'security_firewall_target_anonymized',
      'security_firewall_request',
      v_request.id::pg_catalog.text,
      pg_catalog.jsonb_build_object(
        'event_request_id', v_event_request_id,
        'target_reference', v_request.target_reference,
        'target_masked', v_request.target_masked,
        'request_type', v_request.request_type,
        'status', v_request.status
      )::pg_catalog.text
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.security_admin_get_firewall_requests(
  uuid,
  integer,
  integer,
  text
)
from public, anon, authenticated;
revoke all on function public.security_owner_create_firewall_request(
  uuid,
  uuid,
  text,
  text,
  text,
  uuid,
  text,
  text,
  text,
  integer,
  integer,
  text,
  text
)
from public, anon, authenticated;
revoke all on function public.security_owner_transition_firewall_request(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text
)
from public, anon, authenticated;
revoke all on function public.security_cleanup_firewall_targets(integer)
from public, anon, authenticated;

grant execute on function public.security_admin_get_firewall_requests(
  uuid,
  integer,
  integer,
  text
)
to service_role;
grant execute on function public.security_owner_create_firewall_request(
  uuid,
  uuid,
  text,
  text,
  text,
  uuid,
  text,
  text,
  text,
  integer,
  integer,
  text,
  text
)
to service_role;
grant execute on function public.security_owner_transition_firewall_request(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text
)
to service_role;
grant execute on function public.security_cleanup_firewall_targets(integer)
to service_role;

commit;
