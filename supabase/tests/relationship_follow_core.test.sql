create schema relationship_test;

create or replace function relationship_test.assert_true(
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

grant usage on schema relationship_test to authenticated;
grant execute on function relationship_test.assert_true(boolean, text) to authenticated;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'a@example.test'),
  ('00000000-0000-0000-0000-000000000002', 'b@example.test'),
  ('00000000-0000-0000-0000-000000000003', 'c@example.test'),
  ('00000000-0000-0000-0000-000000000004', 'muted@example.test'),
  ('00000000-0000-0000-0000-000000000005', 'banned@example.test'),
  ('00000000-0000-0000-0000-000000000006', 'owner@example.test'),
  ('00000000-0000-0000-0000-000000000007', 'admin@example.test'),
  ('00000000-0000-0000-0000-000000000008', 'moderator@example.test'),
  ('00000000-0000-0000-0000-000000000009', 'unknown@example.test');

insert into public.profiles (id, username, role, status) values
  ('00000000-0000-0000-0000-000000000001', 'resident-a', 'user', 'active'),
  ('00000000-0000-0000-0000-000000000002', 'resident-b', 'user', 'warned'),
  ('00000000-0000-0000-0000-000000000003', 'resident-c', 'user', 'active'),
  ('00000000-0000-0000-0000-000000000004', 'resident-muted', 'user', 'muted'),
  ('00000000-0000-0000-0000-000000000005', 'resident-banned', 'user', 'banned'),
  ('00000000-0000-0000-0000-000000000006', 'owner', 'owner', 'active'),
  ('00000000-0000-0000-0000-000000000007', 'admin', 'admin', 'active'),
  ('00000000-0000-0000-0000-000000000008', 'moderator', 'moderator', 'active'),
  ('00000000-0000-0000-0000-000000000009', 'resident-unknown', 'user', null);

select relationship_test.assert_true(
  (select follow_mode = 'open' from public.profiles where username = 'resident-a'),
  'follow_mode defaults to open'
);

select relationship_test.assert_true(
  (select relrowsecurity from pg_class where oid = 'public.user_follows'::regclass),
  'user_follows has RLS enabled'
);

select relationship_test.assert_true(
  (select count(*) = 2 from pg_indexes
   where schemaname = 'public'
     and indexname in ('user_follows_followers_lookup_idx', 'user_follows_following_lookup_idx')),
  'relationship lookup indexes exist'
);

select relationship_test.assert_true(
  (select bool_and(not has_function_privilege('authenticated', p.oid, 'execute'))
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where (n.nspname = 'public' and p.proname in (
       'relationship_follow_user',
       'relationship_unfollow_user',
       'relationship_cancel_pending',
       'relationship_accept_request',
       'relationship_reject_request',
       'relationship_remove_follower',
       'relationship_set_follow_mode',
       'relationship_get_state',
       'admin_get_resident_relationship_summary',
       'admin_list_resident_relationships'
     ))
      or (n.nspname = 'private' and p.proname in ('lock_relationship_profiles', 'guard_follow_mode_update'))),
  'ordinary authenticated sessions cannot execute relationship mutation, state, or admin RPCs directly'
);

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000008', false);
do $$
begin
  update public.profiles
  set follow_mode = 'approval_required'
  where id = '00000000-0000-0000-0000-000000000001';
  raise exception 'ASSERTION FAILED: moderator changed another resident follow mode';
exception when insufficient_privilege then null;
end;
$$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
update public.profiles
set follow_mode = 'approval_required'
where id = '00000000-0000-0000-0000-000000000001';
reset role;
select set_config('request.jwt.claim.sub', '', false);
select relationship_test.assert_true(
  (select follow_mode = 'approval_required' from public.profiles where id = '00000000-0000-0000-0000-000000000001'),
  'resident can update their own follow mode'
);
select public.relationship_set_follow_mode('00000000-0000-0000-0000-000000000001', 'open');

do $$
begin
  perform public.relationship_follow_user(
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
  );
  raise exception 'ASSERTION FAILED: self follow succeeded';
exception when check_violation then null;
end;
$$;

do $$
begin
  perform public.relationship_follow_user(
    '00000000-0000-0000-0000-000000000001',
    'ffffffff-ffff-ffff-ffff-ffffffffffff'
  );
  raise exception 'ASSERTION FAILED: nonexistent target succeeded';
exception when no_data_found then null;
end;
$$;

select public.relationship_follow_user(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'
);
select public.relationship_follow_user(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'
);

select relationship_test.assert_true(
  (select count(*) = 1 and min(status) = 'accepted' and min(accepted_at) is not null
   from public.user_follows
   where follower_id = '00000000-0000-0000-0000-000000000001'
     and following_id = '00000000-0000-0000-0000-000000000002'),
  'open follows are accepted and duplicate calls are idempotent'
);

select public.relationship_set_follow_mode(
  '00000000-0000-0000-0000-000000000003',
  'approval_required'
);
select public.relationship_follow_user(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000003'
);

