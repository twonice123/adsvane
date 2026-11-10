-- Map location of each business, worked out from its address, so search
-- can show how many miles away it is.
alter table public.businesses add column if not exists lat double precision;
alter table public.businesses add column if not exists lng double precision;
alter table public.businesses add column if not exists located_from text;
