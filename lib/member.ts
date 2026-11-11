import type { SupabaseClient } from "@supabase/supabase-js";
import { toPosts } from "./posts";
import type { Post } from "@/app/components/Gallery";

export type Tab = "reposts" | "saved" | "likes";
const TABLE: Record<Tab, string> = { reposts: "photo_reposts", saved: "photo_saves", likes: "photo_likes" };

// The photos someone reposted, saved or liked, newest first, as posts.
export async function memberPosts(supabase: SupabaseClient, who: string, tab: Tab, viewer: string | null): Promise<Post[]> {
  const { data: marks } = await supabase.from(TABLE[tab]).select("photo_id, created_at").eq("user_id", who).order("created_at", { ascending: false }).limit(300);
  const order = ((marks as { photo_id: string }[]) || []).map((m) => m.photo_id);
  if (!order.length) return [];
  const { data: rows } = await supabase.from("business_photos").select("id, url, caption, post_text, hidden, business_id").in("id", order).eq("hidden", false);
  const photos = ((rows as { id: string; url: string; caption: string | null; post_text: string | null; business_id: string }[]) || [])
    .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const bizIds = [...new Set(photos.map((p) => p.business_id))];
  const { data: bizRows } = bizIds.length
    ? await supabase.from("businesses").select("id, name, slug, logo_url").in("id", bizIds)
    : { data: [] };
  const biz = new Map(((bizRows as { id: string; name: string; slug: string; logo_url: string | null }[]) || []).map((b) => [b.id, b]));
  const known = photos.filter((p) => biz.has(p.business_id));
  return toPosts(supabase, known, viewer, (r) => {
    const b = biz.get(r.business_id!)!;
    return { name: b.name, slug: b.slug, logo_url: b.logo_url };
  });
}

export async function memberName(supabase: SupabaseClient, who: string) {
  const { data } = await supabase.rpc("member_name", { p_user: who });
  return (typeof data === "string" && data) || "AdsVane member";
}
