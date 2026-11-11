import type { SupabaseClient } from "@supabase/supabase-js";

// Who is signed in. Checks the sign-in token locally when it can, which is
// much quicker than asking the Supabase auth server on every page.
export async function getMe(supabase: SupabaseClient): Promise<{ id: string; email: string } | null> {
  try {
    const { data } = await supabase.auth.getClaims();
    const c = data?.claims;
    return c?.sub ? { id: String(c.sub), email: String(c.email ?? "") } : null;
  } catch {
    return null;
  }
}
