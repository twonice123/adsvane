-- Shared sound library: songs people add while posting can be searched and reused by others.
create table if not exists public.sounds (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  added_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  added_name text,
  path text not null,
  url text not null,
  seconds real,
  uses integer not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists sounds_uses_idx on public.sounds (uses desc, created_at desc);
alter table public.sounds enable row level security;
create policy "Sounds are public" on public.sounds for select using (not hidden or added_by = (select auth.uid()));
create policy "Members add sounds" on public.sounds for insert to authenticated with check (added_by = (select auth.uid()));
create policy "Members edit own sounds" on public.sounds for update to authenticated using (added_by = (select auth.uid())) with check (added_by = (select auth.uid()));
grant select on public.sounds to anon, authenticated;
grant insert, update on public.sounds to authenticated;

-- Count a use when someone posts with a sound.
create or replace function public.use_sound(sound uuid) returns void
language sql security definer set search_path = public as $$
  update public.sounds set uses = uses + 1 where id = sound and auth.uid() is not null;
$$;
revoke all on function public.use_sound(uuid) from public;
grant execute on function public.use_sound(uuid) to authenticated;

-- Audio files live in their own public bucket, one folder per member.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sounds', 'sounds', true, 15728640, array['audio/mpeg','audio/mp3','audio/mp4','audio/x-m4a','audio/m4a','audio/aac','audio/wav','audio/x-wav','audio/ogg','audio/webm','audio/flac'])
on conflict (id) do nothing;
create policy "Members upload own sounds" on storage.objects for insert to authenticated
  with check (bucket_id = 'sounds' and (storage.foldername(name))[1] = (select auth.uid())::text);
