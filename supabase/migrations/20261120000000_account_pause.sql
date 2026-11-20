-- Pausing an account hides it (business pages, posts, member page) until it is turned back on.
create table if not exists public.account_pauses (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  paused_at timestamptz not null default now()
);
alter table public.account_pauses enable row level security;
create policy "See own pause" on public.account_pauses for select to authenticated using (user_id = (select auth.uid()));
create policy "Pause own account" on public.account_pauses for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Unpause own account" on public.account_pauses for delete to authenticated using (user_id = (select auth.uid()));
grant select, insert, delete on public.account_pauses to authenticated;

create or replace function public.is_paused(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.account_pauses where user_id = p_user);
$$;
grant execute on function public.is_paused(uuid) to anon, authenticated;

create or replace function public.business_visible(p_business uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.businesses b
    where b.id = p_business
      and (b.owner_id = (select auth.uid()) or not exists (select 1 from public.account_pauses p where p.user_id = b.owner_id))
  );
$$;
grant execute on function public.business_visible(uuid) to anon, authenticated;

alter policy "Listings are public" on public.businesses
  using (owner_id = (select auth.uid()) or not public.is_paused(owner_id));
alter policy "Photos are public" on public.business_photos
  using (public.business_visible(business_id));

-- Closing an account: the website first removes the person's businesses, posts and activity
-- (through their own permissions), then this turns the login off for good and frees the email.
create or replace function public.close_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Please log in first.' using errcode = '28000'; end if;
  update public.customers
     set user_id = null, first_name = 'Former member', email = 'closed-' || id::text || '@closed.invalid', zip = null, email_opt_in = false
   where user_id = uid;
  update auth.users
     set email = 'closed-' || uid::text || '@closed.invalid', banned_until = 'infinity', raw_user_meta_data = '{}'::jsonb, phone = null
   where id = uid;
end $$;
revoke all on function public.close_my_account() from public, anon;
grant execute on function public.close_my_account() to authenticated;
