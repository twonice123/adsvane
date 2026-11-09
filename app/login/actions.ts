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