select relationship_test.assert_true(
  (select status = 'pending' and accepted_at is null
   from public.user_follows
   where follower_id = '00000000-0000-0000-0000-000000000001'
     and following_id = '00000000-0000-0000-0000-000000000003'),
  'approval-required follows remain pending'
);

select relationship_test.assert_true(
  not public.relationship_unfollow_user(
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003'
  )
  and exists (
    select 1 from public.user_follows
    where follower_id = '00000000-0000-0000-0000-000000000001'
      and following_id = '00000000-0000-0000-0000-000000000003'
      and status = 'pending'
  ),
  'unfollow does not silently cancel a pending request'
);

select public.relationship_cancel_pending(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000003'
);
select relationship_test.assert_true(
  not exists (select 1 from public.user_follows where follower_id = '00000000-0000-0000-0000-000000000001' and following_id = '00000000-0000-0000-0000-000000000003'),
  'the requester can cancel an outgoing pending request'
);

select public.relationship_follow_user('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003');
select public.relationship_accept_request(
  '00000000-0000-0000-0000-000000000003',
  (select id from public.user_follows where follower_id = '00000000-0000-0000-0000-000000000001' and following_id = '00000000-0000-0000-0000-000000000003')
);
select relationship_test.assert_true(
  (select status = 'accepted' and accepted_at is not null from public.user_follows where follower_id = '00000000-0000-0000-0000-000000000001' and following_id = '00000000-0000-0000-0000-000000000003'),
  'the recipient can accept a pending request'
);

select public.relationship_follow_user('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003');
select public.relationship_reject_request(
  '00000000-0000-0000-0000-000000000003',
  (select id from public.user_follows where follower_id = '00000000-0000-0000-0000-000000000002' and following_id = '00000000-0000-0000-0000-000000000003')
);
select relationship_test.assert_true(
  not exists (select 1 from public.user_follows where follower_id = '00000000-0000-0000-0000-000000000002' and following_id = '00000000-0000-0000-0000-000000000003'),
  'the recipient can reject a pending request'
);

select public.relationship_follow_user('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003');
do $$
begin
  perform public.relationship_accept_request(
    '00000000-0000-0000-0000-000000000001',
    (select id from public.user_follows where follower_id = '00000000-0000-0000-0000-000000000002' and following_id = '00000000-0000-0000-0000-000000000003')
  );
  raise exception 'ASSERTION FAILED: another resident accepted the request';
exception when insufficient_privilege then null;
end;
$$;
select public.relationship_reject_request(
  '00000000-0000-0000-0000-000000000003',
  (select id from public.user_follows where follower_id = '00000000-0000-0000-0000-000000000002' and following_id = '00000000-0000-0000-0000-000000000003')
);

do $$
begin
  perform public.relationship_follow_user('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001');
  raise exception 'ASSERTION FAILED: muted resident followed';
exception when insufficient_privilege then null;
end;
$$;
do $$
begin
  perform public.relationship_follow_user('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005');
  raise exception 'ASSERTION FAILED: banned target received follow';
exception when insufficient_privilege then null;
end;
$$;
do $$
begin
  perform public.relationship_follow_user('00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001');
  raise exception 'ASSERTION FAILED: unknown account status followed';
exception when insufficient_privilege then null;
end;
$$;

