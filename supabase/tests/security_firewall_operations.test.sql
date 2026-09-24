begin;

create schema security_firewall_test;

create or replace function security_firewall_test.assert_true(
  condition boolean,
  message text
)
returns void
language plpgsql
as $$
begin
  if not coalesce(condition, false) then
    raise exception 'ASSERTION FAILED: %', message;
  end if;
end;
$$;

grant usage on schema security_firewall_test to service_role;
grant execute on function security_firewall_test.assert_true(boolean, text)
to service_role;

select security_firewall_test.assert_true(
  to_regclass('public.security_firewall_requests') is not null,
  'Firewall request table exists'
);

select security_firewall_test.assert_true(
  (select relrowsecurity
   from pg_class
   where oid = 'public.security_firewall_requests'::regclass),
  'Firewall request table has RLS enabled'
);

select security_firewall_test.assert_true(
  not has_table_privilege(
    'authenticated', 'public.security_firewall_requests', 'select'
  )
  and not has_table_privilege(
    'anon', 'public.security_firewall_requests', 'select'
  ),
  'Browser roles cannot read Firewall requests directly'
);

select security_firewall_test.assert_true(
  not has_function_privilege(
    'authenticated',
    'public.security_admin_get_firewall_requests(uuid,integer,integer,text)',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'public.security_owner_create_firewall_request(uuid,uuid,text,text,text,uuid,text,text,text,integer,integer,text,text)',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'public.security_owner_transition_firewall_request(uuid,uuid,uuid,text,text,text)',
    'execute'
  ),
  'Browser roles cannot execute Firewall RPCs directly'
);

insert into auth.users (id, email) values
  ('50000000-0000-4000-8000-000000000001', 'firewall-owner@example.test'),
  ('50000000-0000-4000-8000-000000000002', 'firewall-admin@example.test'),
  ('50000000-0000-4000-8000-000000000003', 'firewall-moderator@example.test'),
  ('50000000-0000-4000-8000-000000000004', 'firewall-resident@example.test'),
  ('50000000-0000-4000-8000-000000000005', 'firewall-muted-owner@example.test'),
  ('50000000-0000-4000-8000-000000000006', 'firewall-banned-owner@example.test');

insert into public.profiles (id, username, role, status) values
  ('50000000-0000-4000-8000-000000000001', 'firewall-owner', 'owner', 'active'),
  ('50000000-0000-4000-8000-000000000002', 'firewall-admin', 'admin', 'warned'),
  ('50000000-0000-4000-8000-000000000003', 'firewall-moderator', 'moderator', 'active'),
  ('50000000-0000-4000-8000-000000000004', 'firewall-resident', 'user', 'active'),
  ('50000000-0000-4000-8000-000000000005', 'firewall-muted-owner', 'owner', 'muted'),
  ('50000000-0000-4000-8000-000000000006', 'firewall-banned-owner', 'owner', 'banned');

set role service_role;

do $$
begin
  begin
    perform public.security_admin_get_firewall_requests(
      '50000000-0000-4000-8000-000000000003', 1, 20, 'all'
    );
    raise exception 'ASSERTION FAILED: moderator read should be denied';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.security_owner_create_firewall_request(
      '50000000-0000-4000-8000-000000000002',
      '51000000-0000-4000-8000-000000000001',
      'block_ip', '8.8.8.8/32', 'www.ourlittleage.com', null,
      null, null, null, null, null, null, 'Admin cannot mutate'
    );
    raise exception 'ASSERTION FAILED: admin mutation should be denied';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.security_owner_create_firewall_request(
      '50000000-0000-4000-8000-000000000005',
      '51000000-0000-4000-8000-000000000002',
      'block_ip', '8.8.4.4/32', 'www.ourlittleage.com', null,
      null, null, null, null, null, null, 'Muted Owner cannot mutate'
    );
    raise exception 'ASSERTION FAILED: muted Owner mutation should be denied';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.security_owner_create_firewall_request(
      '50000000-0000-4000-8000-000000000006',
      '51000000-0000-4000-8000-000000000003',
      'block_ip', '8.8.4.4/32', 'www.ourlittleage.com', null,
      null, null, null, null, null, null, 'Banned Owner cannot mutate'
    );
    raise exception 'ASSERTION FAILED: banned Owner mutation should be denied';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.security_admin_get_firewall_requests(
      '50000000-0000-4000-8000-000000000004', 1, 20, 'all'
    );
    raise exception 'ASSERTION FAILED: resident read should be denied';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

