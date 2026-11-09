-- Photos: a profile picture and a cover photo for each business, plus a
-- gallery of work photos. Files live in the public "business-photos" storage
-- bucket under a folder named after the business id, and only that
-- business's owner can add or remove files there.

alter table public.businesses
  add column if not exists cover_url text,
  add column if not exists contact_email text check (contact_email is null or char_length(contact_email) <= 200);

create table if not exists public.business_photos (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  path text not null unique,
  url text not null,
  caption text check (caption is null or char_length(caption) <= 140),
  created_at timestamptz not null default now()
);
create index if not exists business_photos_business_idx on public.business_photos(business_id, created_at desc);

alter table public.business_photos enable row level security;

create policy "Photos are public" on public.business_photos for select using (true);
create policy "Owners add photos" on public.business_photos for insert to authenticated
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));
create policy "Owners edit photos" on public.business_photos for update to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));
create policy "Owners remove photos" on public.business_photos for delete to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));

-- At most 30 gallery photos per business.
create function public.limit_business_photos() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.business_photos where business_id = new.business_id) >= 30 then
    raise exception 'You can have up to 30 photos.' using errcode = '22023';
  end if;
  return new;
end $$;
create trigger business_photos_limit before insert on public.business_photos
  for each row execute function public.limit_business_photos();

-- Storage bucket: public to view, images only, 5 MB per file.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-photos', 'business-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Owners upload business photos" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'business-photos'
    and exists (select 1 from public.businesses b
                where b.id::text = (storage.foldername(objects.name))[1] and b.owner_id = (select auth.uid()))
  );
create policy "Owners see own business photo files" on storage.objects for select to authenticated
  using (
    bucket_id = 'business-photos'
    and exists (select 1 from public.businesses b
                where b.id::text = (storage.foldername(objects.name))[1] and b.owner_id = (select auth.uid()))
  );
create policy "Owners remove business photos" on storage.objects for delete to authenticated
  using (
    bucket_id = 'business-photos'
    and exists (select 1 from public.businesses b
                where b.id::text = (storage.foldername(objects.name))[1] and b.owner_id = (select auth.uid()))
  );
