begin;

insert into auth.users (id, email) values
  ('30000000-0000-0000-0000-000000000001', 'neighbor-author@example.test'),
  ('30000000-0000-0000-0000-000000000002', 'neighbor-reader@example.test'),
  ('30000000-0000-0000-0000-000000000003', 'neighbor-stranger@example.test');

insert into public.profiles (id, username, role, status) values
  ('30000000-0000-0000-0000-000000000001', 'neighbor-author', 'user', 'active'),
  ('30000000-0000-0000-0000-000000000002', 'neighbor-reader', 'user', 'active'),
  ('30000000-0000-0000-0000-000000000003', 'neighbor-stranger', 'user', 'active');

insert into public.posts (id, author_id, title, content, slug, type, status, visibility) values
  (30000001, '30000000-0000-0000-0000-000000000001', '给邻居的日记', '只有文字。', 'neighbor-diary-test', 'diary', 'published', 'neighbors'),
  (30000002, '30000000-0000-0000-0000-000000000001', '公开文章', '公开内容。', 'neighbor-public-test', 'article', 'published', 'public'),
  (30000003, '30000000-0000-0000-0000-000000000001', '链接文章', '链接内容。', 'neighbor-unlisted-test', 'article', 'published', 'unlisted'),
  (30000004, '30000000-0000-0000-0000-000000000001', '邻居草稿', '还没发布。', 'neighbor-draft-test', 'article', 'draft', 'neighbors');

insert into public.comments (author_id, post_id, content) values
  ('30000000-0000-0000-0000-000000000002', 30000001, '邻居的留言');

insert into public.post_likes (user_id, post_id, is_active) values
  ('30000000-0000-0000-0000-000000000002', 30000001, true);

insert into public.comment_likes (user_id, comment_id, is_active)
select '30000000-0000-0000-0000-000000000002', id, true
from public.comments where post_id = 30000001;

set role anon;
do $$ begin
  if (select count(*) from public.posts where id between 30000001 and 30000004) <> 2 then
    raise exception 'anonymous readers must only see public and unlisted posts';
  end if;
  if exists (select 1 from public.comments where post_id = 30000001)
     or exists (select 1 from public.post_likes where post_id = 30000001)
     or exists (select 1 from public.comment_likes) then
    raise exception 'anonymous readers must not see neighbor interactions';
  end if;
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000003', false);
do $$ begin
  if exists (select 1 from public.posts where id = 30000001) then
    raise exception 'unrelated residents must not see neighbor posts';
  end if;
end $$;
reset role;

-- A one-way follow and a pending reverse follow do not make neighbors.
insert into public.user_follows (follower_id, following_id, status, accepted_at) values
  ('30000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'accepted', now()),
  ('30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'pending', null);

set role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000002', false);
do $$ begin
  if exists (select 1 from public.posts where id in (30000001, 30000004)) then
    raise exception 'one-way or pending follow must not unlock neighbor posts';
  end if;
end $$;
reset role;

update public.user_follows
set status = 'accepted', accepted_at = now()
where follower_id = '30000000-0000-0000-0000-000000000001'
  and following_id = '30000000-0000-0000-0000-000000000002';

set role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000002', false);
do $$ begin
  if not exists (select 1 from public.posts where id = 30000001)
     or exists (select 1 from public.posts where id = 30000004) then
    raise exception 'accepted mutual follow must unlock published posts only';
  end if;
  if not exists (select 1 from public.comments where post_id = 30000001)
     or not exists (select 1 from public.post_likes where post_id = 30000001)
     or not exists (select 1 from public.comment_likes) then
    raise exception 'eligible neighbor must see post interactions';
  end if;
end $$;
reset role;

delete from public.user_follows
where follower_id = '30000000-0000-0000-0000-000000000001'
  and following_id = '30000000-0000-0000-0000-000000000002';

set role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000002', false);
do $$ begin
  if exists (select 1 from public.posts where id = 30000001)
     or exists (select 1 from public.comments where post_id = 30000001)
     or exists (select 1 from public.post_likes where post_id = 30000001)
     or exists (select 1 from public.comment_likes) then
    raise exception 'unfollow must revoke neighbor access immediately';
  end if;
end $$;
do $$ begin
  begin
    insert into public.post_likes (post_id, user_id)
    values (30000001, '30000000-0000-0000-0000-000000000002');
    raise exception 'former neighbor must not be able to like a revoked post';
  exception when insufficient_privilege then null;
  end;
end $$;
do $$ begin
  begin
    insert into public.comments (post_id, author_id, content)
    values (30000001, '30000000-0000-0000-0000-000000000002', 'Should fail');
    raise exception 'former neighbor must not be able to comment on a revoked post';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', false);
do $$ begin
  if (select count(*) from public.posts where id in (30000001, 30000004)) <> 2 then
    raise exception 'author must keep access to own neighbor posts and drafts';
  end if;
end $$;
reset role;

do $$ begin
  begin
    insert into public.posts (id, author_id, title, content, slug, type, status, visibility)
    values (30000005, '30000000-0000-0000-0000-000000000001', '带图故事', '![](https://example.com/photo.png)', 'neighbor-image-test', 'article', 'published', 'neighbors');
    raise exception 'neighbor image should have been rejected';
  exception when check_violation then null;
  end;
end $$;

do $$ begin
  begin
    update public.posts set content = '![](https://example.com/photo.png)' where id = 30000001;
    raise exception 'adding an image to a neighbor post should have been rejected';
  exception when check_violation then null;
  end;
end $$;

rollback;
