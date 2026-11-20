"use server";
import { createClient as plainClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/auth";
import { PHOTO_BUCKET } from "@/lib/data";

// Pause or un-pause: a paused account is hidden from search, business pages and the billboard.
export async function setPaused(paused: boolean): Promise<{ paused?: boolean; error?: string }> {
  const supabase = await createClient();
  const me = await getMe(supabase);
  if (!me) return { error: "Please log in again." };
  const { error } = paused
    ? await supabase.from("account_pauses").upsert({ user_id: me.id }, { onConflict: "user_id", ignoreDuplicates: true })
    : await supabase.from("account_pauses").delete().eq("user_id", me.id);
  if (error) return { error: "Couldn't update your account. Please try again." };
  revalidatePath("/", "layout");
  return { paused };
}

// Delete for good, after checking the email and password again.
export async function deleteAccount(email: string, password: string): Promise<{ ok?: true; error?: string }> {
  const supabase = await createClient();
  const me = await getMe(supabase);
  if (!me) return { error: "Please log in again." };
  const e = String(email ?? "").trim().toLowerCase();
  if (!e || e !== (me.email || "").toLowerCase()) return { error: "That isn't the email on this account." };
  // Check the password with a separate, throwaway sign-in so this session isn't changed.
  const check = plainClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: pwErr } = await check.auth.signInWithPassword({ email: e, password: String(password ?? "") });
  if (pwErr) return { error: pwErr.status === 429 ? "Too many tries. Wait a minute and try again." : "Wrong password. If you never set one, set a password above first." };
  await check.auth.signOut().catch(() => {});

  // Photos and videos in storage, then the businesses (their posts, reviews and promotions go with them).
  const { data: biz } = await supabase.from("businesses").select("id").eq("owner_id", me.id);
  for (const b of (biz as { id: string }[]) || []) {
    const { data: files } = await supabase.storage.from(PHOTO_BUCKET).list(b.id, { limit: 1000 });
    const paths = ((files as { name: string }[]) || []).map((f) => `${b.id}/${f.name}`);
    if (paths.length) await supabase.storage.from(PHOTO_BUCKET).remove(paths);
  }
  const { error: bizErr } = await supabase.from("businesses").delete().eq("owner_id", me.id);
  if (bizErr) return { error: "Couldn't delete your business pages. Please try again." };
  await Promise.all([
    supabase.from("social_connections").delete().eq("user_id", me.id),
    supabase.from("business_saves").delete().eq("user_id", me.id),
    supabase.from("photo_likes").delete().eq("user_id", me.id),
    supabase.from("photo_saves").delete().eq("user_id", me.id),
    supabase.from("photo_reposts").delete().eq("user_id", me.id),
    supabase.from("photo_comments").delete().eq("user_id", me.id),
    supabase.from("account_pauses").delete().eq("user_id", me.id),
  ]);
  const { error } = await supabase.rpc("close_my_account");
  if (error) return { error: "Couldn't delete your account. Please try again." };
  await supabase.auth.signOut().catch(() => {});
  return { ok: true };
}
