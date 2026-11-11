-- Comments on photos, and notifications for the business when people like,
-- repost, share or comment on its photos.
create table if not exists public.photo_comments (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.business_photos(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null default 'AdsVane member',
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists photo_comments_photo_idx on public.photo_comments(photo_id, created_at);
alter table public.photo_comments enable row level security;
create policy "Comments are public" on public.photo_comments for select using (true);
create policy "People comment as themselves" on public.photo_comments for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "People remove own comments, owners remove any on their photos" on public.photo_comments for delete to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (select 1 from public.business_photos p join public.businesses b on b.id = p.business_id
               where p.id = photo_id and b.owner_id = (select auth.uid()))
  );

-- The commenter's name is filled in by the database, so nobody can post as someone else.
create or replace function public.comment_name() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.name := public.member_name(new.user_id);
  return new;
end $$;
create trigger photo_comments_name before insert on public.photo_comments
  for each row execute function public.comment_name();

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient uuid not null references auth.users(id) on delete cascade,
  actor uuid references auth.users(id) on delete set null,
  actor_name text not null default 'Someone',
  kind text not null check (kind in ('like', 'repost', 'share', 'comment')),
  photo_id uuid references public.business_photos(id) on delete cascade,
  snippet text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_recipient_idx on public.notifications(recipient, created_at desc);
alter table public.notifications enable row level security;
create policy "People see own notifications" on public.notifications for select to authenticated
  using ((select auth.uid()) = recipient);
create policy "People mark own notifications read" on public.notifications for update to authenticated
  using ((select auth.uid()) = recipient) with check ((select auth.uid()) = recipient);

-- Tell the business owner. Skips the owner's own actions and repeat likes/reposts.
create or replace function public.notify_owner(p_photo uuid, p_actor uuid, p_kind text, p_snippet text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_owner uuid;
begin
  select b.owner_id into v_owner from public.business_photos p join public.businesses b on b.id = p.business_id where p.id = p_photo;
  if v_owner is null or v_owner = p_actor then return; end if;
  if p_kind in ('like', 'repost', 'share') and exists (
    select 1 from public.notifications n
    where n.recipient = v_owner and n.photo_id = p_photo and n.kind = p_kind
      and n.actor is not distinct from p_actor and n.created_at > now() - interval '1 day'
  ) then return; end if;
  insert into public.notifications (recipient, actor, actor_name, kind, photo_id, snippet)
  values (v_owner, p_actor, case when p_actor is null then 'Someone' else public.member_name(p_actor) end, p_kind, p_photo, left(p_snippet, 140));
end $$;
revoke execute on function public.notify_owner(uuid, uuid, text, text) from public, anon, authenticated;

create or replace function public.on_photo_like() returns trigger
language plpgsql security definer set search_path = '' as $$
begin perform public.notify_owner(new.photo_id, new.user_id, 'like', null); return new; end $$;
create trigger photo_likes_notify after insert on public.photo_likes for each row execute function public.on_photo_like();

create or replace function public.on_photo_repost() returns trigger
language plpgsql security definer set search_path = '' as $$
begin perform public.notify_owner(new.photo_id, new.user_id, 'repost', null); return new; end $$;
create trigger photo_reposts_notify after insert on public.photo_reposts for each row execute function public.on_photo_repost();

create or replace function public.on_photo_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin perform public.notify_owner(new.photo_id, new.user_id, 'comment', new.body); return new; end $$;
create trigger photo_comments_notify after insert on public.photo_comments for each row execute function public.on_photo_comment();

-- Shares happen in the phone's share sheet, so the page reports them here.
create or replace function public.note_share(p_photo uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin perform public.notify_owner(p_photo, auth.uid(), 'share', null); end $$;
grant execute on function public.note_share(uuid) to anon, authenticated;
