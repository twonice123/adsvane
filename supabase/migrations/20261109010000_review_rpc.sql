-- Customers no longer need a login to leave a review: the review page creates
-- the customer record by email. A customer can later sign in by email and the
-- account is linked through user_id.
--
-- The first versions of customers/reviews (both empty) are moved to the
-- "unused" schema rather than dropped; they can be deleted at any time with
-- `drop schema unused cascade;`.

create schema if not exists unused;
revoke all on schema unused from public, anon, authenticated;
alter table public.reviews set schema unused;
alter table public.customers set schema unused;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  first_name text not null check (char_length(first_name) between 1 and 60),
  email extensions.citext not null unique,
  zip text,
  email_opt_in boolean not null default false,
  opt_in_at timestamptz,
  unsubscribed_at timestamptz,
  unsubscribe_token uuid not null unique default gen_random_uuid(),
  last_promo_email_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  first_name text not null,
  stars smallint not null check (stars between 1 and 5),
  body text check (char_length(body) <= 1000),
  created_at timestamptz not null default now(),
  unique (business_id, customer_id)
);
create index reviews_business_idx on public.reviews(business_id, created_at desc);
create index reviews_customer_idx on public.reviews(customer_id);

create or replace view public.business_ratings with (security_invoker = true) as
  select business_id, count(*)::int as review_count, round(avg(stars)::numeric, 1) as rating
  from public.reviews group by business_id;

alter table public.customers enable row level security;
alter table public.reviews enable row level security;

-- Businesses never see customers' emails: there is no public read on customers.
create policy "Customers read own account" on public.customers for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Customers update own account" on public.customers for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Reviews are public" on public.reviews for select using (true);

-- Leave a review. Creates (or reuses) the customer by email. Runs with owner
-- rights so anonymous visitors can call it, but it only ever writes these rows.
create function public.submit_review(
  p_business_slug text,
  p_stars int,
  p_body text,
  p_first_name text,
  p_email text,
  p_email_opt_in boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_business uuid;
  v_customer uuid;
  v_review uuid;
  v_email text := lower(trim(p_email));
  v_name text := trim(p_first_name);
begin
  if p_stars is null or p_stars < 1 or p_stars > 5 then
    raise exception 'Pick between 1 and 5 stars.' using errcode = '22023';
  end if;
  if v_name is null or v_name = '' or char_length(v_name) > 60 then
    raise exception 'Enter your first name.' using errcode = '22023';
  end if;
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a valid email address.' using errcode = '22023';
  end if;
  if char_length(coalesce(p_body, '')) > 1000 then
    raise exception 'Keep your review under 1000 characters.' using errcode = '22023';
  end if;

  select id into v_business from public.businesses where slug = p_business_slug;
  if v_business is null then
    raise exception 'Business not found.' using errcode = 'P0002';
  end if;

  insert into public.customers (first_name, email, email_opt_in, opt_in_at)
  values (v_name, v_email, coalesce(p_email_opt_in, false),
          case when p_email_opt_in then now() end)
  on conflict (email) do update set
    first_name = excluded.first_name,
    -- Ticking the box turns emails on; leaving it unticked never turns them off.
    email_opt_in = public.customers.email_opt_in or excluded.email_opt_in,
    opt_in_at = coalesce(public.customers.opt_in_at, excluded.opt_in_at),
    unsubscribed_at = case when excluded.email_opt_in then null else public.customers.unsubscribed_at end
  returning id into v_customer;

  insert into public.reviews (business_id, customer_id, first_name, stars, body)
  values (v_business, v_customer, v_name, p_stars, nullif(trim(p_body), ''))
  on conflict (business_id, customer_id) do update set
    stars = excluded.stars, body = excluded.body, first_name = excluded.first_name, created_at = now()
  returning id into v_review;

  return v_review;
end $$;
revoke all on function public.submit_review(text, int, text, text, text, boolean) from public;
grant execute on function public.submit_review(text, int, text, text, text, boolean) to anon, authenticated;

-- One-click unsubscribe from the link in every email.
create function public.unsubscribe(p_token uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.customers set email_opt_in = false, unsubscribed_at = now()
  where unsubscribe_token = p_token;
  return found;
end $$;
revoke all on function public.unsubscribe(uuid) from public;
grant execute on function public.unsubscribe(uuid) to anon, authenticated;

-- Opted-in customer count, so owners can see reach without seeing any emails.
create function public.optin_count() returns int
language sql security definer set search_path = '' stable as $$
  select count(*)::int from public.customers where email_opt_in;
$$;
revoke all on function public.optin_count() from public;
grant execute on function public.optin_count() to anon, authenticated;
