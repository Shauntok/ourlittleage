begin;

create schema vip_admin_test;

create or replace function vip_admin_test.assert_true(
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

grant usage on schema vip_admin_test to service_role;
grant execute on function vip_admin_test.assert_true(boolean, text) to service_role;

insert into auth.users (id, email) values
  ('20000000-0000-4000-8000-000000000001', 'vip-admin-owner@example.test'),
  ('20000000-0000-4000-8000-000000000002', 'vip-admin-reader@example.test'),
  ('20000000-0000-4000-8000-000000000003', 'vip-admin-moderator@example.test'),
  ('20000000-0000-4000-8000-000000000004', 'vip-admin-resident@example.test');

insert into public.profiles (id, username, role, status) values
  ('20000000-0000-4000-8000-000000000001', 'vip-admin-owner', 'owner', 'active'),
  ('20000000-0000-4000-8000-000000000002', 'vip-admin-reader', 'admin', 'active'),
  ('20000000-0000-4000-8000-000000000003', 'vip-admin-moderator', 'moderator', 'active'),
  ('20000000-0000-4000-8000-000000000004', 'vip-admin-resident', 'user', 'active');

select vip_admin_test.assert_true(
  not has_function_privilege(
    'authenticated',
    'public.vip_admin_get_overview(uuid,uuid,integer,integer)',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'public.vip_admin_apply_membership_action(uuid,uuid,text,integer,text,uuid)',
    'execute'
  ),
  'ordinary residents cannot execute VIP admin RPCs'
);

set role service_role;

select vip_admin_test.assert_true(
  (public.vip_admin_get_overview(
    '20000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000004',
    1,
    10
  ) -> 'entitlement' ->> 'reason') = 'feature_disabled',
  'admin can read while the global entitlement flag remains disabled'
);

do $$
begin
  begin
    perform public.vip_admin_get_overview(
      '20000000-0000-4000-8000-000000000003',
      '20000000-0000-4000-8000-000000000004',
      1,
      10
    );
    raise exception 'ASSERTION FAILED: moderator overview should be denied';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.vip_admin_apply_membership_action(
      '20000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000004',
      'grant',
      30,
      'Admin must remain read only',
      '21000000-0000-4000-8000-000000000001'
    );
    raise exception 'ASSERTION FAILED: admin mutation should be denied';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.vip_admin_apply_membership_action(
      '20000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000004',
      null,
      null,
      'Invalid missing action',
      '21000000-0000-4000-8000-000000000009'
    );
    raise exception 'ASSERTION FAILED: missing action should be rejected';
  exception when invalid_parameter_value then
    null;
  end;
end;
$$;

select public.vip_admin_apply_membership_action(
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000004',
  'grant',
  30,
  'Founding resident grant',
  '21000000-0000-4000-8000-000000000002'
);

select vip_admin_test.assert_true(
  exists (
    select 1
    from public.vip_memberships
    where user_id = '20000000-0000-4000-8000-000000000004'
      and status = 'active'
      and expires_at - started_at = interval '30 days'
      and not cancel_at_period_end
  ),
  'grant uses the trusted database clock'
);

select vip_admin_test.assert_true(
  (public.vip_admin_apply_membership_action(
    '20000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000004',
    'grant',
    30,
    'Founding resident grant',
    '21000000-0000-4000-8000-000000000002'
  ) ->> 'idempotent')::boolean,
  'the same request id is idempotent'
);

select vip_admin_test.assert_true(
  (select count(*) from public.vip_membership_events
   where request_id = '21000000-0000-4000-8000-000000000002') = 1
  and
  (select count(*) from public.admin_logs
   where action = 'vip_grant'
     and target_id = '20000000-0000-4000-8000-000000000004'
     and details like '%21000000-0000-4000-8000-000000000002%') = 1,
  'idempotency prevents duplicate VIP events and admin logs'
);

select public.vip_admin_apply_membership_action(
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000004',
  'extend',
  7,
  'Seven day extension',
  '21000000-0000-4000-8000-000000000003'
);

select vip_admin_test.assert_true(
  (select expires_at - started_at = interval '37 days'
   from public.vip_memberships
   where user_id = '20000000-0000-4000-8000-000000000004'),
  'an active membership extends from its existing expiry'
);

select public.vip_admin_apply_membership_action(
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000004',
  'cancel',
  null,
  'Cancel after the current period',
  '21000000-0000-4000-8000-000000000004'
);

select vip_admin_test.assert_true(
  (select status = 'active' and cancel_at_period_end
   from public.vip_memberships
   where user_id = '20000000-0000-4000-8000-000000000004'),
  'period-end cancellation preserves active stored status until expiry'
);

select public.vip_admin_apply_membership_action(
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000004',
  'revoke',
  null,
  'Immediate policy revocation',
  '21000000-0000-4000-8000-000000000005'
);

select vip_admin_test.assert_true(
  (select status = 'revoked' and not cancel_at_period_end
   from public.vip_memberships
   where user_id = '20000000-0000-4000-8000-000000000004'),
  'revoke immediately changes stored status'
);

do $$
begin
  begin
    perform public.vip_admin_apply_membership_action(
      '20000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000004',
      'extend',
      30,
      'Revoked memberships cannot be extended',
      '21000000-0000-4000-8000-000000000006'
    );
    raise exception 'ASSERTION FAILED: revoked extension should fail';
  exception when invalid_parameter_value then
    null;
  end;
end;
$$;

select public.vip_admin_apply_membership_action(
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000004',
  'grant',
  14,
  'Re-grant after revocation',
  '21000000-0000-4000-8000-000000000007'
);

reset role;

update public.vip_memberships
set started_at = now() - interval '20 days',
    expires_at = now() - interval '10 days'
where user_id = '20000000-0000-4000-8000-000000000004';

set role service_role;

select public.vip_admin_apply_membership_action(
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000004',
  'extend',
  30,
  'Expired membership extension',
  '21000000-0000-4000-8000-000000000008'
);

select vip_admin_test.assert_true(
  (select expires_at - updated_at = interval '30 days'
   from public.vip_memberships
   where user_id = '20000000-0000-4000-8000-000000000004'),
  'an expired active membership extends from trusted database now'
);

select vip_admin_test.assert_true(
  (public.vip_admin_get_overview(
    '20000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000004',
    1,
    10
  ) -> 'history' ->> 'total')::integer = 6,
  'overview returns the complete recent event count'
);

reset role;

rollback;
