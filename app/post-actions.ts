"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PHOTO_BUCKET } from "@/lib/data";

// Likes, saves and reposts on photos, plus the owner's edit / hide / delete.

type Kind = "like" | "save" | "repost";
const TABLE: Record<Kind, string> = { like: "photo_likes", save: "photo_saves", repost: "photo_reposts" };
const UUID = /^[0-9a-f-]{36}$/i;

export async function toggle(kind: Kind, photoId: string, on: boolean): Promise<{ login?: true; error?: string }> {
  if (!TABLE[kind] || !UUID.test(photoId)) return { error: "Something went wrong." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { login: true };
  const t = supabase.from(TABLE[kind]);
  const { error } = on
    ? await t.upsert({ photo_id: photoId, user_id: user.id }, { onConflict: "photo_id,user_id", ignoreDuplicates: true })
    : await t.delete().eq("photo_id", photoId).eq("user_id", user.id);
  if (error) return { error: "Couldn't save that. Please try again." };
  revalidatePath("/me");
  revalidatePath(`/u/${user.id}`);
  return {};
}

async function ownPhoto(photoId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !UUID.test(photoId)) return null;
  const { data: photo } = await supabase.from("business_photos").select("id, business_id, path").eq("id", photoId).maybeSingle();
  if (!photo) return null;
  const { data: biz } = await supabase.from("businesses").select("id, slug").eq("id", photo.business_id).eq("owner_id", user.id).maybeSingle();
  return biz ? { supabase, photo: photo as { id: string; business_id: string; path: string }, biz: biz as { id: string; slug: string } } : null;
}
function refresh(b: { id: string; slug: string }) {
  revalidatePath(`/dashboard/${b.id}`);
  revalidatePath(`/b/${b.slug}`);
  revalidatePath("/find");
  revalidatePath("/me");
}

export async function editPhoto(photoId: string, changes: { text?: string; hidden?: boolean }): Promise<{ error?: string }> {
  const own = await ownPhoto(photoId);
  if (!own) return { error: "You can only change your own photos." };
  const row: Record<string, unknown> = {};
  if (typeof changes.text === "string") row.post_text = changes.text.trim().slice(0, 2200) || null;
  if (typeof changes.hidden === "boolean") row.hidden = changes.hidden;
  const { error } = await own.supabase.from("business_photos").update(row).eq("id", photoId).eq("business_id", own.biz.id);
  if (error) return { error: "Couldn't save. Please try again." };
  refresh(own.biz);
  return {};
}

export async function deletePhoto(photoId: string): Promise<{ error?: string }> {
  const own = await ownPhoto(photoId);
  if (!own) return { error: "You can only delete your own photos." };
  const { error } = await own.supabase.from("business_photos").delete().eq("id", photoId).eq("business_id", own.biz.id);
  if (error) return { error: "Couldn't delete. Please try again." };
  await own.supabase.storage.from(PHOTO_BUCKET).remove([own.photo.path]);
  refresh(own.biz);
  return {};
}
