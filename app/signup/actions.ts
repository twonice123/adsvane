"use server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/data";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export type AuthResult = { ok?: true; error?: string; exists?: true; confirm?: true };

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : siteUrl();
}

// Create a business owner's login: email, then password. Like Instagram, they're signed in right away.
export async function createAccount(email: string, password: string): Promise<AuthResult> {
  const e = String(email ?? "").trim().toLowerCase().slice(0, 200);
  const p = String(password ?? "");
  if (!EMAIL.test(e)) return { error: "Enter a valid email address." };
  if (p.length < 8) return { error: "Use at least 8 characters for your password." };
  if (p.length > 72) return { error: "That password is too long. Use 72 characters or fewer." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: e,
    password: p,
    options: { emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent("/dashboard/new")}` },
  });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) return { exists: true, error: "There's already an account with this email. Log in instead." };
    if (/weak|pwned|password/i.test(error.message)) return { error: "Please pick a stronger password." };
    if (error.status === 429) return { error: "Too many tries. Wait a minute and try again." };
    return { error: "We couldn't create your account. Please try again." };
  }
  if (data.session) return { ok: true };
  // Email confirmation is switched on in Supabase: an existing email comes back with no identities.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0)
    return { exists: true, error: "There's already an account with this email. Log in instead." };
  const s = await supabase.auth.signInWithPassword({ email: e, password: p });
  if (!s.error) return { ok: true };
  return { confirm: true };
}

export async function logIn(email: string, password: string): Promise<AuthResult> {
  const e = String(email ?? "").trim().toLowerCase().slice(0, 200);
  const p = String(password ?? "");
  if (!EMAIL.test(e) || !p) return { error: "Enter your email and password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: e, password: p });
  if (!error) return { ok: true };
  if (/confirm/i.test(error.message)) return { confirm: true, error: "Please confirm your email first. Check your inbox for the link we sent." };
  if (error.status === 429) return { error: "Too many tries. Wait a minute and try again." };
  return { error: "Wrong email or password. If you used to sign in with an email link, tap “Email me a sign-in link” below." };
}
