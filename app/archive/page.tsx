import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/auth";
import { toPosts } from "@/lib/posts";
import type { Photo } from "@/lib/data";
import Gallery from "@/app/components/Gallery";

export const metadata = { title: "Archive", robots: { index: false } };
export const dynamic = "force-dynamic";

// Posts the owner archived: hidden from their page, kept here until they show them again.
export default async function Archive() {
  const supabase = await createClient();
  const user = await getMe(supabase);
  if (!user) redirect("/login?next=/archive");
  const { data: bizRows } = await supabase.from("businesses").select("id, name, slug, logo_url").eq("owner_id", user.id);
  const biz = new Map(((bizRows as { id: string; name: string; slug: string; logo_url: string | null }[]) || []).map((b) => [b.id, b]));
  const { data: rows } = biz.size
    ? await supabase.from("business_photos").select("*").in("business_id", [...biz.keys()]).order("created_at", { ascending: false }).limit(1000)
    : { data: [] };
  const all = (rows as Photo[]) || [];
  // Keep every photo of an archived post together.
  const posts = (await toPosts(supabase, all, user.id, (r) => {
    const b = biz.get(r.business_id!)!;
    return { name: b.name, slug: b.slug, logo_url: b.logo_url };
  })).filter((p) => p.hidden);

  return (
    <div className="wrap narrow2" style={{ margin: "22px auto 44px" }}>
      <h1>Archive</h1>
      <p className="sub">Only you can see these. Tap a post, then ⋯ → Show on profile to put it back.</p>
      <Gallery
        photos={posts}
        owner
        loginNext="/archive"
        empty={<p className="muted me-empty">Nothing archived. To archive a post, open it and tap ⋯ → Archive, or press and hold it.</p>}
      />
    </div>
  );
}
