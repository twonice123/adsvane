"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PHOTO_BUCKET, focusText, parseFocus } from "@/lib/data";
import { getMe } from "@/lib/auth";

export type PhotoState = { error?: string; ok?: string };

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const KINDS = ["logo", "cover", "gallery"] as const;
type Kind = (typeof KINDS)[number];

async function ownBusiness(businessId: string) {
  const supabase = await createClient();
  const user = await getMe(supabase);
  if (!user) redirect("/login");
  const { data } = await supabase
    .from("businesses")
    .select("id, slug, logo_url, cover_url")
    .eq("id", businessId)
    .eq("owner_id", user.id)
    .maybeSingle();
  return { supabase, biz: data as { id: string; slug: string; logo_url: string | null; cover_url: string | null } | null };
}

// The storage path of one of our own uploaded files, or null for any other link.
function ownPath(url: string | null, businessId: string) {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${PHOTO_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i < 0) return null;
  const path = decodeURIComponent(url.slice(i + marker.length));
  return path.startsWith(businessId + "/") ? path : null;
}

function refresh(id: string, slug: string) {
  revalidatePath(`/dashboard/${id}`);
  revalidatePath(`/b/${slug}`);
  revalidatePath("/find");
}

export async function uploadPhoto(_prev: PhotoState, fd: FormData): Promise<PhotoState> {
  const businessId = String(fd.get("business_id") ?? "");
  const kind = String(fd.get("kind") ?? "") as Kind;
  if (!KINDS.includes(kind)) return { error: "Something went wrong. Please try again." };
  const files = fd.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { error: "Choose a photo first." };

  const { supabase, biz } = await ownBusiness(businessId);
  if (!biz) return { error: "Business not found." };


  let added = 0;
  for (const file of (kind === "gallery" ? files : files.slice(0, 1))) {
    const ext = TYPES[file.type];
    if (!ext) return { error: "Please use a JPG, PNG or WebP photo." };
    if (file.size > 4 * 1024 * 1024) return { error: "That photo is too big. Please use one under 4 MB." };
    const path = `${biz.id}/${kind}-${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(PHOTO_BUCKET).upload(path, await file.arrayBuffer(), { contentType: file.type, cacheControl: "31536000" });
    if (upErr) return { error: "Couldn't upload the photo. Please try again." };
    const url = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;

    if (kind === "gallery") {
      const post_text = String(fd.get("caption") ?? "").trim().slice(0, 2200) || null;
      const postId = String(fd.get("post_id") ?? "");
      const pos = Number(fd.get("start") ?? 0) + added;
      const { error } = await supabase.from("business_photos").insert({
        business_id: biz.id,
        path,
        url,
        post_text,
        ...(/^[0-9a-f-]{36}$/i.test(postId) ? { post_id: postId, position: Math.min(Math.max(pos, 0), 999) } : {}),
      });
      if (error) {
        await supabase.storage.from(PHOTO_BUCKET).remove([path]);
        return { error: "Couldn't save the photo. Please try again." };
      }
    } else {
      const col = kind === "logo" ? "logo_url" : "cover_url";
      const { error } = await supabase.from("businesses").update({ [col]: url, [kind === "logo" ? "logo_focus" : "cover_focus"]: null }).eq("id", biz.id);
      if (error) {
        await supabase.storage.from(PHOTO_BUCKET).remove([path]);
        return { error: "Couldn't save the photo. Please try again." };
      }
      const old = ownPath(biz[col], biz.id);
      if (old) await supabase.storage.from(PHOTO_BUCKET).remove([old]);
    }
    added++;
  }

  refresh(biz.id, biz.slug);
  if (kind === "logo") return { ok: "Profile picture updated." };
  if (kind === "cover") return { ok: "Cover photo updated." };
  return { ok: `${added} photo${added === 1 ? "" : "s"} posted.` };
}

export async function removePhoto(fd: FormData) {
  const businessId = String(fd.get("business_id") ?? "");
  const what = String(fd.get("what") ?? "");
  const { supabase, biz } = await ownBusiness(businessId);
  if (!biz) return;

  if (what === "logo" || what === "cover") {
    const col = what === "logo" ? "logo_url" : "cover_url";
    await supabase.from("businesses").update({ [col]: null, [what === "logo" ? "logo_focus" : "cover_focus"]: null }).eq("id", biz.id);
    const old = ownPath(biz[col], biz.id);
    if (old) await supabase.storage.from(PHOTO_BUCKET).remove([old]);
  } else {
    const photoId = String(fd.get("photo_id") ?? "");
    const { data } = await supabase.from("business_photos").select("path").eq("id", photoId).eq("business_id", biz.id).maybeSingle();
    if (data) {
      await supabase.from("business_photos").delete().eq("id", photoId).eq("business_id", biz.id);
      await supabase.storage.from(PHOTO_BUCKET).remove([data.path]);
    }
  }
  refresh(biz.id, biz.slug);
}

export async function saveFocus(businessId: string, what: "logo" | "cover", focus: string): Promise<{ error?: string }> {
  if (what !== "logo" && what !== "cover") return { error: "Something went wrong." };
  const f = parseFocus(focus);
  const { supabase, biz } = await ownBusiness(businessId);
  if (!biz) return { error: "Business not found." };
  const { error } = await supabase.from("businesses").update({ [what === "logo" ? "logo_focus" : "cover_focus"]: focusText(f) }).eq("id", biz.id);
  if (error) return { error: "Couldn't save. Please try again." };
  refresh(biz.id, biz.slug);
  return {};
}

// A video the owner's phone already put in storage (videos are too big to
// pass through our server). We check the files are theirs, then post it.
export async function addVideo(fd: FormData): Promise<PhotoState> {
  const businessId = String(fd.get("business_id") ?? "");
  const path = String(fd.get("path") ?? "");
  const poster = String(fd.get("poster") ?? "");
  const { supabase, biz } = await ownBusiness(businessId);
  if (!biz) return { error: "Business not found." };
  const okPath = (p: string, ext: RegExp) => p.startsWith(`${biz.id}/gallery-`) && ext.test(p) && !p.includes("..");
  if (!okPath(path, /\.(mp4|mov|webm)$/) || (poster && !okPath(poster, /\.jpg$/))) return { error: "Couldn't post the video. Please try again." };
  const name = path.slice(biz.id.length + 1);
  const { data: found } = await supabase.storage.from(PHOTO_BUCKET).list(biz.id, { search: name, limit: 1 });
  if (!found?.length) return { error: "The video didn't finish uploading. Please try again." };

  const url = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
  const poster_url = poster ? supabase.storage.from(PHOTO_BUCKET).getPublicUrl(poster).data.publicUrl : null;
  const post_text = String(fd.get("caption") ?? "").trim().slice(0, 2200) || null;
  const postId = String(fd.get("post_id") ?? "");
  const pos = Number(fd.get("start") ?? 0);
  const { error } = await supabase.from("business_photos").insert({
    business_id: biz.id,
    path,
    url,
    poster_url,
    post_text,
    ...(/^[0-9a-f-]{36}$/i.test(postId) ? { post_id: postId, position: Math.min(Math.max(pos, 0), 999) } : {}),
  });
  if (error) {
    await supabase.storage.from(PHOTO_BUCKET).remove([path, ...(poster ? [poster] : [])]);
    return { error: "Couldn't save the video. Please try again." };
  }
  refresh(biz.id, biz.slug);
  return { ok: "Posted." };
}
