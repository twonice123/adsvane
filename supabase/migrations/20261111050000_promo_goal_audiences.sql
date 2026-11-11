-- Ad goal (visit profile or website), the audience's name, and saved audiences to reuse.
alter table public.promotions
  add column if not exists goal text not null default 'profile' check (goal in ('profile', 'website')),
  add column if not exists audience_name text check (char_length(audience_name) <= 60);

create table if not exists public.audiences (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  targets jsonb not null check (jsonb_typeof(targets) = 'array' and jsonb_array_length(targets) between 1 and 25),
  age_min smallint not null default 18 check (age_min between 18 and 65),
  created_at timestamptz not null default now(),
  unique (business_id, name)
);
create index if not exists audiences_business_idx on public.audiences(business_id);
alter table public.audiences enable row level security;
create policy "Owners manage own audiences" on public.audiences for all to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));
