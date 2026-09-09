begin;

create schema vip_test;

create or replace function vip_test.assert_true(
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

grant usage on schema vip_test to authenticated, service_role;
grant execute on function vip_test.assert_true(boolean, text)
to authenticated, service_role;

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000001', 'vip-owner@example.test'),
  ('10000000-0000-4000-8000-000000000002', 'vip-admin@example.test'),
  ('10000000-0000-4000-8000-000000000003', 'vip-moderator@example.test'),
  ('10000000-0000-4000-8000-000000000004', 'vip-resident@example.test');

insert into public.profiles (id, username, role, status) values
  ('10000000-0000-4000-8000-000000000001', 'vip-owner', 'owner', 'active'),
  ('10000000-0000-4000-8000-000000000002', 'vip-admin', 'admin', 'active'),
  ('10000000-0000-4000-8000-000000000003', 'vip-moderator', 'moderator', 'active'),
  ('10000000-0000-4000-8000-000000000004', 'vip-resident', 'user', 'active');

select vip_test.assert_true(
  (select bool_and(not enabled) from (
    select vip_entitlement_enabled as enabled from public.vip_feature_flags
    union all
    select vip_public_ui_enabled from public.vip_feature_flags
    union all
    select vip_purchase_enabled from public.vip_feature_flags
    union all
    select vip_referral_reward_enabled from public.vip_feature_flags
    union all
    select vip_public_badge_enabled from public.vip_feature_flags
  ) flags),
  'all VIP feature flags default to off'
);

select vip_test.assert_true(
  (select bool_and(relrowsecurity)
   from pg_class
   where oid in (
     'public.vip_feature_flags'::regclass,
     'public.vip_memberships'::regclass,
     'public.vip_membership_events'::regclass
   )),
  'all VIP tables have RLS enabled'
);

select vip_test.assert_true(
  not has_table_privilege('authenticated', 'public.vip_memberships', 'select')
  and not has_table_privilege('authenticated', 'public.vip_memberships', 'insert')
  and not has_table_privilege('authenticated', 'public.vip_memberships', 'update')
  and not has_table_privilege('authenticated', 'public.vip_membership_events', 'insert')
  and not has_table_privilege('authenticated', 'public.vip_membership_events', 'update')
  and not has_table_privilege('authenticated', 'public.vip_membership_events', 'delete'),
  'ordinary residents cannot read or mutate private VIP state directly'
);

select vip_test.assert_true(
  (select bool_and(not has_function_privilege(role_name, p.oid, 'execute'))
   from (values ('anon'), ('authenticated')) as roles(role_name)
   cross join pg_proc as p
   join pg_namespace as n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in (
       'vip_get_feature_flags',
       'vip_get_membership',
       'vip_admin_get_membership',
       'vip_get_entitlement',
       'vip_apply_membership_event'
     )),
  'anon and ordinary residents cannot execute private VIP RPCs'
);

set role service_role;

select vip_test.assert_true(
  not coalesce(
    (public.vip_get_entitlement('10000000-0000-4000-8000-000000000004') ->> 'is_active')::boolean,
    false
  ),
  'feature flag off disables entitlement'
);

reset role;

delete from public.vip_feature_flags;

set role service_role;

select vip_test.assert_true(
  not (public.vip_get_feature_flags() ->> 'vip_entitlement_enabled')::boolean
  and not coalesce(
    (public.vip_get_entitlement('10000000-0000-4000-8000-000000000004') ->> 'is_active')::boolean,
    false
  ),
  'missing feature flag row fails closed'
);

reset role;

insert into public.vip_feature_flags (id) values (true);
update public.vip_feature_flags
set vip_entitlement_enabled = true
where id = true;

insert into public.vip_memberships (
  user_id,
  status,
  started_at,
  expires_at
)
values (
  '10000000-0000-4000-8000-000000000004',
  'active',
  now() - interval '1 day',
  now() + interval '1 day'
);

set role service_role;

select vip_test.assert_true(
  (public.vip_get_entitlement('10000000-0000-4000-8000-000000000004') ->> 'is_active')::boolean,
  'active membership inside its time window is entitled'
);

reset role;

update public.vip_memberships
set started_at = now() + interval '1 day',
    expires_at = now() + interval '2 days';

set role service_role;

select vip_test.assert_true(
  not (public.vip_get_entitlement('10000000-0000-4000-8000-000000000004') ->> 'is_active')::boolean,
  'future membership is not active'
);

reset role;

update public.vip_memberships
set started_at = now() - interval '2 days',
    expires_at = now();

set role service_role;

select vip_test.assert_true(
  not (public.vip_get_entitlement('10000000-0000-4000-8000-000000000004') ->> 'is_active')::boolean,
  'membership expiring at now is not active'
);

reset role;

update public.vip_memberships
set status = 'cancelled',
    expires_at = now() + interval '1 day';

set role service_role;

select vip_test.assert_true(
  not (public.vip_get_entitlement('10000000-0000-4000-8000-000000000004') ->> 'is_active')::boolean,
  'cancelled membership is not active'
);

reset role;

update public.vip_memberships set status = 'revoked';

set role service_role;

select vip_test.assert_true(
  not (public.vip_get_entitlement('10000000-0000-4000-8000-000000000004') ->> 'is_active')::boolean,
  'revoked membership is not active'
);

reset role;

update public.vip_memberships set status = 'active';
update public.profiles
set status = 'muted'
where id = '10000000-0000-4000-8000-000000000004';

set role service_role;

select vip_test.assert_true(
  not (public.vip_get_entitlement('10000000-0000-4000-8000-000000000004') ->> 'is_active')::boolean,
  'muted residents do not receive effective VIP entitlement'
);

reset role;

update public.profiles
set status = 'banned'
where id = '10000000-0000-4000-8000-000000000004';

set role service_role;

select vip_test.assert_true(
  not (public.vip_get_entitlement('10000000-0000-4000-8000-000000000004') ->> 'is_active')::boolean,
  'banned residents do not receive effective VIP entitlement'
);

reset role;

update public.profiles
set status = null
where id = '10000000-0000-4000-8000-000000000004';

set role service_role;

select vip_test.assert_true(
  not (public.vip_get_entitlement('10000000-0000-4000-8000-000000000004') ->> 'is_active')::boolean,
  'unknown account status does not receive effective VIP entitlement'
);

reset role;

delete from public.vip_memberships;
update public.profiles
set status = 'active'
where id = '10000000-0000-4000-8000-000000000004';

set role service_role;

select public.vip_apply_membership_event(
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000004',
  'grant',
  '2026-09-09T00:00:00Z',
  '2026-10-09T00:00:00Z',
  'Initial QA grant',
  '20000000-0000-4000-8000-000000000001'
);

select public.vip_apply_membership_event(
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000004',
  'grant',
  '2026-09-09T00:00:00Z',
  '2026-10-09T00:00:00Z',
  'Initial QA grant',
  '20000000-0000-4000-8000-000000000001'
);

reset role;

select vip_test.assert_true(
  (select count(*) = 1
   from public.vip_membership_events
   where request_id = '20000000-0000-4000-8000-000000000001'),
  'replaying a grant request creates one event'
);

set role service_role;

select public.vip_apply_membership_event(
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000004',
  'extend',
  null,
  '2026-11-09T00:00:00Z',
  'QA extension',
  '20000000-0000-4000-8000-000000000002'
);

select public.vip_apply_membership_event(
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000004',
  'extend',
  null,
  '2026-11-09T00:00:00Z',
  'QA extension',
  '20000000-0000-4000-8000-000000000002'
);

select vip_test.assert_true(
  (
    public.vip_apply_membership_event(
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000004',
      'grant',
      '2026-09-09T00:00:00Z',
      '2026-10-09T00:00:00Z',
      'Initial QA grant',
      '20000000-0000-4000-8000-000000000001'
    ) -> 'membership' ->> 'expires_at'
  )::timestamptz = '2026-10-09T00:00:00Z'::timestamptz,
  'an old request replay returns its original stable result'
);

reset role;

select vip_test.assert_true(
  (select count(*) = 1
   from public.vip_membership_events
   where request_id = '20000000-0000-4000-8000-000000000002')
  and (select expires_at = '2026-11-09T00:00:00Z'::timestamptz
       from public.vip_memberships
       where user_id = '10000000-0000-4000-8000-000000000004'),
  'replaying an extension changes the membership only once'
);

do $$
begin
  begin
    perform public.vip_apply_membership_event(
      '10000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000004',
      'cancel',
      null,
      null,
      'Admin must remain read-only',
      '20000000-0000-4000-8000-000000000003'
    );
    raise exception 'ASSERTION FAILED: admin mutation unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

set role service_role;

select vip_test.assert_true(
  public.vip_admin_get_membership(
    '10000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000004'
  ) is not null,
  'admin can read VIP core state through the guarded server path'
);

do $$
begin
  begin
    perform public.vip_admin_get_membership(
      '10000000-0000-4000-8000-000000000003',
      '10000000-0000-4000-8000-000000000004'
    );
    raise exception 'ASSERTION FAILED: moderator read unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;

set role service_role;

select public.vip_apply_membership_event(
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000004',
  'cancel',
  null,
  null,
  'QA cancellation',
  '20000000-0000-4000-8000-000000000004'
);

reset role;

select vip_test.assert_true(
  (select status = 'cancelled'
     and cancel_at_period_end = false
   from public.vip_memberships
   where user_id = '10000000-0000-4000-8000-000000000004'),
  'cancel immediately makes the membership inactive'
);

set role service_role;

select public.vip_apply_membership_event(
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000004',
  'grant',
  '2026-11-10T00:00:00Z',
  '2026-12-10T00:00:00Z',
  'QA regrant',
  '20000000-0000-4000-8000-000000000005'
);

select public.vip_apply_membership_event(
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000004',
  'revoke',
  null,
  null,
  'QA revocation',
  '20000000-0000-4000-8000-000000000006'
);

reset role;

select vip_test.assert_true(
  (select status = 'revoked'
   from public.vip_memberships
   where user_id = '10000000-0000-4000-8000-000000000004')
  and (select count(*) = 1
       from public.vip_membership_events
       where request_id = '20000000-0000-4000-8000-000000000006'),
  'revoke records one event and makes the membership inactive'
);

set role service_role;

do $$
begin
  begin
    perform public.vip_apply_membership_event(
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000004',
      'cancel',
      null,
      null,
      'Revocation cannot be downgraded',
      '20000000-0000-4000-8000-000000000007'
    );
    raise exception 'ASSERTION FAILED: revoked membership was cancelled';
  exception
    when invalid_parameter_value then null;
  end;
end;
$$;

reset role;

select vip_test.assert_true(
  (select status = 'revoked'
   from public.vip_memberships
   where user_id = '10000000-0000-4000-8000-000000000004'),
  'revoked status is not downgraded by cancel'
);

do $$
begin
  begin
    update public.vip_membership_events
    set reason = 'tampered';
    raise exception 'ASSERTION FAILED: event update unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    delete from public.vip_membership_events;
    raise exception 'ASSERTION FAILED: event delete unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

rollback;
