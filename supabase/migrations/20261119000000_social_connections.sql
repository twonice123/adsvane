-- Facebook Pages / Instagram accounts a business owner connected, to share posts there too.
create table if not exists public.social_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  provider text not null check (provider in ('facebook', 'instagram', 'tiktok')),
  account_id text not null,
  account_name text,
  access_token text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, provider, account_id)
);
alter table public.social_connections enable row level security;
create policy "Owners see own connections" on public.social_connections for select to authenticated using (user_id = (select auth.uid()));
create policy "Owners add own connections" on public.social_connections for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Owners update own connections" on public.social_connections for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Owners remove own connections" on public.social_connections for delete to authenticated using (user_id = (select auth.uid()));
-- The page's private key is never sent to the browser: only these columns can be read.
revoke all on public.social_connections from anon, authenticated;
grant select (id, user_id, provider, account_id, account_name, expires_at, created_at) on public.social_connections to authenticated;
grant insert (user_id, provider, account_id, account_name, access_token, expires_at) on public.social_connections to authenticated;
grant update (account_name, access_token, expires_at) on public.social_connections to authenticated;
grant delete on public.social_connections to authenticated;

-- Server-side only use when sharing a post: the owner's own token for one account.
create or replace function public.social_token(p_provider text, p_account text)
returns text language sql stable security definer set search_path = '' as $$
  select access_token from public.social_connections
  where user_id = auth.uid() and provider = p_provider and account_id = p_account;
$$;
revoke all on function public.social_token(text, text) from public, anon;
grant execute on function public.social_token(text, text) to authenticated;
