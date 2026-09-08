create schema relationship_notification_test;

create or replace function relationship_notification_test.assert_true(
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

grant usage on schema relationship_notification_test to anon, authenticated;
grant execute on function relationship_notification_test.assert_true(boolean, text)
to anon, authenticated;

insert into auth.users (id, email) values
  ('10000000-0000-0000-0000-000000000001', 'notify-a@example.test'),
  ('10000000-0000-0000-0000-000000000002', 'notify-b@example.test'),
  ('10000000-0000-0000-0000-000000000003', 'notify-c@example.test'),
  ('10000000-0000-0000-0000-000000000004', 'notify-d@example.test'),
  ('10000000-0000-0000-0000-000000000005', 'notify-muted@example.test');

insert into public.profiles (id, username, role, status, follow_mode) values
  ('10000000-0000-0000-0000-000000000001', 'notify-a', 'user', 'active', 'open'),
  ('10000000-0000-0000-0000-000000000002', 'notify-b', 'user', 'active', 'open'),
  ('10000000-0000-0000-0000-000000000003', 'notify-c', 'user', 'warned', 'approval_required'),
  ('10000000-0000-0000-0000-000000000004', 'notify-d', 'user', 'active', 'approval_required'),
  ('10000000-0000-0000-0000-000000000005', 'notify-muted', 'user', 'muted', 'open');

select relationship_notification_test.assert_true(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'relationship_id'
      and data_type = 'uuid'
      and is_nullable = 'YES'
  ),
  'notifications has a nullable relationship_id'
);

select relationship_notification_test.assert_true(
  exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'notifications'
      and c.conname = 'notifications_relationship_id_fkey'
      and c.confdeltype = 'n'
  ),
  'relationship notification FK uses ON DELETE SET NULL'
);

select relationship_notification_test.assert_true(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'notifications_relationship_id_idx'
  ),
  'relationship notifications have a covering index'
);

select relationship_notification_test.assert_true(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'notifications_relationship_event_unique'
      and indexdef like '%relationship_id%'
      and indexdef like '%follow_request%'
  ),
  'relationship notification events have a partial unique index'
);

select public.relationship_follow_user(
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002'
);
select public.relationship_follow_user(
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002'
);

select relationship_notification_test.assert_true(
  (select count(*) = 1
   from public.notifications n
   where n.user_id = '10000000-0000-0000-0000-000000000002'
     and n.actor_id = '10000000-0000-0000-0000-000000000001'
     and n.type = 'follow'
     and n.relationship_id is not null),
  'open follow creates exactly one linked follow notification'
);

select public.relationship_follow_user(
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003'
);
select public.relationship_follow_user(
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003'
);

select relationship_notification_test.assert_true(
  (select count(*) = 1
   from public.notifications n
   join public.user_follows f on f.id = n.relationship_id
   where n.user_id = '10000000-0000-0000-0000-000000000003'
     and n.actor_id = '10000000-0000-0000-0000-000000000001'
     and n.type = 'follow_request'
     and n.deleted_at is null
     and f.status = 'pending'),
  'approval follow creates exactly one actionable request notification'
);

select public.relationship_accept_request(
  '10000000-0000-0000-0000-000000000003',
  (select id from public.user_follows
   where follower_id = '10000000-0000-0000-0000-000000000001'
     and following_id = '10000000-0000-0000-0000-000000000003')
);

select relationship_notification_test.assert_true(
  (select status = 'accepted' and accepted_at is not null
   from public.user_follows
   where follower_id = '10000000-0000-0000-0000-000000000001'
     and following_id = '10000000-0000-0000-0000-000000000003'),
  'accept transitions the pending request'
);

select relationship_notification_test.assert_true(
  (select is_read and deleted_at is null
   from public.notifications
   where user_id = '10000000-0000-0000-0000-000000000003'
     and type = 'follow_request'),
  'accept marks the original request processed but keeps its history'
);

select relationship_notification_test.assert_true(
  (select count(*) = 1
   from public.notifications n
   where n.user_id = '10000000-0000-0000-0000-000000000001'
     and n.actor_id = '10000000-0000-0000-0000-000000000003'
     and n.type = 'follow_accepted'
     and n.relationship_id is not null),
  'accept creates one linked accepted notification for the requester'
);

select public.relationship_follow_user(
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000004'
);
select public.relationship_reject_request(
  '10000000-0000-0000-0000-000000000004',
  (select id from public.user_follows
   where follower_id = '10000000-0000-0000-0000-000000000002'
     and following_id = '10000000-0000-0000-0000-000000000004')
);

select relationship_notification_test.assert_true(
  not exists (
    select 1 from public.user_follows
    where follower_id = '10000000-0000-0000-0000-000000000002'
      and following_id = '10000000-0000-0000-0000-000000000004'
  ) and exists (
    select 1 from public.notifications
    where user_id = '10000000-0000-0000-0000-000000000004'
      and actor_id = '10000000-0000-0000-0000-000000000002'
      and type = 'follow_request'
      and is_read
      and deleted_at is not null
      and relationship_id is null
  ),
  'reject removes the relation and closes the original notification'
);

