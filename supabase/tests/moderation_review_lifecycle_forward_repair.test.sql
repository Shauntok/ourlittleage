begin;

create schema moderation_review_lifecycle_test;

create function moderation_review_lifecycle_test.assert_true(
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

insert into auth.users (id, email) values
  ('49000000-0000-4000-8000-000000000001', 'moderation-reviewer@example.test'),
  ('49000000-0000-4000-8000-000000000002', 'moderation-author@example.test');

insert into public.profiles (id, username, role, status) values
  ('49000000-0000-4000-8000-000000000001', 'moderation-reviewer', 'admin', 'active'),
  ('49000000-0000-4000-8000-000000000002', 'moderation-author', 'user', 'active');

insert into public.posts (id, title, content, slug, author_id) values
  (490000001, 'Moderation lifecycle QA', 'QA', 'moderation-lifecycle-qa',
   '49000000-0000-4000-8000-000000000002');

insert into public.comments (id, post_id, author_id, content) values
  ('49100000-0000-4000-8000-000000000001', 490000001,
   '49000000-0000-4000-8000-000000000002', 'Reviewed moderation lifecycle QA'),
  ('49100000-0000-4000-8000-000000000002', 490000001,
   '49000000-0000-4000-8000-000000000002', 'Pending moderation lifecycle QA');

insert into public.comment_moderation_flags (
  comment_id, matched_keywords, status, reviewed_by, reviewed_at
) values
  ('49100000-0000-4000-8000-000000000001', array['reviewed-qa'],
   'cleared', '49000000-0000-4000-8000-000000000001', now()),
  ('49100000-0000-4000-8000-000000000002', array['pending-qa'],
   'pending', null, null);

delete from auth.users
where id = '49000000-0000-4000-8000-000000000001';

select moderation_review_lifecycle_test.assert_true(
  not exists (
    select 1 from public.profiles
    where id = '49000000-0000-4000-8000-000000000001'
  ),
  'Reviewer profile deletion completes'
);

select moderation_review_lifecycle_test.assert_true(
  (select status = 'cleared'
          and reviewed_by = '49000000-0000-4000-8000-000000000001'
          and reviewed_at is not null
   from public.comment_moderation_flags
   where comment_id = '49100000-0000-4000-8000-000000000001'),
  'Reviewed flag retains state and historical reviewer UUID'
);

select moderation_review_lifecycle_test.assert_true(
  (select status = 'pending' and reviewed_by is null and reviewed_at is null
   from public.comment_moderation_flags
   where comment_id = '49100000-0000-4000-8000-000000000002'),
  'Pending flag remains valid without reviewer attribution'
);

select moderation_review_lifecycle_test.assert_true(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.comment_moderation_flags'::regclass
      and conname = 'comment_moderation_flags_review_check'
  ),
  'Moderation review state check remains installed'
);

rollback;
