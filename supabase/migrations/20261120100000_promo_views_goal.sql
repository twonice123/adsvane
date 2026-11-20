-- What the owner wants from an ad: more views of the promoted post, profile visits, or website visits.
-- (goal still says where a tap goes: the profile or the website.)
alter table public.promotions
  add column if not exists objective text not null default 'profile' check (objective in ('views', 'profile', 'website'));
