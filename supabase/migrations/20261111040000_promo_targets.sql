-- Promotion targeting: many places (address/city with a radius up to 60 miles),
-- whole states, or the whole United States; an age range; and chosen ad photos.
alter table public.promotions
  add column if not exists targets jsonb,
  add column if not exists age_min smallint check (age_min between 13 and 99),
  add column if not exists age_max smallint check (age_max between 13 and 99),
  add column if not exists photo_ids uuid[] not null default '{}';
alter table public.promotions add constraint promotions_age_order check (age_min is null or age_max is null or age_min <= age_max);
alter table public.promotions add constraint promotions_targets_size check (targets is null or (jsonb_typeof(targets) = 'array' and jsonb_array_length(targets) between 1 and 25));
alter table public.promotions add constraint promotions_photos_size check (cardinality(photo_ids) <= 5);
