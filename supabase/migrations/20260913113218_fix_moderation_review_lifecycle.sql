begin;

alter table public.comment_moderation_flags
drop constraint comment_moderation_flags_reviewed_by_fkey;

commit;