select public.relationship_follow_user(
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000004'
);
select public.relationship_cancel_pending(
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000004'
);

select relationship_notification_test.assert_true(
  (select count(*) = 2 and bool_and(is_read and deleted_at is not null)
   from public.notifications
   where user_id = '10000000-0000-0000-0000-000000000004'
     and actor_id = '10000000-0000-0000-0000-000000000002'
     and type = 'follow_request'),
  'cancel closes the new request without creating a response notification'
);

select relationship_notification_test.assert_true(
  (select count(*) = 0 from public.notifications
   where user_id = '10000000-0000-0000-0000-000000000002'
     and actor_id = '10000000-0000-0000-0000-000000000004'
     and type in ('follow_accepted', 'follow_rejected')),
  'reject and cancel create no response notification'
);

select relationship_notification_test.assert_true(
  public.relationship_unfollow_user(
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002'
  ),
  'accepted relation can be unfollowed'
);

select relationship_notification_test.assert_true(
  (select relationship_id is null
   from public.notifications
   where user_id = '10000000-0000-0000-0000-000000000002'
     and actor_id = '10000000-0000-0000-0000-000000000001'
     and type = 'follow'),
  'ordinary follow notification history survives relationship deletion'
);

select relationship_notification_test.assert_true(
  (select count(*) = 1 from public.notifications
   where user_id = '10000000-0000-0000-0000-000000000002'
     and actor_id = '10000000-0000-0000-0000-000000000001'
     and type = 'follow'),
  'unfollow creates no extra notification'
);

do $$
declare
  before_count bigint;
begin
  select count(*) into before_count from public.notifications;
  begin
    perform public.relationship_follow_user(
      '10000000-0000-0000-0000-000000000005',
      '10000000-0000-0000-0000-000000000002'
    );
    raise exception 'ASSERTION FAILED: muted follow succeeded';
  exception when insufficient_privilege then null;
  end;

  perform relationship_notification_test.assert_true(
    (select count(*) from public.notifications) = before_count
      and not exists (
        select 1 from public.user_follows
        where follower_id = '10000000-0000-0000-0000-000000000005'
          and following_id = '10000000-0000-0000-0000-000000000002'
      ),
    'failed follow rolls back both relationship and notification'
  );
end;
$$;

select relationship_notification_test.assert_true(
  (select followers_count = 0 and following_count = 1
   from public.relationship_get_public_summary(
     '10000000-0000-0000-0000-000000000001'
   )),
  'public summary counts accepted relationships only'
);

select relationship_notification_test.assert_true(
  (select count(*) = 1
      and bool_and(resident_id = '10000000-0000-0000-0000-000000000003'::uuid)
      and min(username) = 'notify-c'
      and min(total_count) = 1
   from public.relationship_list_public(
     '10000000-0000-0000-0000-000000000001',
     'following', 20, 0
   )),
  'public following list returns accepted human-readable rows and total'
);

select relationship_notification_test.assert_true(
  (select count(*) = 0
   from public.relationship_list_public(
     '10000000-0000-0000-0000-000000000004',
     'followers', 20, 0
   )),
  'public lists never include pending relationships'
);

do $$
begin
  perform public.relationship_list_public(
    '10000000-0000-0000-0000-000000000001',
    'pending_received', 20, 0
  );
  raise exception 'ASSERTION FAILED: public pending list succeeded';
exception when check_violation then null;
end;
$$;

do $$
begin
  perform public.relationship_list_public(
    '10000000-0000-0000-0000-000000000001',
    'followers', 101, 0
  );
  raise exception 'ASSERTION FAILED: oversized public list succeeded';
exception when check_violation then null;
end;
$$;

set role anon;
select relationship_notification_test.assert_true(
  (select followers_count = 1
   from public.relationship_get_public_summary(
     '10000000-0000-0000-0000-000000000003'
   )),
  'anonymous visitors can read accepted relationship counts'
);
do $$
begin
  perform public.relationship_follow_user(
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002'
  );
  raise exception 'ASSERTION FAILED: anonymous caller invoked mutation RPC';
exception when insufficient_privilege then null;
end;
$$;
reset role;

select relationship_notification_test.assert_true(
  has_function_privilege('authenticated', 'public.relationship_get_public_summary(uuid)', 'execute')
  and has_function_privilege('anon', 'public.relationship_get_public_summary(uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public.relationship_follow_user(uuid,uuid)', 'execute')
  and not has_function_privilege('anon', 'public.relationship_follow_user(uuid,uuid)', 'execute'),
  'public reads are exposed without exposing mutation RPCs'
);

do $$
declare
  before_count bigint;
begin
  select count(*) into before_count from public.notifications;

  perform relationship_notification_test.assert_true(
    public.relationship_remove_follower(
      '10000000-0000-0000-0000-000000000003',
      '10000000-0000-0000-0000-000000000001'
    ),
    'resident can remove an accepted follower'
  );

  perform relationship_notification_test.assert_true(
    (select count(*) from public.notifications) = before_count,
    'remove follower creates no notification'
  );
end;
$$;
