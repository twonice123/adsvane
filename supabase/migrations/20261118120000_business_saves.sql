-- Customers can save their favorite business pages.
create table if not exists public.business_saves (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, business_id)
);
create index if not exists business_saves_business_idx on public.business_saves (business_id);
alter table public.business_saves enable row level security;
create policy "See own saved businesses" on public.business_saves for select to authenticated using (user_id = (select auth.uid()));
create policy "Save a business" on public.business_saves for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Unsave a business" on public.business_saves for delete to authenticated using (user_id = (select auth.uid()));
grant select, insert, delete on public.business_saves to authenticated;
