import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { memberName, memberPosts, type Tab } from "@/lib/member";
import Gallery from "@/app/components/Gallery";
import ShareMine from "./ShareMine";
import { getMe } from "@/lib/auth";
import { Logo } from "@/app/components/Logo";

export const metadata = { title: "My page", robots: { index: false } };
export const dynamic = "force-dynamic";

const TABS: { key: Tab; label: string; empty: string }[] = [
  { key: "reposts", label: "Reposts", empty: "Photos you repost show here, and on your public page for others to see." },
  { key: "saved", label: "Saved", empty: "Tap the bookmark on any photo to save it here. Only you can see your saved photos." },
  { key: "likes", label: "Likes", empty: "Photos you like show here." },
];

type Place = { id: string; name: string; slug: string; category: string; city: string; state: string; logo_url: string | null; logo_focus: string | null };

export default async function Me({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const places = sp.tab === "places" || !sp.tab;
  const tab: Tab = sp.tab === "saved" || sp.tab === "likes" ? sp.tab : "reposts";
  const supabase = await createClient();
  const user = await getMe(supabase);
  if (!user) redirect("/login?who=member&next=/me");
  const [name, posts, saves] = await Promise.all([
    memberName(supabase, user.id),
    places ? Promise.resolve([]) : memberPosts(supabase, user.id, tab, user.id),
    places ? supabase.from("business_saves").select("business_id, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200) : Promise.resolve({ data: [] }),
  ]);
  const order = ((saves.data as { business_id: string }[]) || []).map((r) => r.business_id);
  const { data: bizRows } = order.length
    ? await supabase.from("businesses").select("id, name, slug, category, city, state, logo_url, logo_focus").in("id", order)
    : { data: [] };
  const saved = ((bizRows as Place[]) || []).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const t = TABS.find((x) => x.key === tab)!;

  return (
    <div className="wrap narrow2" style={{ margin: "22px auto 44px" }}>
      <div className="me-top">
        <span className="me-av">{name.slice(0, 1).toUpperCase()}</span>
        <div>
          <h1>{name}</h1>
          <p className="muted" style={{ margin: 0 }}>{user.email}</p>
        </div>
        <ShareMine path={`/u/${user.id}`} />
      </div>
      <nav className="me-tabs" aria-label="My photos">
        <Link href="/me?tab=places" className={places ? "on" : ""} aria-current={places ? "page" : undefined}>Saved places</Link>
        {TABS.map((x) => (
          <Link key={x.key} href={`/me?tab=${x.key}`} className={!places && x.key === tab ? "on" : ""} aria-current={!places && x.key === tab ? "page" : undefined}>{x.label}</Link>
        ))}
      </nav>
      {places ? (
        saved.length ? (
          <ul className="me-places">
            {saved.map((b) => (
              <li key={b.id}>
                <Link href={`/b/${b.slug}`}>
                  <Logo name={b.name} url={b.logo_url} focus={b.logo_focus} />
                  <span><b>{b.name}</b><small>{b.category} · {b.city}, {b.state}</small></span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted me-empty">Tap Save on any business page to keep it here. <Link href="/find">Find local pros</Link></p>
        )
      ) : (
        <Gallery photos={posts} loginNext={`/me?tab=${tab}`} empty={<p className="muted me-empty">{t.empty}</p>} />
      )}
    </div>
  );
}
