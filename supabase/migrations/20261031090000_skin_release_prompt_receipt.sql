begin;

alter table public.profiles
  add column if not exists last_skin_release_prompt_id text;

alter table public.profiles
  add constraint profiles_last_skin_release_prompt_id_length
  check (last_skin_release_prompt_id is null or char_length(last_skin_release_prompt_id) <= 64);

comment on column public.profiles.last_skin_release_prompt_id is
  'Most recent formally released skin whose one-time home prompt was claimed by this resident.';

commit;
