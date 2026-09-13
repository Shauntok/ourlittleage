begin;

create schema profile_lifecycle_test;

create or replace function profile_lifecycle_test.assert_true(
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

select profile_lifecycle_test.assert_true(
  pg_get_constraintdef(
    (select oid from pg_constraint where conname = 'notifications_user_id_fkey')
  ) like '%ON DELETE CASCADE%',
  'Notification recipients cascade with a deleted profile'
);

select profile_lifecycle_test.assert_true(
  not exists (
    select 1 from pg_constraint
    where conname in (
      'admin_logs_admin_id_fkey',
      'vip_membership_events_user_id_fkey',
      'vip_membership_events_actor_id_fkey'
    )
  ),
  'Immutable audit UUIDs have no profile foreign key'
);

select profile_lifecycle_test.assert_true(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and (
        (table_name = 'reports' and column_name = 'reporter_id')
        or (table_name = 'comment_moderation_keywords' and column_name = 'created_by')
      )
      and is_nullable <> 'YES'
  ),
  'Operational attribution columns support anonymization'
);

insert into auth.users (id, email) values
  ('40000000-0000-4000-8000-000000000001', 'profile-lifecycle-qa@example.test'),
  ('40000000-0000-4000-8000-000000000002', 'profile-lifecycle-other@example.test');

insert into public.profiles (id, username, role, status) values
  ('40000000-0000-4000-8000-000000000001', 'profile-lifecycle-qa', 'user', 'active'),
  ('40000000-0000-4000-8000-000000000002', 'profile-lifecycle-other', 'user', 'active');

insert into public.notifications (id, user_id, actor_id, title) values
  ('41000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', null, 'QA owned notification 1'),
  ('41000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', null, 'QA owned notification 2'),
  ('41000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', 'Unrelated notification');