select public.security_owner_create_firewall_request(
  '50000000-0000-4000-8000-000000000001',
  '51000000-0000-4000-8000-000000000010',
  'block_ip', '8.8.8.8/32', 'www.ourlittleage.com', null,
  null, null, null, null, null, null, 'Block repeated abusive traffic'
);

select security_firewall_test.assert_true(
  (select count(*)
   from public.security_firewall_requests
   where request_id = '51000000-0000-4000-8000-000000000010') = 1,
  'Owner creates one Firewall request'
);

select security_firewall_test.assert_true(
  (select request_type = 'block_ip'
     and status = 'awaiting_external_publish'
     and target_network = '8.8.8.8/32'::inet
     and target_masked = '8.8.x.x/32'
   from public.security_firewall_requests
   where request_id = '51000000-0000-4000-8000-000000000010'),
  'Block request stores normalized protected and masked targets'
);

select security_firewall_test.assert_true(
  (select count(*)
   from public.security_events
   where request_id = '51000000-0000-4000-8000-000000000010'
     and event_type = 'firewall_request_created'
     and source = 'security_center_firewall'
     and reason = 'firewall_request_created'
     and metadata ? 'target_reference'
     and not metadata ? 'target_masked'
     and not metadata ? 'target_network') = 1
  and
  (select count(*)
   from public.admin_logs
   where action = 'security_firewall_request_created'
     and target_type = 'security_firewall_request'
     and not details::jsonb ? 'target_masked') = 1,
  'Create atomically writes safe immutable audit records'
);

select security_firewall_test.assert_true(
  (public.security_owner_create_firewall_request(
    '50000000-0000-4000-8000-000000000001',
    '51000000-0000-4000-8000-000000000010',
    'block_ip', '8.8.8.8/32', 'www.ourlittleage.com', null,
    null, null, null, null, null, null, 'Block repeated abusive traffic'
  ) ->> 'idempotent')::boolean,
  'Identical create retry is idempotent'
);

