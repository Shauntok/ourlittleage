begin;

-- The existing images bucket is public. Until neighbor-only media is served
-- through a private path, reject embedded image syntax and public image URLs.
alter table public.posts
  add constraint neighbor_posts_text_only check (
    visibility is distinct from 'neighbors'
    or (
      content !~* '!\[[^]]*\]'
      and content !~* '<[[:space:]]*img'
      and content !~* '/storage/v1/(object|render/image)/public/images/'
    )
  );

-- A neighbor is a resident with two accepted follow relationships. Keep the
-- existing unlisted policy intact so previously shared links do not change.
drop policy if exists "Authenticated can read posts safely" on public.posts;
create policy "Authenticated can read posts safely"
on public.posts for select to authenticated
using (
  (status = 'published' and visibility in ('public', 'unlisted') and deleted_at is null)
  or (
    status = 'published' and visibility = 'neighbors' and deleted_at is null
    and exists (
      select 1
      from public.user_follows outbound
      join public.user_follows inbound
        on inbound.follower_id = posts.author_id
       and inbound.following_id = (select auth.uid())
       and inbound.status = 'accepted'
      where outbound.follower_id = (select auth.uid())
        and outbound.following_id = posts.author_id
        and outbound.status = 'accepted'
    )
  )
  or author_id = (select auth.uid())
  or private.is_admin_role()
);

-- Interactions follow the parent post's read policy. In particular, changing a
-- public post to neighbors must not leave its old comments or likes public.
drop policy if exists "Anonymous can read visible comments" on public.comments;
create policy "Anonymous can read visible comments"
on public.comments for select to anon
using (
  is_deleted = false and is_hidden = false
  and exists (select 1 from public.posts p where p.id = post_id)
);
drop policy if exists "Authenticated can read comments safely" on public.comments;
create policy "Authenticated can read comments safely"
on public.comments for select to authenticated
using (
  (exists (select 1 from public.posts p where p.id = post_id)
   and ((is_deleted = false and is_hidden = false)
     or author_id = (select auth.uid())))
  or private.is_admin_role()
);

drop policy if exists "Active users can create comments" on public.comments;
create policy "Active users can create comments"
on public.comments for insert to authenticated
with check (
  author_id = (select auth.uid())
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and status in ('active', 'warned')
  )
  and exists (
    select 1 from public.posts p
    where p.id = post_id and p.status = 'published'
      and p.visibility in ('public', 'unlisted', 'neighbors')
      and p.deleted_at is null
  )
);

drop policy if exists "Anonymous can read active post likes" on public.post_likes;
create policy "Anonymous can read active post likes"
on public.post_likes for select to anon
using (is_active = true and exists (select 1 from public.posts p where p.id = post_id));
drop policy if exists "Authenticated can read active or own post likes" on public.post_likes;
create policy "Authenticated can read active or own post likes"
on public.post_likes for select to authenticated
using (
  exists (select 1 from public.posts p where p.id = post_id)
  and (is_active = true or user_id = (select auth.uid()))
);
drop policy if exists "Active users can like posts" on public.post_likes;
create policy "Active users can like posts"
on public.post_likes for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.profiles where id = (select auth.uid()) and status in ('active', 'warned'))
  and exists (
    select 1 from public.posts p
    where p.id = post_id and p.author_id <> (select auth.uid())
      and p.status = 'published' and p.deleted_at is null
      and p.visibility in ('public', 'unlisted', 'neighbors')
  )
);

drop policy if exists "Anonymous can read active comment likes" on public.comment_likes;
create policy "Anonymous can read active comment likes"
on public.comment_likes for select to anon
using (is_active = true and exists (select 1 from public.comments c where c.id = comment_id));
drop policy if exists "Authenticated can read active or own comment likes" on public.comment_likes;
create policy "Authenticated can read active or own comment likes"
on public.comment_likes for select to authenticated
using (
  exists (select 1 from public.comments c where c.id = comment_id)
  and (is_active = true or user_id = (select auth.uid()))
);
drop policy if exists "Active users can like comments" on public.comment_likes;
create policy "Active users can like comments"
on public.comment_likes for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.profiles where id = (select auth.uid()) and status in ('active', 'warned'))
  and exists (
    select 1 from public.comments c
    join public.posts p on p.id = c.post_id
    where c.id = comment_id and c.author_id <> (select auth.uid())
      and c.is_deleted = false and c.is_hidden = false
      and p.status = 'published' and p.deleted_at is null
      and p.visibility in ('public', 'unlisted', 'neighbors')
  )
);

commit;
