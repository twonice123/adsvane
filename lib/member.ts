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
  const cols = "id, url, caption, post_text, hidden, business_id, post_id, position, view_count";
  type R = { id: string; url: string; caption: string | null; post_text: string | null; business_id: string; post_id: string | null; position: number; view_count: number };
  const { data: rows } = await supabase.from("business_photos").select(cols).in("id", order).eq("hidden", false);
  const leads = ((rows as R[]) || []).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  // Bring in the other photos of each post so people can swipe through them.
  const postIds = [...new Set(leads.map((r) => r.post_id).filter(Boolean))] as string[];
  const { data: more } = postIds.length ? await supabase.from("business_photos").select(cols).in("post_id", postIds).eq("hidden", false) : { data: [] };
  const seen = new Set(leads.map((r) => r.id));
  const photos: R[] = [];
  for (const l of leads) {
    photos.push(l);
    for (const m of (more as R[]) || []) if (l.post_id && m.post_id === l.post_id && !seen.has(m.id)) {
      seen.add(m.id);
      photos.push(m);
    }
  }
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