do $$
begin
  begin
    perform public.security_owner_create_firewall_request(
      '50000000-0000-4000-8000-000000000001',
      '51000000-0000-4000-8000-000000000010',
      'block_ip', '8.8.4.4/32', 'www.ourlittleage.com', null,
      null, null, null, null, null, null, 'Changed request reuse'
    );
    raise exception 'ASSERTION FAILED: changed request-ID reuse should fail';
  exception when invalid_parameter_value then
    null;
  end;

  begin
    perform public.security_owner_create_firewall_request(
      '50000000-0000-4000-8000-000000000001',
      '51000000-0000-4000-8000-000000000011',
      'block_ip', '8.8.8.8/32', 'www.ourlittleage.com', null,
      null, null, null, null, null, null, 'Duplicate target'
    );
    raise exception 'ASSERTION FAILED: duplicate active target should fail';
  exception when unique_violation then
    null;
  end;

  begin
    perform public.security_owner_create_firewall_request(
      '50000000-0000-4000-8000-000000000001',
      '51000000-0000-4000-8000-000000000012',
      'block_ip', '10.0.0.1/32', 'www.ourlittleage.com', null,
      null, null, null, null, null, null, 'Private target'
    );
    raise exception 'ASSERTION FAILED: private target should fail';
  exception when invalid_parameter_value then
    null;
  end;

  begin
    perform public.security_owner_create_firewall_request(
      '50000000-0000-4000-8000-000000000001',
      '51000000-0000-4000-8000-000000000013',
      'block_cidr', '1.1.0.0/16', 'www.ourlittleage.com', null,
      null, null, null, null, null, null, 'Range too broad'
    );
    raise exception 'ASSERTION FAILED: broad CIDR should fail';
  exception when invalid_parameter_value then
    null;
  end;

  begin
    perform public.security_owner_create_firewall_request(
      '50000000-0000-4000-8000-000000000001',
      '51000000-0000-4000-8000-000000000014',
      'block_ip', 'not-an-address', 'www.ourlittleage.com', null,
      null, null, null, null, null, null, 'Malformed target'
    );
    raise exception 'ASSERTION FAILED: malformed target should fail';
  exception when invalid_parameter_value then
    null;
  end;

  begin
    perform public.security_owner_create_firewall_request(
      '50000000-0000-4000-8000-000000000001',
      '51000000-0000-4000-8000-000000000015',
      'block_ip', '8.8.4.4/32', 'preview.vercel.app', null,
      null, null, null, null, null, null, 'Unapproved hostname'
    );
    raise exception 'ASSERTION FAILED: unapproved hostname should fail';
  exception when invalid_parameter_value then
    null;
  end;

  begin
    perform public.security_owner_create_firewall_request(
      '50000000-0000-4000-8000-000000000001',
      '51000000-0000-4000-8000-000000000016',
      'block_cidr', '2606:4700::/32', 'www.ourlittleage.com', null,
      null, null, null, null, null, null, 'IPv6 range too broad'
    );
    raise exception 'ASSERTION FAILED: broad IPv6 CIDR should fail';
  exception when invalid_parameter_value then
    null;
  end;

  begin
    perform public.security_owner_create_firewall_request(
      '50000000-0000-4000-8000-000000000001',
      '51000000-0000-4000-8000-000000000017',
      'rate_limit_observation', null, null, null,
      'prefix', '//api/auth', 'POST', 60, 500, 'rate_limit',
      'Invalid observation path'
    );
    raise exception 'ASSERTION FAILED: invalid observation path should fail';
  exception when invalid_parameter_value then
    null;
  end;
end;
$$;

select security_firewall_test.assert_true(
  (public.security_admin_get_firewall_requests(
    '50000000-0000-4000-8000-000000000001', 1, 20, 'all'
  ) -> 'items' -> 0 ->> 'target_network') = '8.8.8.8/32',
  'Owner reads the retained full target'
);

select security_firewall_test.assert_true(
  (public.security_admin_get_firewall_requests(
    '50000000-0000-4000-8000-000000000002', 1, 20, 'all'
  ) -> 'items' -> 0 -> 'target_network') = 'null'::jsonb
  and
  (public.security_admin_get_firewall_requests(
    '50000000-0000-4000-8000-000000000002', 1, 20, 'all'
  ) -> 'items' -> 0 ->> 'target_masked') = '8.8.x.x/32',
  'Admin reads only the masked target'
);

select public.security_owner_create_firewall_request(
  '50000000-0000-4000-8000-000000000001',
  '51000000-0000-4000-8000-000000000018',
  'block_cidr', '1.1.1.0/24', 'ourlittleage.com', null,
  null, null, null, null, null, null, 'Validate an IPv4 CIDR request'
);

select public.security_owner_transition_firewall_request(
  '50000000-0000-4000-8000-000000000001',
  (select id from public.security_firewall_requests
   where request_id = '51000000-0000-4000-8000-000000000018'),
  '51000000-0000-4000-8000-000000000019',
  'cancel', null, 'Cancel the IPv4 CIDR fixture'
);

select public.security_owner_create_firewall_request(
  '50000000-0000-4000-8000-000000000001',
  '51000000-0000-4000-8000-00000000001a',
  'block_cidr', '2606:4700:4700::/48', 'ourlittleage.com', null,
  null, null, null, null, null, null, 'Validate an IPv6 CIDR request'
);

select security_firewall_test.assert_true(
  (select family(target_network) = 6
     and masklen(target_network) = 48
     and target_masked like '2606:4700:x:x::/48'
   from public.security_firewall_requests
   where request_id = '51000000-0000-4000-8000-00000000001a'),
  'IPv6 CIDR is normalized and masked safely'
);

