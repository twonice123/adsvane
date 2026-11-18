-- Two-step login: once an owner turns it on, changes to their business need a session that passed the code step (aal2).
create or replace function public.mfa_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors f where f.user_id = (select auth.uid()) and f.status = 'verified');
$$;
revoke all on function public.mfa_ok() from public, anon;
grant execute on function public.mfa_ok() to authenticated;

do $$
declare t text;
begin
  foreach t in array array['businesses','business_photos','promotions','audiences'] loop
    execute format('create policy mfa_guard_ins on public.%I as restrictive for insert to authenticated with check (public.mfa_ok())', t);
    execute format('create policy mfa_guard_upd on public.%I as restrictive for update to authenticated using (public.mfa_ok()) with check (public.mfa_ok())', t);
    execute format('create policy mfa_guard_del on public.%I as restrictive for delete to authenticated using (public.mfa_ok())', t);
  end loop;
end $$;
