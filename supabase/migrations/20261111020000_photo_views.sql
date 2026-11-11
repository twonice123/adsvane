-- Count who opens each photo: once per signed-in person, or once per browser for visitors.
alter table public.business_photos add column if not exists view_count integer not null default 0;

create table if not exists public.photo_views (
  photo_id uuid not null references public.business_photos(id) on delete cascade,
  viewer_key text not null,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_id, viewer_key)
);
create index if not exists photo_views_photo_idx on public.photo_views(photo_id, created_at desc);
alter table public.photo_views enable row level security;
-- No direct access; only through the functions below.

create or replace function public.note_view(p_photo uuid, p_key text) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_owner uuid; v_me uuid := auth.uid(); v_key text; v_n integer;
begin
  select b.owner_id into v_owner from public.business_photos p join public.businesses b on b.id = p.business_id where p.id = p_photo;
  if v_owner is null then return null; end if;
  if v_me is not null and v_me = v_owner then
    select view_count into v_n from public.business_photos where id = p_photo;
    return v_n;
  end if;
  v_key := case when v_me is not null then 'u:' || v_me::text else 'b:' || left(coalesce(nullif(p_key, ''), 'none'), 64) end;
  insert into public.photo_views (photo_id, viewer_key, user_id) values (p_photo, v_key, v_me) on conflict do nothing;
  if found then
    update public.business_photos set view_count = view_count + 1 where id = p_photo returning view_count into v_n;
  else
    select view_count into v_n from public.business_photos where id = p_photo;
  end if;
  return v_n;
end $$;
grant execute on function public.note_view(uuid, text) to anon, authenticated;

-- For the owner: who viewed a photo (names of signed-in viewers, newest first).
create or replace function public.photo_viewers(p_photo uuid)
returns table (name text, viewed_at timestamptz, signed_in boolean)
language sql stable security definer set search_path = '' as $$
  select case when v.user_id is null then 'Visitor' else public.member_name(v.user_id) end, v.created_at, v.user_id is not null
  from public.photo_views v
  join public.business_photos p on p.id = v.photo_id
  join public.businesses b on b.id = p.business_id
  where v.photo_id = p_photo and b.owner_id = auth.uid()
  order by v.created_at desc
  limit 200;
$$;
grant execute on function public.photo_viewers(uuid) to authenticated;