select public.security_owner_transition_firewall_request(
  '50000000-0000-4000-8000-000000000001',
  (select id from public.security_firewall_requests
   where request_id = '51000000-0000-4000-8000-00000000001a'),
  '51000000-0000-4000-8000-00000000001b',
  'mark_failed', null, 'Close the IPv6 CIDR fixture'
);

select public.security_owner_transition_firewall_request(
  '50000000-0000-4000-8000-000000000001',
  (select id from public.security_firewall_requests
   where request_id = '51000000-0000-4000-8000-000000000010'),
  '51000000-0000-4000-8000-000000000020',
  'confirm_external', 'ip_rule_123', 'Published manually in Vercel'
);

select security_firewall_test.assert_true(
  (select status = 'active'
     and external_rule_id = 'ip_rule_123'
     and confirmed_at is not null
   from public.security_firewall_requests
   where request_id = '51000000-0000-4000-8000-000000000010'),
  'External confirmation activates the block'
);

do $$
begin
  begin
    perform public.security_owner_transition_firewall_request(
      '50000000-0000-4000-8000-000000000001',
      (select id from public.security_firewall_requests
       where request_id = '51000000-0000-4000-8000-000000000010'),
      '51000000-0000-4000-8000-000000000021',
      'cancel', null, 'Active blocks cannot be cancelled'
    );
    raise exception 'ASSERTION FAILED: active block cancellation should fail';
  exception when invalid_parameter_value then
    null;
  end;
end;
$$;

select public.security_owner_create_firewall_request(
  '50000000-0000-4000-8000-000000000001',
  '51000000-0000-4000-8000-000000000030',
  'unblock', null, null,
  (select id from public.security_firewall_requests
   where request_id = '51000000-0000-4000-8000-000000000010'),
  null, null, null, null, null, null, 'Remove the Vercel block'
);

select security_firewall_test.assert_true(
  (select target_network = '8.8.8.8/32'::inet
     and target_reference = (
       select target_reference
       from public.security_firewall_requests
       where request_id = '51000000-0000-4000-8000-000000000010'
     )
   from public.security_firewall_requests
   where request_id = '51000000-0000-4000-8000-000000000030'),
  'Unblock derives its target and opaque reference from the active block'
);

select public.security_owner_transition_firewall_request(
  '50000000-0000-4000-8000-000000000001',
  (select id from public.security_firewall_requests
   where request_id = '51000000-0000-4000-8000-000000000030'),
  '51000000-0000-4000-8000-000000000031',
  'confirm_external', 'ip_rule_123', 'Removal confirmed in Vercel'
);

select security_firewall_test.assert_true(
  (select bool_and(status = 'resolved')
   from public.security_firewall_requests
   where request_id in (
     '51000000-0000-4000-8000-000000000010',
     '51000000-0000-4000-8000-000000000030'
   )),
  'Confirming unblock resolves both linked records'
);

select public.security_owner_create_firewall_request(
  '50000000-0000-4000-8000-000000000001',
  '51000000-0000-4000-8000-000000000032',
  'block_ip', '8.8.8.8/32', 'www.ourlittleage.com', null,
  null, null, null, null, null, null, 'Second historical request for same target'
);

select public.security_owner_transition_firewall_request(
  '50000000-0000-4000-8000-000000000001',
  (select id from public.security_firewall_requests
   where request_id = '51000000-0000-4000-8000-000000000032'),
  '51000000-0000-4000-8000-000000000033',
  'confirm_external', 'ip_rule_456', 'Second external publish'
);

select public.security_owner_create_firewall_request(
  '50000000-0000-4000-8000-000000000001',
  '51000000-0000-4000-8000-000000000034',
  'unblock', null, null,
  (select id from public.security_firewall_requests
   where request_id = '51000000-0000-4000-8000-000000000032'),
  null, null, null, null, null, null, 'End second historical request'
);