insert into public.admin_logs (id, admin_id, action) values
  ('42000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'profile_lifecycle_qa');

insert into public.reports (id, reporter_id, reason) values
  ('43000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Profile lifecycle QA');

insert into public.comment_moderation_keywords (id, keyword, created_by) values
  (400000001, 'profile-lifecycle-qa-keyword', '40000000-0000-4000-8000-000000000001');

insert into public.posts (id, title, content, slug, author_id, deleted_by) values
  (400000001, 'Profile lifecycle QA', 'QA', 'profile-lifecycle-qa',
   '40000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001');

insert into public.comments (id, post_id, author_id, content) values
  ('44000000-0000-4000-8000-000000000001', 400000001,
   '40000000-0000-4000-8000-000000000002', 'Profile lifecycle QA reviewed'),
  ('44000000-0000-4000-8000-000000000002', 400000001,
   '40000000-0000-4000-8000-000000000002', 'Profile lifecycle QA pending');

insert into public.comment_moderation_flags (
  comment_id, matched_keywords, status, reviewed_by, reviewed_at
) values
  ('44000000-0000-4000-8000-000000000001', array['profile-lifecycle-qa-keyword'],
   'cleared', '40000000-0000-4000-8000-000000000001', now()),
  ('44000000-0000-4000-8000-000000000002', array['profile-lifecycle-qa-keyword'],
   'pending', null, null);

insert into public.growth_logs (id, user_id, reason, actor_id) values
  ('45000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002',
   'Profile lifecycle QA', '40000000-0000-4000-8000-000000000001');

insert into public.user_badges (id, user_id, assigned_by) values
  ('46000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002'),
  ('46000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001');

insert into public.vip_memberships (
  user_id, status, started_at, expires_at
) values (
  '40000000-0000-4000-8000-000000000001', 'active', now(), now() + interval '30 days'
);

insert into public.vip_membership_events (
  id, user_id, event_type, new_state, reason, actor_id, request_id
) values
  ('47000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001',
   'granted', '{}'::jsonb, 'Profile lifecycle QA subject',
   '40000000-0000-4000-8000-000000000002', '47100000-0000-4000-8000-000000000001'),
  ('47000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002',
   'extended', '{}'::jsonb, 'Profile lifecycle QA actor',
   '40000000-0000-4000-8000-000000000001', '47100000-0000-4000-8000-000000000002');

insert into public.security_events (
  id, request_id, request_fingerprint, event_type, category,
  user_id, actor_id, reason, severity, source, metadata
) values
  ('48000000-0000-4000-8000-000000000001', '48100000-0000-4000-8000-000000000001',
   repeat('1', 64), 'review_marked_pending', 'account',
   '40000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002',
   'Profile lifecycle QA subject', 'low', 'security_center_manual', '{"qa":"subject"}'::jsonb),
  ('48000000-0000-4000-8000-000000000002', '48100000-0000-4000-8000-000000000002',
   repeat('2', 64), 'review_marked_complete', 'admin',
   '40000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001',
   'Profile lifecycle QA actor', 'low', 'security_center_manual', '{"qa":"actor"}'::jsonb);

delete from auth.users
where id = '40000000-0000-4000-8000-000000000001';

select profile_lifecycle_test.assert_true(
  not exists (select 1 from public.profiles where id = '40000000-0000-4000-8000-000000000001'),
  'QA profile deletion completes'
);

select profile_lifecycle_test.assert_true(
  not exists (select 1 from public.notifications where user_id = '40000000-0000-4000-8000-000000000001')
  and exists (select 1 from public.notifications where id = '41000000-0000-4000-8000-000000000003' and actor_id is null),
  'Owned notifications are deleted and unrelated notifications remain'
);

select profile_lifecycle_test.assert_true(
  not exists (select 1 from public.security_risk_profiles where user_id = '40000000-0000-4000-8000-000000000001')
  and not exists (select 1 from public.vip_memberships where user_id = '40000000-0000-4000-8000-000000000001')
  and not exists (select 1 from public.user_badges where id = '46000000-0000-4000-8000-000000000001'),
  'User-owned current state is removed'
);

select profile_lifecycle_test.assert_true(
  (select reporter_id is null from public.reports where id = '43000000-0000-4000-8000-000000000001')
  and (select created_by is null from public.comment_moderation_keywords where id = 400000001)
  and (select actor_id is null from public.growth_logs where id = '45000000-0000-4000-8000-000000000001')
  and (select deleted_by is null from public.posts where id = 400000001)
  and (select assigned_by is null from public.user_badges where id = '46000000-0000-4000-8000-000000000002'),
  'Operational attribution is anonymized'
);

select profile_lifecycle_test.assert_true(
  (select admin_id = '40000000-0000-4000-8000-000000000001' from public.admin_logs where id = '42000000-0000-4000-8000-000000000001')
  and (select user_id = '40000000-0000-4000-8000-000000000001' from public.vip_membership_events where id = '47000000-0000-4000-8000-000000000001')
  and (select actor_id = '40000000-0000-4000-8000-000000000001' from public.vip_membership_events where id = '47000000-0000-4000-8000-000000000002')
  and (select user_id = '40000000-0000-4000-8000-000000000001' from public.security_events where id = '48000000-0000-4000-8000-000000000001')
  and (select actor_id = '40000000-0000-4000-8000-000000000001' from public.security_events where id = '48000000-0000-4000-8000-000000000002')
  and (select status = 'cleared'
       and reviewed_by = '40000000-0000-4000-8000-000000000001'
       and reviewed_at is not null
       from public.comment_moderation_flags
       where comment_id = '44000000-0000-4000-8000-000000000001'),
  'Immutable audit history retains historical UUIDs'
);

select profile_lifecycle_test.assert_true(
  (select status = 'pending' and reviewed_by is null and reviewed_at is null
   from public.comment_moderation_flags
   where comment_id = '44000000-0000-4000-8000-000000000002'),
  'Pending moderation flags remain valid without reviewer attribution'
);

do $$
begin
  begin
    update public.security_events
    set severity = 'critical'
    where id = '48000000-0000-4000-8000-000000000001';
    raise exception 'ASSERTION FAILED: security event update should fail';
  exception when insufficient_privilege then
    null;
  end;

  begin
    delete from public.security_events
    where id = '48000000-0000-4000-8000-000000000001';
    raise exception 'ASSERTION FAILED: security event delete should fail';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

select profile_lifecycle_test.assert_true(
  (select count(*) from public.profiles) = 1
  and (select count(*) from public.notifications) = 1
  and (select count(*) from public.user_badges) = 1
  and (select count(*) from public.reports) = 1
  and (select count(*) from public.admin_logs) = 1
  and (select count(*) from public.vip_membership_events) = 2
  and (select count(*) from public.security_events) = 2,
  'Unrelated and retained data remains intact'
);

rollback;
