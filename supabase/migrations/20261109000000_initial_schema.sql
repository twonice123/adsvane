-- AdsVane initial schema: businesses, customers, reviews, promotions.

create extension if not exists citext with schema extensions;

-- Businesses: free listings, owned by a signed-in owner.
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 1 and 120),
  category text not null,
  description text check (char_length(description) <= 2000),
  phone text,
  website text,
  street text,
  city text not null,
  state text not null check (char_length(state) = 2),
  zip text,
  show_address boolean not null default true,
  service_area text,
  logo_url text,
  hours jsonb not null default '{}'::jsonb,
  amenities text[] not null default '{}',
  social jsonb not null default '{}'::jsonb,
  services jsonb not null default '[]'::jsonb,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index businesses_owner_idx on public.businesses(owner_id);
create index businesses_city_idx on public.businesses(state, city, category);

-- Customers: one row per AdsVane customer account (created from the review page).
-- Emails are never visible to businesses.
create table public.customers (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 60),
  email extensions.citext not null unique,
  zip text,
  email_opt_in boolean not null default false,
  opt_in_at timestamptz,
  unsubscribed_at timestamptz,
  last_promo_email_at timestamptz,
  created_at timestamptz not null default now()
);

-- Reviews: one per customer per business.
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

-- Promotions: paid "Promote profile" campaigns.
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  daily_budget_cents integer not null check (daily_budget_cents >= 500),
  days smallint not null check (days in (3, 7, 14, 30)),
  radius_miles smallint not null check (radius_miles between 2 and 30),
  show_in_search boolean not null default true,
  show_in_email boolean not null default false,
  status text not null default 'active' check (status in ('active', 'stopped', 'completed')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (show_in_search or show_in_email)
);
create index promotions_business_idx on public.promotions(business_id);
create index promotions_active_idx on public.promotions(status, ends_at);

-- Public rating summary per business.
create view public.business_ratings with (security_invoker = true) as
  select business_id, count(*)::int as review_count, round(avg(stars)::numeric, 1) as rating
  from public.reviews group by business_id;

-- updated_at trigger
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger businesses_touch before update on public.businesses
  for each row execute function public.touch_updated_at();

-- Row level security
alter table public.businesses enable row level security;
alter table public.customers enable row level security;
alter table public.reviews enable row level security;
alter table public.promotions enable row level security;

create policy "Listings are public" on public.businesses for select using (true);
create policy "Owners add listings" on public.businesses for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "Owners edit listings" on public.businesses for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Owners delete listings" on public.businesses for delete to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Customers read own account" on public.customers for select to authenticated
  using ((select auth.uid()) = id);
create policy "Customers create own account" on public.customers for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "Customers update own account" on public.customers for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Reviews are public" on public.reviews for select using (true);
create policy "Customers post own reviews" on public.reviews for insert to authenticated
  with check ((select auth.uid()) = customer_id);
create policy "Customers edit own reviews" on public.reviews for update to authenticated
  using ((select auth.uid()) = customer_id) with check ((select auth.uid()) = customer_id);
create policy "Customers delete own reviews" on public.reviews for delete to authenticated
  using ((select auth.uid()) = customer_id);

create policy "Running promotions are public" on public.promotions for select
  using (status = 'active' and ends_at > now());
create policy "Owners see own promotions" on public.promotions for select to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));
create policy "Owners start promotions" on public.promotions for insert to authenticated
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));
create policy "Owners stop promotions" on public.promotions for update to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));