select public.security_owner_transition_firewall_request(
  '50000000-0000-4000-8000-000000000001',
  (select id from public.security_firewall_requests
   where request_id = '51000000-0000-4000-8000-000000000034'),
  '51000000-0000-4000-8000-000000000035',
  'confirm_external', 'ip_rule_456', 'Second external removal'
);

select security_firewall_test.assert_true(
  (select count(distinct target_reference) = 2
   from public.security_firewall_requests
   where request_id in (
     '51000000-0000-4000-8000-000000000010',
     '51000000-0000-4000-8000-000000000032'
   )),
  'Separate same-target histories use unrelated opaque references'
);

select public.security_owner_create_firewall_request(
  '50000000-0000-4000-8000-000000000001',
  '51000000-0000-4000-8000-000000000040',
  'rate_limit_observation', null, null, null,
  'prefix', '/api/auth', 'POST', 60, 500, 'rate_limit',
  'Observe repeated authentication requests'
);

select public.security_owner_transition_firewall_request(
  '50000000-0000-4000-8000-000000000001',
  (select id from public.security_firewall_requests
   where request_id = '51000000-0000-4000-8000-000000000040'),
  '51000000-0000-4000-8000-000000000041',
  'confirm_external', 'rule_auth_log', 'Log rule published manually'
);

select public.security_owner_transition_firewall_request(
  '50000000-0000-4000-8000-000000000001',
  (select id from public.security_firewall_requests
   where request_id = '51000000-0000-4000-8000-000000000040'),
  '51000000-0000-4000-8000-000000000042',
  'complete_observation', null, 'Observation window completed'
);

select security_firewall_test.assert_true(
  (select status = 'resolved' and resolved_at is not null
   from public.security_firewall_requests
   where request_id = '51000000-0000-4000-8000-000000000040'),
  'Rate-limit observation follows the approved lifecycle'
);

select public.security_owner_create_firewall_request(
  '50000000-0000-4000-8000-000000000001',
  '51000000-0000-4000-8000-000000000050',
  'block_ip', '4.4.4.4/32', 'www.ourlittleage.com', null,
  null, null, null, null, null, null, 'Keep one active fixture'
);

select public.security_owner_transition_firewall_request(
  '50000000-0000-4000-8000-000000000001',
  (select id from public.security_firewall_requests
   where request_id = '51000000-0000-4000-8000-000000000050'),
  '51000000-0000-4000-8000-000000000051',
  'confirm_external', 'ip_rule_active', 'Activate retention fixture'
);

select public.security_owner_create_firewall_request(
  '50000000-0000-4000-8000-000000000001',
  '51000000-0000-4000-8000-000000000052',
  'block_ip', '4.4.8.8/32', 'www.ourlittleage.com', null,
  null, null, null, null, null, null, 'Keep one awaiting fixture'
);

reset role;

create or replace function security_firewall_test.reject_admin_log_fixture()
returns trigger
language plpgsql
as $$
begin
  if new.action = 'security_firewall_request_created'
    and new.details::jsonb ->> 'request_id'
      = '51000000-0000-4000-8000-000000000060'
  then
    raise exception 'Forced admin log failure'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger security_firewall_reject_admin_log_fixture
before insert on public.admin_logs
for each row execute function security_firewall_test.reject_admin_log_fixture();

set role service_role;

do $$
begin
  begin
    perform public.security_owner_create_firewall_request(
      '50000000-0000-4000-8000-000000000001',
      '51000000-0000-4000-8000-000000000060',
      'block_ip', '9.9.9.9/32', 'www.ourlittleage.com', null,
      null, null, null, null, null, null, 'Force atomic rollback'
    );
    raise exception 'ASSERTION FAILED: forced audit failure should abort create';
  exception when check_violation then
    null;
  end;
end;
$$;

select security_firewall_test.assert_true(
  not exists (
    select 1 from public.security_firewall_requests
    where request_id = '51000000-0000-4000-8000-000000000060'
  )
  and not exists (
    select 1 from public.security_events
    where request_id = '51000000-0000-4000-8000-000000000060'
  ),
  'Audit failure rolls back the Firewall request and event'
);

