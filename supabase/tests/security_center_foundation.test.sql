begin;

create schema security_center_test;

create or replace function security_center_test.assert_true(
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

grant usage on schema security_center_test to service_role;
grant execute on function security_center_test.assert_true(boolean, text) to service_role;

select security_center_test.assert_true(
  to_regclass('public.security_feature_flags') is not null
  and to_regclass('public.security_risk_profiles') is not null
  and to_regclass('public.security_events') is not null,
  'Security Center foundation tables exist'
);

select security_center_test.assert_true(
  (select bool_and(relrowsecurity)
   from pg_class
   where oid in (
     'public.security_feature_flags'::regclass,
     'public.security_risk_profiles'::regclass,
     'public.security_events'::regclass
   )),
  'Security Center tables have RLS enabled'
);

select security_center_test.assert_true(
  not has_table_privilege('authenticated', 'public.security_feature_flags', 'select')
  and not has_table_privilege('authenticated', 'public.security_risk_profiles', 'select')
  and not has_table_privilege('authenticated', 'public.security_events', 'select')
  and not has_table_privilege('anon', 'public.security_events', 'select'),
  'Browser roles cannot read internal Security Center tables directly'
);

select security_center_test.assert_true(
  not has_function_privilege(
    'authenticated',
    'public.security_admin_get_overview(uuid,integer,integer)',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'public.security_admin_get_resident(uuid,uuid,integer,integer)',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'public.security_owner_apply_risk_action(uuid,uuid,text,text,text,text,text,uuid)',
    'execute'
  ),
  'Browser roles cannot execute Security Center RPCs directly'
);

select security_center_test.assert_true(
  (select security_center_enabled
     and security_event_collection_enabled
     and not risk_evaluation_enabled
     and not automatic_enforcement_enabled
   from public.security_feature_flags
   where id = 1),
  'Security Center defaults to collection on and automation off'
);

insert into auth.users (id, email) values
  ('30000000-0000-4000-8000-000000000001', 'security-owner@example.test'),
  ('30000000-0000-4000-8000-000000000002', 'security-admin@example.test'),
  ('30000000-0000-4000-8000-000000000003', 'security-moderator@example.test'),
  ('30000000-0000-4000-8000-000000000004', 'security-resident@example.test'),
  ('30000000-0000-4000-8000-000000000005', 'security-target@example.test'),
  ('30000000-0000-4000-8000-000000000006', 'security-warned-admin@example.test');

insert into public.profiles (id, username, role, status) values
  ('30000000-0000-4000-8000-000000000001', 'security-owner', 'owner', 'active'),
  ('30000000-0000-4000-8000-000000000002', 'security-admin', 'admin', 'active'),
  ('30000000-0000-4000-8000-000000000003', 'security-moderator', 'moderator', 'active'),
  ('30000000-0000-4000-8000-000000000004', 'security-resident', 'user', 'active'),
  ('30000000-0000-4000-8000-000000000005', 'security-target', 'user', 'warned'),
  ('30000000-0000-4000-8000-000000000006', 'security-warned-admin', 'admin', 'warned');

select security_center_test.assert_true(
  (select status = 'warned'
   from public.profiles
   where id = '30000000-0000-4000-8000-000000000005')
  and
  (select risk_level = 'low' and review_status = 'no_review_required'
   from public.security_risk_profiles
   where user_id = '30000000-0000-4000-8000-000000000005'),
  'Profile initialization creates a neutral risk record without changing account status'
);

set role service_role;

select security_center_test.assert_true(
  (public.security_admin_get_overview(
    '30000000-0000-4000-8000-000000000001', 1, 20
  ) -> 'flags' ->> 'security_center_enabled')::boolean,
  'Owner can read Security Center overview'
);

select security_center_test.assert_true(
  (public.security_admin_get_resident(
    '30000000-0000-4000-8000-000000000006',
    '30000000-0000-4000-8000-000000000005',
    1,
    10
  ) -> 'profile' ->> 'risk_level') = 'low',
  'Warned admin can read resident security data'
);

do $$
begin
  begin
    perform public.security_admin_get_overview(
      '30000000-0000-4000-8000-000000000003', 1, 20
    );
    raise exception 'ASSERTION FAILED: moderator overview should be denied';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.security_admin_get_resident(
      '30000000-0000-4000-8000-000000000004',
      '30000000-0000-4000-8000-000000000005',
      1,
      10
    );
    raise exception 'ASSERTION FAILED: resident detail should be denied';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.security_owner_apply_risk_action(
      '30000000-0000-4000-8000-000000000002',
      '30000000-0000-4000-8000-000000000005',
      'set_risk',
      'high',
      null,
      null,
      'Admin must remain read only',
      '31000000-0000-4000-8000-000000000001'
    );
    raise exception 'ASSERTION FAILED: admin mutation should be denied';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

select public.security_owner_apply_risk_action(
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000005',
  'set_risk',
  'high',
  null,
  null,
  'Manual review found elevated risk',
  '31000000-0000-4000-8000-000000000002'
);

select security_center_test.assert_true(
  (select risk_level = 'high'
   from public.security_risk_profiles
   where user_id = '30000000-0000-4000-8000-000000000005')
  and
  (select status = 'warned'
   from public.profiles
   where id = '30000000-0000-4000-8000-000000000005'),
  'Manual risk classification never changes account status'
);

select security_center_test.assert_true(
  (select count(*)
   from public.security_events
   where request_id = '31000000-0000-4000-8000-000000000002') = 1
  and
  (select count(*)
   from public.admin_logs
   where action = 'security_set_risk'
     and target_id = '30000000-0000-4000-8000-000000000005'
     and details like '%31000000-0000-4000-8000-000000000002%') = 1,
  'A risk action creates one immutable event and one admin log'
);

select security_center_test.assert_true(
  (public.security_owner_apply_risk_action(
    '30000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000005',
    'set_risk',
    'high',
    null,
    null,
    'Manual review found elevated risk',
    '31000000-0000-4000-8000-000000000002'
  ) ->> 'idempotent')::boolean,
  'Retrying the same request is idempotent'
);

select security_center_test.assert_true(
  (select count(*)
   from public.security_events
   where request_id = '31000000-0000-4000-8000-000000000002') = 1
  and
  (select count(*)
   from public.admin_logs
   where action = 'security_set_risk'
     and details like '%31000000-0000-4000-8000-000000000002%') = 1,
  'Idempotent retry does not duplicate audit records'
);

do $$
begin
  begin
    perform public.security_owner_apply_risk_action(
      '30000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000005',
      'set_risk',
      'critical',
      null,
      null,
      'Different payload with reused request id',
      '31000000-0000-4000-8000-000000000002'
    );
    raise exception 'ASSERTION FAILED: mismatched request reuse should fail';
  exception when invalid_parameter_value then
    null;
  end;
end;
$$;

select public.security_owner_apply_risk_action(
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000005',
  'set_review',
  null,
  'pending',
  null,
  'Queue resident for manual review',
  '31000000-0000-4000-8000-000000000003'
);

select security_center_test.assert_true(
  (select review_status = 'pending'
     and last_reviewed_at is null
     and reviewed_by is null
   from public.security_risk_profiles
   where user_id = '30000000-0000-4000-8000-000000000005'),
  'Pending review clears completion metadata'
);

select public.security_owner_apply_risk_action(
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000005',
  'set_review',
  null,
  'reviewed',
  null,
  'Manual review completed',
  '31000000-0000-4000-8000-000000000004'
);

select security_center_test.assert_true(
  (select review_status = 'reviewed'
     and last_reviewed_at is not null
     and reviewed_by = '30000000-0000-4000-8000-000000000001'
   from public.security_risk_profiles
   where user_id = '30000000-0000-4000-8000-000000000005'),
  'Completed review records its owner and timestamp'
);

select public.security_owner_apply_risk_action(
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000005',
  'set_note',
  null,
  null,
  '  Internal review note  ',
  'Record private context without copying note text to audit metadata',
  '31000000-0000-4000-8000-000000000005'
);

select security_center_test.assert_true(
  (select notes = 'Internal review note'
   from public.security_risk_profiles
   where user_id = '30000000-0000-4000-8000-000000000005')
  and
  (select not (metadata ? 'note')
   from public.security_events
   where request_id = '31000000-0000-4000-8000-000000000005')
  and
  (select details not like '%Internal review note%'
   from public.admin_logs
   where action = 'security_set_note'
     and details like '%31000000-0000-4000-8000-000000000005%'),
  'Private note text is stored only on the risk profile'
);

reset role;

update public.security_feature_flags
set security_event_collection_enabled = false,
    updated_at = now()
where id = 1;

set role service_role;

do $$
begin
  begin
    perform public.security_owner_apply_risk_action(
      '30000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000005',
      'set_risk',
      'medium',
      null,
      null,
      'Feature gate must fail closed',
      '31000000-0000-4000-8000-000000000006'
    );
    raise exception 'ASSERTION FAILED: disabled event collection should block mutation';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;

do $$
begin
  begin
    update public.security_events
    set severity = 'critical'
    where request_id = '31000000-0000-4000-8000-000000000002';
    raise exception 'ASSERTION FAILED: security event update should fail';
  exception when insufficient_privilege then
    null;
  end;

  begin
    delete from public.security_events
    where request_id = '31000000-0000-4000-8000-000000000002';
    raise exception 'ASSERTION FAILED: security event delete should fail';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

rollback;
