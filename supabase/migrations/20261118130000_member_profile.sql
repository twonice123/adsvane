-- A customer creating their AdsVane profile after sign up: first name and ZIP.
create or replace function public.save_member_profile(p_first_name text, p_zip text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  em text;
  fname text := left(btrim(coalesce(p_first_name, '')), 60);
  z text := nullif(left(btrim(coalesce(p_zip, '')), 10), '');
begin
  if uid is null then raise exception 'Please log in first.' using errcode = '28000'; end if;
  if char_length(fname) < 1 then raise exception 'Enter your first name.' using errcode = '22023'; end if;
  select email into em from auth.users where id = uid;
  update public.customers set first_name = fname, zip = coalesce(z, zip) where user_id = uid;
  if found then return; end if;
  -- Someone who left a review with this email before: link that record to this login.
  update public.customers set user_id = uid, first_name = fname, zip = coalesce(z, zip) where email = em and user_id is null;
  if found then return; end if;
  insert into public.customers (user_id, first_name, email, zip) values (uid, fname, em, z);
end $$;
revoke all on function public.save_member_profile(text, text) from public, anon;
grant execute on function public.save_member_profile(text, text) to authenticated;

create or replace function public.member_name(p_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select c.first_name from public.customers c where c.user_id = p_user or c.id = p_user limit 1),
    (select b.name from public.businesses b where b.owner_id = p_user order by b.created_at limit 1),
    'AdsVane member'
  );
$$;
