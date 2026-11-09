-- How the owner framed their cover and profile picture: "x y zoom",
-- x and y in percent (0-100), zoom 1-3. Null means centered, no zoom.
alter table public.businesses
  add column if not exists cover_focus text check (cover_focus is null or cover_focus ~ '^\d{1,3}(\.\d+)? \d{1,3}(\.\d+)? [1-3](\.\d+)?$'),
  add column if not exists logo_focus text check (logo_focus is null or logo_focus ~ '^\d{1,3}(\.\d+)? \d{1,3}(\.\d+)? [1-3](\.\d+)?$');