reset role;
drop trigger security_firewall_reject_admin_log_fixture on public.admin_logs;
drop function security_firewall_test.reject_admin_log_fixture();
set role service_role;

reset role;

update public.security_firewall_requests
set resolved_at = clock_timestamp() - interval '89 days'
where request_id = '51000000-0000-4000-8000-000000000018';

set role service_role;

select security_firewall_test.assert_true(
  public.security_cleanup_firewall_targets(100) = 0,
  'Ended records younger than 90 days are retained'
);

select security_firewall_test.assert_true(
  (select target_network = '1.1.1.0/24'::inet
     and target_masked = '1.1.x.x/24'
     and request_fingerprint is not null
     and reason = 'Validate an IPv4 CIDR request'
   from public.security_firewall_requests
   where request_id = '51000000-0000-4000-8000-000000000018'),
  'Target-derived operational data remains available before 90 days'
);

reset role;

update public.security_firewall_requests
set resolved_at = clock_timestamp() - interval '90 days'
where request_id in (
  '51000000-0000-4000-8000-000000000010',
  '51000000-0000-4000-8000-000000000030',
  '51000000-0000-4000-8000-000000000032',
  '51000000-0000-4000-8000-000000000034'
);

set role service_role;

select security_firewall_test.assert_true(
  public.security_cleanup_firewall_targets(100) = 4,
  'Ended records at the retention boundary are anonymized'
);

select security_firewall_test.assert_true(
  (select bool_and(
     target_network is null
     and anonymized_at is not null
     and target_masked is null
     and request_fingerprint is null
     and reason = 'retention_period_completed'
     and external_rule_id is null
   )
   from public.security_firewall_requests
   where request_id in (
     '51000000-0000-4000-8000-000000000010',
     '51000000-0000-4000-8000-000000000030',
     '51000000-0000-4000-8000-000000000032',
     '51000000-0000-4000-8000-000000000034'
   )),
  'Retention removes every request-table target-derived value'
);

select security_firewall_test.assert_true(
  not exists (
    select 1
    from public.security_events as event
    where event.metadata ->> 'firewall_request_id' in (
      select id::text
      from public.security_firewall_requests
      where request_id in (
        '51000000-0000-4000-8000-000000000010',
        '51000000-0000-4000-8000-000000000030',
        '51000000-0000-4000-8000-000000000032',
        '51000000-0000-4000-8000-000000000034'
      )
    )
    and (
      event.metadata ? 'target_masked'
      or event.metadata ? 'target_network'
      or event.reason like '%8.8.8.8%'
      or event.reason like '%8.8.x.x%'
    )
  )
  and not exists (
    select 1
    from public.admin_logs as log
    where log.target_id in (
      select id::text
      from public.security_firewall_requests
      where request_id in (
        '51000000-0000-4000-8000-000000000010',
        '51000000-0000-4000-8000-000000000030',
        '51000000-0000-4000-8000-000000000032',
        '51000000-0000-4000-8000-000000000034'
      )
    )
    and (
      log.details like '%8.8.8.8%'
      or log.details like '%8.8.x.x%'
    )
  ),
  'Permanent event and admin audit contain no target-derived values'
);

reset role;

select security_firewall_test.assert_true(
  not exists (
    select 1
    from public.security_events as event
    cross join (values
      ('8.8.8.8/32'::text, 'Block repeated abusive traffic'::text),
      ('8.8.4.4/32'::text, 'Block repeated abusive traffic'::text)
    ) as guesses(candidate, reason)
    where event.request_fingerprint = pg_catalog.encode(
        extensions.digest(
          pg_catalog.jsonb_build_object(
            'actor_id', '50000000-0000-4000-8000-000000000001'::uuid,
            'request_type', 'block_ip',
            'target', guesses.candidate,
            'hostname', 'www.ourlittleage.com',
            'related_request_id', null,
            'path_match_mode', null,
            'path_pattern', null,
            'http_method', null,
            'window_seconds', null,
            'request_threshold', null,
            'proposed_followup_action', null,
            'reason', guesses.reason
          )::text,
          'sha256'
        ),
        'hex'
      )
  ),
  'Retained fingerprints cannot validate the original or alternate candidate'
);