select public.relationship_follow_user('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001');
select relationship_test.assert_true(
  (select is_mutual from public.relationship_get_state('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002')),
  'two accepted directions are mutual'
);
select public.relationship_unfollow_user('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
select relationship_test.assert_true(
  not (select is_mutual from public.relationship_get_state('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'))
  and exists (select 1 from public.user_follows where follower_id = '00000000-0000-0000-0000-000000000002' and following_id = '00000000-0000-0000-0000-000000000001'),
  'unfollow removes only the selected direction'
);

select public.relationship_follow_user('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
select public.relationship_remove_follower('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001');
select relationship_test.assert_true(
  not exists (select 1 from public.user_follows where follower_id = '00000000-0000-0000-0000-000000000001' and following_id = '00000000-0000-0000-0000-000000000002')
  and exists (select 1 from public.user_follows where follower_id = '00000000-0000-0000-0000-000000000002' and following_id = '00000000-0000-0000-0000-000000000001'),
  'remove follower preserves the reverse direction'
);

select public.relationship_follow_user('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003');

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select relationship_test.assert_true(
  exists (select 1 from public.user_follows where follower_id = '00000000-0000-0000-0000-000000000002' and following_id = '00000000-0000-0000-0000-000000000001')
  and not exists (select 1 from public.user_follows where follower_id = '00000000-0000-0000-0000-000000000002' and following_id = '00000000-0000-0000-0000-000000000003'),
  'RLS exposes participant rows but hides unrelated relationships'
);
do $$
begin
  insert into public.user_follows (follower_id, following_id, status, accepted_at)
  values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'accepted', now());
  raise exception 'ASSERTION FAILED: authenticated role directly inserted a relationship';
exception when insufficient_privilege then null;
end;
$$;
do $$
begin
  perform public.relationship_follow_user('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003');
  raise exception 'ASSERTION FAILED: authenticated role invoked service-only RPC';
exception when insufficient_privilege then null;
end;
$$;
do $$
begin
  update public.user_follows set status = 'accepted';
  raise exception 'ASSERTION FAILED: authenticated role directly updated relationships';
exception when insufficient_privilege then null;
end;
$$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000006', false);
select relationship_test.assert_true(
  exists (select 1 from public.user_follows where follower_id = '00000000-0000-0000-0000-000000000002' and following_id = '00000000-0000-0000-0000-000000000003'),
  'RLS lets owner inspect relationships without granting writes'
);
reset role;
select set_config('request.jwt.claim.sub', '', false);

select public.relationship_follow_user('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003');
update public.profiles set status = 'muted' where id = '00000000-0000-0000-0000-000000000002';
select relationship_test.assert_true(
  exists (
    select 1 from public.user_follows
    where follower_id = '00000000-0000-0000-0000-000000000002'
      and following_id = '00000000-0000-0000-0000-000000000003'
      and status = 'pending'
  ),
  'account status changes preserve pending rows'
);
do $$
begin
  perform public.relationship_accept_request(
    '00000000-0000-0000-0000-000000000003',
    (select id from public.user_follows where follower_id = '00000000-0000-0000-0000-000000000002' and following_id = '00000000-0000-0000-0000-000000000003')
  );
  raise exception 'ASSERTION FAILED: pending request from muted resident was accepted';
exception when insufficient_privilege then null;
end;
$$;
select public.relationship_cancel_pending('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003');
select relationship_test.assert_true(
  not exists (select 1 from public.user_follows where follower_id = '00000000-0000-0000-0000-000000000002' and following_id = '00000000-0000-0000-0000-000000000003'),
  'muted requester can cancel an existing pending request'
);
update public.profiles set status = 'warned' where id = '00000000-0000-0000-0000-000000000002';

select public.relationship_follow_user('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003');
update public.profiles set status = 'banned' where id = '00000000-0000-0000-0000-000000000003';
do $$
begin
  perform public.relationship_accept_request(
    '00000000-0000-0000-0000-000000000003',
    (select id from public.user_follows where follower_id = '00000000-0000-0000-0000-000000000002' and following_id = '00000000-0000-0000-0000-000000000003')
  );
  raise exception 'ASSERTION FAILED: banned recipient accepted a request';
exception when insufficient_privilege then null;
end;
$$;
select public.relationship_reject_request(
  '00000000-0000-0000-0000-000000000003',
  (select id from public.user_follows where follower_id = '00000000-0000-0000-0000-000000000002' and following_id = '00000000-0000-0000-0000-000000000003')
);
select relationship_test.assert_true(
  not exists (select 1 from public.user_follows where follower_id = '00000000-0000-0000-0000-000000000002' and following_id = '00000000-0000-0000-0000-000000000003'),
  'banned recipient can reject an existing pending request'
);
update public.profiles set status = 'active' where id = '00000000-0000-0000-0000-000000000003';

select public.relationship_follow_user('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003');
update public.profiles set status = 'banned' where id = '00000000-0000-0000-0000-000000000001';
select relationship_test.assert_true(
  exists (select 1 from public.user_follows where follower_id = '00000000-0000-0000-0000-000000000001' and following_id = '00000000-0000-0000-0000-000000000003' and status = 'accepted'),
  'account status changes preserve existing accepted rows'
);
select relationship_test.assert_true(
  public.relationship_unfollow_user('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003'),
  'banned requester can remove an existing accepted relationship'
);
update public.profiles set status = 'active' where id = '00000000-0000-0000-0000-000000000001';
select public.relationship_set_follow_mode('00000000-0000-0000-0000-000000000003', 'open');
select public.relationship_follow_user('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003');

select relationship_test.assert_true(
  (select followers_count = 1 and following_count = 1 and mutual_count = 0
     and pending_received_count = 0 and pending_sent_count = 0
   from public.admin_get_resident_relationship_summary(
     '00000000-0000-0000-0000-000000000006',
     '00000000-0000-0000-0000-000000000001'
   )),
  'admin summary counts accepted rows and excludes pending rows'
);

do $$
begin
  perform public.admin_get_resident_relationship_summary(
    '00000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000001'
  );
  raise exception 'ASSERTION FAILED: moderator read admin relationship summary';
exception when insufficient_privilege then null;
end;
$$;

select relationship_test.assert_true(
  (select count(*) = 1 and min(username) = 'resident-b' and min(total_count) = 1
   from public.admin_list_resident_relationships(
     '00000000-0000-0000-0000-000000000007',
     '00000000-0000-0000-0000-000000000001',
     'followers', 20, 0
   )),
  'admin detail joins human-readable resident data and reports pagination total'
);
