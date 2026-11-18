-- Business sign up works like Instagram: email + password and you're in, no "confirm your email" step.
-- (Same effect as switching off "Confirm email" in Supabase Auth, for password sign ups only.)
create or replace function public.auto_confirm_signup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email is not null and new.email_confirmed_at is null and coalesce(new.encrypted_password, '') <> '' then
    new.email_confirmed_at := now();
  end if;
  return new;
end $$;
revoke all on function public.auto_confirm_signup() from public, anon, authenticated;

create trigger auto_confirm_signup before insert on auth.users
for each row execute function public.auto_confirm_signup();