set role service_role;

select security_firewall_test.assert_true(
  (select bool_and(
     item ->> 'target_network' is null
     and item ->> 'target_masked' is null
     and item ->> 'reason' = 'retention_period_completed'
     and item ->> 'external_rule_id' is null
   )
   from pg_catalog.jsonb_array_elements(
     public.security_admin_get_firewall_requests(
       '50000000-0000-4000-8000-000000000001', 1, 20, 'ended'
     ) -> 'items'
   ) as item
   where item ->> 'id' in (
     select id::text
     from public.security_firewall_requests
     where request_id in (
       '51000000-0000-4000-8000-000000000010',
       '51000000-0000-4000-8000-000000000032'
     )
   ))
  and
  (select bool_and(
     item ->> 'target_network' is null
     and item ->> 'target_masked' is null
     and item ->> 'reason' = 'retention_period_completed'
     and item ->> 'external_rule_id' is null
   )
   from pg_catalog.jsonb_array_elements(
     public.security_admin_get_firewall_requests(
       '50000000-0000-4000-8000-000000000002', 1, 20, 'ended'
     ) -> 'items'
   ) as item
   where item ->> 'id' in (
     select id::text
     from public.security_firewall_requests
     where request_id in (
       '51000000-0000-4000-8000-000000000010',
       '51000000-0000-4000-8000-000000000032'
     )
   )),
  'Owner and Admin APIs return only the anonymized state'
);

select security_firewall_test.assert_true(
  (public.security_owner_create_firewall_request(
    '50000000-0000-4000-8000-000000000001',
    '51000000-0000-4000-8000-000000000010',
    'block_ip', '8.8.4.4/32', 'www.ourlittleage.com', null,
    null, null, null, null, null, null, 'Try another candidate after retention'
  ) ->> 'idempotent')::boolean
  and
  (public.security_owner_create_firewall_request(
    '50000000-0000-4000-8000-000000000001',
    '51000000-0000-4000-8000-000000000010',
    'block_ip', '8.8.8.8/32', 'www.ourlittleage.com', null,
    null, null, null, null, null, null, 'Try the original candidate after retention'
  ) ->> 'idempotent')::boolean,
  'Post-retention retries do not reveal which target was original'
);

select security_firewall_test.assert_true(
  (select count(distinct event.request_fingerprint) = 2
   from public.security_events as event
   where event.event_type = 'firewall_request_created'
     and event.metadata ->> 'firewall_request_id' in (
       select id::text
       from public.security_firewall_requests
       where request_id in (
         '51000000-0000-4000-8000-000000000010',
         '51000000-0000-4000-8000-000000000032'
       )
     )),
  'Separate same-target histories have unlinkable audit fingerprints'
);

select security_firewall_test.assert_true(
  public.security_cleanup_firewall_targets(100) = 0,
  'Repeated retention cleanup is idempotent'
);

select security_firewall_test.assert_true(
  (select bool_and(
     target_network is not null
     and target_masked is not null
     and request_fingerprint is not null
     and anonymized_at is null
   )
   from public.security_firewall_requests
   where request_id in (
     '51000000-0000-4000-8000-000000000050',
     '51000000-0000-4000-8000-000000000052'
   )),
  'Active and awaiting targets are never anonymized'
);

select security_firewall_test.assert_true(
  (public.security_admin_get_firewall_requests(
    '50000000-0000-4000-8000-000000000001', 1, 20, 'ended'
  ) ->> 'total')::integer >= 5,
  'Ended filter is counted and paged by the database'
);

select security_firewall_test.assert_true(
  (select not risk_evaluation_enabled and not automatic_enforcement_enabled
   from public.security_feature_flags where id = 1)
  and
  (select bool_and(status in ('active','warned','muted','banned'))
   from public.profiles)
  and
  (select bool_and(risk_level = 'low' and review_status = 'no_review_required')
   from public.security_risk_profiles),
  'Firewall lifecycle never enables automation or changes account status'
);

reset role;
rollback;
