import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/auth";
import { ago } from "@/lib/time";

export const metadata = { title: "Notifications", robots: { index: false } };
export const dynamic = "force-dynamic";

type N = { id: string; kind: string; actor_name: string; photo_id: string | null; snippet: string | null; read_at: string | null; created_at: string };
const WHAT: Record<string, { icon: string; text: string }> = {
  like: { icon: "♥", text: "liked your photo" },
  repost: { icon: "↻", text: "reposted your photo" },
  share: { icon: "↗", text: "shared your photo" },
  comment: { icon: "💬", text: "commented on your photo:" },
};

export default async function Notifications() {
  const supabase = await createClient();
  const user = await getMe(supabase);
  if (!user) redirect("/login?who=member&next=/notifications");
  const { data } = await supabase.from("notifications").select("id, kind, actor_name, photo_id, snippet, read_at, created_at").eq("recipient", user.id).order("created_at", { ascending: false }).limit(100);
  const list = (data as N[]) || [];
  const photoIds = [...new Set(list.map((n) => n.photo_id).filter(Boolean))] as string[];
  const { data: photos } = photoIds.length ? await supabase.from("business_photos").select("id, url, business_id").in("id", photoIds) : { data: [] };
  const bizIds = [...new Set(((photos as { business_id: string }[]) || []).map((p) => p.business_id))];
  const { data: biz } = bizIds.length ? await supabase.from("businesses").select("id, slug").in("id", bizIds) : { data: [] };
  const slug = new Map(((biz as { id: string; slug: string }[]) || []).map((b) => [b.id, b.slug]));
  const photo = new Map(((photos as { id: string; url: string; business_id: string }[]) || []).map((p) => [p.id, { url: p.url, slug: slug.get(p.business_id) }]));
  if (list.some((n) => !n.read_at)) await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("recipient", user.id).is("read_at", null);

  return (
    <div className="wrap narrow2" style={{ margin: "22px auto 44px" }}>
      <h1>Notifications</h1>
      {!list.length && <p className="muted">Nothing yet. When people like, comment on, share or repost your photos, you&apos;ll see it here.</p>}
      <div>
        {list.map((n) => {
          const p = n.photo_id ? photo.get(n.photo_id) : undefined;
          const w = WHAT[n.kind] || { icon: "•", text: n.kind };
          const body = (
            <>
              <span className="nt-ic" aria-hidden="true">{w.icon}</span>
              <span className="nt-t">
                <b>{n.actor_name}</b> {w.text} {n.snippet && <q>{n.snippet}</q>}
                <small>{ago(n.created_at)}</small>
              </span>
              {p && <img src={p.url} alt="" loading="lazy" />}
            </>
          );
          return p?.slug ? (
            <Link key={n.id} href={`/b/${p.slug}?photo=${n.photo_id}`} className={`nt${n.read_at ? "" : " new"}`}>{body}</Link>
          ) : (
            <div key={n.id} className={`nt${n.read_at ? "" : " new"}`}>{body}</div>
          );
        })}
      </div>
    </div>
  );
}
