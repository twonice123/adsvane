import type { SupabaseClient } from "@supabase/supabase-js";
import { PROMOTIONS_ON } from "@/lib/flags";
import { isRunning, type Promotion } from "./data";
import { group, isVideo } from "./posts";

export type Ad = {
  id: string;
  url: string;
  poster: string | null;
  video: boolean;
  text: string;
  sponsored: boolean;
  biz: { name: string; slug: string; logo_url: string | null; category: string; city: string; state: string };
};

type Row = { id: string; url: string; poster_url: string | null; post_text: string | null; caption: string | null; business_id: string; post_id: string | null; position: number | null; created_at: string };

// What the home page "billboard" shows: posts from businesses that are promoting first
// (videos before photos), then the newest posts from everyone else.
export async function billboard(supabase: SupabaseClient, limit = 24): Promise<Ad[]> {
  const [{ data: promos }, { data: rows }] = await Promise.all([
    PROMOTIONS_ON
      ? supabase.from("promotions").select("business_id,status,ends_at").eq("status", "active").gt("ends_at", new Date().toISOString())
      : Promise.resolve({ data: [] }),
    supabase
      .from("business_photos")
      .select("id,url,poster_url,post_text,caption,business_id,post_id,position,created_at")
      .eq("hidden", false)
      .order("created_at", { ascending: false })
      .limit(300),
  ]);
  const paid = new Set(((promos as Pick<Promotion, "business_id" | "status" | "ends_at">[]) || []).filter(isRunning).map((p) => p.business_id));
  const posts = group((rows as Row[]) || []);
  const ids = [...new Set(posts.map((p) => p.business_id))];
  if (!ids.length) return [];
  const { data: bizRows } = await supabase.from("businesses").select("id,name,slug,logo_url,category,city,state").in("id", ids);
  const biz = new Map(((bizRows as (Ad["biz"] & { id: string })[]) || []).map((b) => [b.id, b]));

  const score = (p: Row) => (paid.has(p.business_id) ? 2 : 0) + (isVideo(p.url) ? 1 : 0);
  const sorted = posts.filter((p) => biz.has(p.business_id)).sort((a, b) => score(b) - score(a) || b.created_at.localeCompare(a.created_at));

  // Mix it up so one shop doesn't fill the whole billboard: at most 3 posts per business.
  const per = new Map<string, number>();
  const out: Ad[] = [];
  for (const p of sorted) {
    const n = per.get(p.business_id) || 0;
    if (n >= 3) continue;
    per.set(p.business_id, n + 1);
    const b = biz.get(p.business_id)!;
    out.push({
      id: p.id,
      url: p.url,
      poster: p.poster_url,
      video: isVideo(p.url),
      text: (p.post_text || p.caption || "").slice(0, 140),
      sponsored: paid.has(p.business_id),
      biz: { name: b.name, slug: b.slug, logo_url: b.logo_url, category: b.category, city: b.city, state: b.state },
    });
    if (out.length >= limit) break;
  }
  return out;
}
