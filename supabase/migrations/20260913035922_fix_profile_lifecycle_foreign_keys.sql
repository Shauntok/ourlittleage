begin;

alter table public.notifications
drop constraint notifications_user_id_fkey;

alter table public.notifications
add constraint notifications_user_id_fkey
foreign key (user_id)
references public.profiles(id)
on delete cascade;

-- Permanent audit records retain immutable historical UUIDs after profile deletion.
alter table public.admin_logs
drop constraint admin_logs_admin_id_fkey;

alter table public.vip_membership_events
drop constraint vip_membership_events_user_id_fkey;

alter table public.vip_membership_events
drop constraint vip_membership_events_actor_id_fkey;

alter table public.reports
drop constraint reports_reporter_id_fkey;

alter table public.reports
alter column reporter_id drop not null;

alter table public.reports
add constraint reports_reporter_id_fkey
foreign key (reporter_id)
references public.profiles(id)
on delete set null;

alter table public.comment_moderation_keywords
drop constraint comment_moderation_keywords_created_by_fkey;

alter table public.comment_moderation_keywords
alter column created_by drop not null;

alter table public.comment_moderation_keywords
add constraint comment_moderation_keywords_created_by_fkey
foreign key (created_by)
references public.profiles(id)
on delete set null;

alter table public.comment_moderation_flags
drop constraint comment_moderation_flags_reviewed_by_fkey;

alter table public.comment_moderation_flags
add constraint comment_moderation_flags_reviewed_by_fkey
foreign key (reviewed_by)
references public.profiles(id)
on delete set null;

alter table public.growth_logs
drop constraint growth_logs_actor_id_fkey;

alter table public.growth_logs
add constraint growth_logs_actor_id_fkey
foreign key (actor_id)
references public.profiles(id)
on delete set null;

alter table public.posts
drop constraint posts_deleted_by_fkey;

alter table public.posts
add constraint posts_deleted_by_fkey
foreign key (deleted_by)
references public.profiles(id)
on delete set null;

alter table public.user_badges
drop constraint user_badges_user_id_fkey;

alter table public.user_badges
add constraint user_badges_user_id_fkey
foreign key (user_id)
references public.profiles(id)
on delete cascade;

alter table public.user_badges
drop constraint user_badges_assigned_by_fkey;

alter table public.user_badges
add constraint user_badges_assigned_by_fkey
foreign key (assigned_by)
references public.profiles(id)
on delete set null;

alter table public.vip_memberships
drop constraint vip_memberships_user_id_fkey;

alter table public.vip_memberships
add constraint vip_memberships_user_id_fkey
foreign key (user_id)
references public.profiles(id)
on delete cascade;

commit;
