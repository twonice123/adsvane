import type { SupabaseClient } from "@supabase/supabase-js";
import type { Post } from "@/app/components/Gallery";

type Row = { id: string; url: string; caption: string | null; post_text?: string | null; hidden?: boolean; business_id?: string };
type Biz = Post["biz"];

// Turn photo rows into posts with like / repost counts and what this visitor has done.
export async function toPosts(supabase: SupabaseClient, rows: Row[], userId: string | null, bizFor: (r: Row) => Biz): Promise<Post[]> {
  const ids = rows.map((r) => r.id).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  const none = Promise.resolve({ data: [] as { photo_id: string; user_id: string }[] });
  const [likes, reposts, saves, comments] = ids.length
    ? await Promise.all([
        supabase.from("photo_likes").select("photo_id, user_id").in("photo_id", ids).limit(20000),
        supabase.from("photo_reposts").select("photo_id, user_id").in("photo_id", ids).limit(20000),
        userId ? supabase.from("photo_saves").select("photo_id, user_id").in("photo_id", ids).eq("user_id", userId) : none,
        supabase.from("photo_comments").select("photo_id, user_id").in("photo_id", ids).limit(20000),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];
  const count = (list: { photo_id: string; user_id: string }[] | null) => {
    const m = new Map<string, number>();
    const me = new Set<string>();
    for (const x of list || []) {
      m.set(x.photo_id, (m.get(x.photo_id) || 0) + 1);
      if (userId && x.user_id === userId) me.add(x.photo_id);
    }
    return { m, me };
  };
  const L = count(likes.data as never);
  const R = count(reposts.data as never);
  const S = count(saves.data as never);
  const C = count(comments.data as never);
  return rows.map((r) => ({
    id: r.id,
    url: r.url,
    text: r.post_text || (r.caption && r.caption !== "Cover photo" ? r.caption : null),
    hidden: !!r.hidden,
    likes: L.m.get(r.id) || 0,
    reposts: R.m.get(r.id) || 0,
    comments: C.m.get(r.id) || 0,
    liked: L.me.has(r.id),
    saved: S.me.has(r.id),
    reposted: R.me.has(r.id),
    social: ids.includes(r.id),
    biz: bizFor(r),
  }));
}
