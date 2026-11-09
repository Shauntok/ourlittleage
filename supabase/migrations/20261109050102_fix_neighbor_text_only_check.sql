begin;

-- The earlier neighbor guard used a double escaped Markdown pattern. Match a
-- literal image opener and closer so neighbor-only posts remain text-only.
alter table public.posts drop constraint if exists neighbor_posts_text_only;
alter table public.posts add constraint neighbor_posts_text_only check (
  visibility is distinct from 'neighbors'
  or (
    content !~* '!\[[^]]*\]'
    and content !~* '<[[:space:]]*img'
    and content !~* '/storage/v1/(object|render/image)/public/images/'
  )
);

commit;
