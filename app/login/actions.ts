"use server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/data";

export async function sendLink(email: string, next: string): Promise<{ error?: string }> {
  const e = String(email ?? "").trim().slice(0, 200);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return { error: "Enter a valid email address." };
  const safeNext = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  const origin = host ? `${proto}://${host}` : siteUrl();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: e,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}` },
  });
  if (error) return { error: error.status === 429 ? "Too many tries. Wait a minute and try again." : "We couldn't send the link. Please try again." };
  return {};
}

// "Forgot password?": email a link that signs them in and opens the page to pick a new password.
export async function sendReset(email: string): Promise<{ error?: string }> {
  const e = String(email ?? "").trim().toLowerCase().slice(0, 200);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return { error: "Enter a valid email address." };
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  const origin = host ? `${proto}://${host}` : siteUrl();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(e, { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}` });
  // Same answer whether or not the email has an account, so nobody can fish for accounts.
  if (error?.status === 429) return { error: "Too many tries. Wait a minute and try again." };
  return {};
}

// Settings: change the login email. The new address gets a link to confirm it.
export async function changeEmail(email: string): Promise<{ ok?: string; error?: string }> {
  const e = String(email ?? "").trim().toLowerCase().slice(0, 200);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return { error: "Enter a valid email address." };
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  const origin = host ? `${proto}://${host}` : siteUrl();
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { error: "Please log in again." };
  if (u.user.email?.toLowerCase() === e) return { error: "That's already your email." };
  const { error } = await supabase.auth.updateUser({ email: e }, { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/settings?email=changed")}` });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) return { error: "Another account already uses that email." };
    if (error.status === 429) return { error: "Too many tries. Wait a minute and try again." };
    return { error: "We couldn't change your email. Please try again." };
  }
  return { ok: `We sent a link to ${e}. Tap it to confirm, and your login email will change.` };
}
