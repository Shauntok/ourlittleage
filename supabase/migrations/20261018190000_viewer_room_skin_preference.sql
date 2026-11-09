begin;

alter table public.profiles
  add column room_view_skin text
  check (room_view_skin in ('modern_pixel', 'classic'));

comment on column public.profiles.room_view_skin is
  'Visual skin selected by the profile owner for viewing resident rooms.';

commit;
