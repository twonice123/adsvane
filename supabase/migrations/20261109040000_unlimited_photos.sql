-- No limit on how many work photos a business can add.
create or replace function public.limit_business_photos() returns trigger
language plpgsql set search_path = '' as $$
begin
  return new;
end $$;
