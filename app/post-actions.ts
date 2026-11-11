"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PHOTO_BUCKET } from "@/lib/data";
import { getMe } from "@/lib/auth";

// Likes, saves and reposts on photos, plus the owner's edit / hide / delete.

type Kind = "like" | "save" | "repost";
const TABLE: Record<Kind, string> = { like: "photo_likes", save: "photo_saves", repost: "photo_reposts" };
const UUID = /^[0-9a-f-]{36}$/i;

export async function toggle(kind: Kind, photoId: string, on: boolean): Promise<{ login?: true; error?: string }> {
  if (!TABLE[kind] || !UUID.test(photoId)) return { error: "Something went wrong." };
  const supabase = await createClient();
  const user = await getMe(supabase);
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
  const user = await getMe(supabase);
  if (!user || !UUID.test(photoId)) return null;
  const { data: photo } = await supabase.from("business_photos").select("id, business_id, path, post_id").eq("id", photoId).maybeSingle();
  if (!photo) return null;
  const { data: biz } = await supabase.from("businesses").select("id, slug").eq("id", photo.business_id).eq("owner_id", user.id).maybeSingle();
  if (!biz) return null;
  // Every photo in the same post.
  const { data: all } = photo.post_id
    ? await supabase.from("business_photos").select("id, path").eq("post_id", photo.post_id).eq("business_id", photo.business_id)
    : { data: [{ id: photo.id, path: photo.path }] };
  return { supabase, photo: photo as { id: string; business_id: string; path: string }, biz: biz as { id: string; slug: string }, all: (all as { id: string; path: string }[]) || [] };
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
  const { error } = await own.supabase.from("business_photos").update(row).in("id", own.all.map((x) => x.id)).eq("business_id", own.biz.id);
  if (error) return { error: "Couldn't save. Please try again." };
  refresh(own.biz);
  return {};
}

export async function deletePhoto(photoId: string): Promise<{ error?: string }> {
  const own = await ownPhoto(photoId);
  if (!own) return { error: "You can only delete your own photos." };
  const { error } = await own.supabase.from("business_photos").delete().in("id", own.all.map((x) => x.id)).eq("business_id", own.biz.id);
  if (error) return { error: "Couldn't delete. Please try again." };
  await own.supabase.storage.from(PHOTO_BUCKET).remove(own.all.map((x) => x.path));
  refresh(own.biz);
  return {};
}

export type Comment = { id: string; name: string; body: string; created_at: string; canDelete: boolean; mine: boolean };

async function photoOwner(supabase: Awaited<ReturnType<typeof createClient>>, photoId: string) {
  const { data: photo } = await supabase.from("business_photos").select("business_id").eq("id", photoId).maybeSingle();
  if (!photo) return null;
  const { data: biz } = await supabase.from("businesses").select("owner_id, slug").eq("id", photo.business_id).maybeSingle();
  return (biz as { owner_id: string; slug: string } | null) || null;
}

export async function loadComments(photoId: string): Promise<Comment[]> {
  if (!UUID.test(photoId)) return [];
  const supabase = await createClient();
  const [user, { data }, owner] = await Promise.all([
    getMe(supabase),
    supabase.from("photo_comments").select("id, user_id, name, body, created_at").eq("photo_id", photoId).order("created_at").limit(500),
    photoOwner(supabase, photoId),
  ]);
  const isOwner = !!user && owner?.owner_id === user.id;
  return ((data as { id: string; user_id: string; name: string; body: string; created_at: string }[]) || []).map((c) => ({
    id: c.id,
    name: c.name,
    body: c.body,
    created_at: c.created_at,
    mine: !!user && c.user_id === user.id,
    canDelete: isOwner || (!!user && c.user_id === user.id),
  }));
}

export async function addComment(photoId: string, body: string): Promise<{ login?: true; error?: string; comments?: Comment[] }> {
  const text = String(body ?? "").trim().slice(0, 1000);
  if (!UUID.test(photoId)) return { error: "Something went wrong." };
  if (!text) return { error: "Write something first." };
  const supabase = await createClient();
  const user = await getMe(supabase);
  if (!user) return { login: true };
  const { error } = await supabase.from("photo_comments").insert({ photo_id: photoId, user_id: user.id, body: text });
  if (error) return { error: "Couldn't post your comment. Please try again." };
  return { comments: await loadComments(photoId) };
}

export async function removeComment(commentId: string, photoId: string): Promise<{ error?: string; comments?: Comment[] }> {
  if (!UUID.test(commentId) || !UUID.test(photoId)) return { error: "Something went wrong." };
  const supabase = await createClient();
  const { error } = await supabase.from("photo_comments").delete().eq("id", commentId);
  if (error) return { error: "Couldn't delete the comment." };
  return { comments: await loadComments(photoId) };
}

export async function noteShare(photoId: string) {
  if (!UUID.test(photoId)) return;
  const supabase = await createClient();
  await supabase.rpc("note_share", { p_photo: photoId });
}

export type Viewer = { name: string; viewed_at: string; signed_in: boolean };

// For the owner: who viewed a post.
export async function loadViewers(photoId: string): Promise<Viewer[]> {
  if (!UUID.test(photoId)) return [];
  const supabase = await createClient();
  const { data } = await supabase.rpc("photo_viewers", { p_photo: photoId });
  return (data as Viewer[]) || [];
}
