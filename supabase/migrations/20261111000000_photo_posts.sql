-- Photos work like posts: a caption written before posting, hide from profile,
-- and visitors can like, save and repost them.
alter table public.business_photos add column if not exists hidden boolean not null default false;
alter table public.business_photos add column if not exists post_text text
  check (post_text is null or char_length(post_text) <= 2200);

create table if not exists public.photo_likes (
  photo_id uuid not null references public.business_photos(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_id, user_id)
);
create table if not exists public.photo_saves (
  photo_id uuid not null references public.business_photos(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_id, user_id)
);
create table if not exists public.photo_reposts (
  photo_id uuid not null references public.business_photos(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_id, user_id)
);
create index if not exists photo_likes_user_idx on public.photo_likes(user_id, created_at desc);
create index if not exists photo_saves_user_idx on public.photo_saves(user_id, created_at desc);
create index if not exists photo_reposts_user_idx on public.photo_reposts(user_id, created_at desc);

alter table public.photo_likes enable row level security;
alter table public.photo_saves enable row level security;
alter table public.photo_reposts enable row level security;

-- Likes and reposts are public (counts, and reposts show on the person's page). Saves are private.
create policy "Likes are public" on public.photo_likes for select using (true);
create policy "People like as themselves" on public.photo_likes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "People unlike their own" on public.photo_likes for delete to authenticated using ((select auth.uid()) = user_id);

create policy "People see own saves" on public.photo_saves for select to authenticated using ((select auth.uid()) = user_id);
create policy "People save as themselves" on public.photo_saves for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "People unsave their own" on public.photo_saves for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Reposts are public" on public.photo_reposts for select using (true);
create policy "People repost as themselves" on public.photo_reposts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "People undo their own reposts" on public.photo_reposts for delete to authenticated using ((select auth.uid()) = user_id);

-- The name shown on someone's page: their first name from a review, else their business name.
create or replace function public.member_name(p_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select c.first_name from public.customers c where c.id = p_user),
    (select b.name from public.businesses b where b.owner_id = p_user order by b.created_at limit 1),
    'AdsVane member'
  );
$$;
grant execute on function public.member_name(uuid) to anon, authenticated;
