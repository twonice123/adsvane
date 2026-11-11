import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { memberName, memberPosts, type Tab } from "@/lib/member";
import Gallery from "@/app/components/Gallery";
import ShareMine from "./ShareMine";

export const metadata = { title: "My page", robots: { index: false } };
export const dynamic = "force-dynamic";

const TABS: { key: Tab; label: string; empty: string }[] = [
  { key: "reposts", label: "Reposts", empty: "Photos you repost show here, and on your public page for others to see." },
  { key: "saved", label: "Saved", empty: "Tap the bookmark on any photo to save it here. Only you can see your saved photos." },
  { key: "likes", label: "Likes", empty: "Photos you like show here." },
];

export default async function Me({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const tab: Tab = sp.tab === "saved" || sp.tab === "likes" ? sp.tab : "reposts";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?who=member&next=/me");
  const [name, posts] = await Promise.all([memberName(supabase, user.id), memberPosts(supabase, user.id, tab, user.id)]);
  const t = TABS.find((x) => x.key === tab)!;

  return (
    <div className="wrap narrow2" style={{ margin: "22px auto 44px" }}>
      <div className="me-top">
        <span className="me-av">{name.slice(0, 1).toUpperCase()}</span>
        <div>
          <h1>{name}</h1>
          <p className="muted" style={{ margin: 0 }}>{user.email}</p>
        </div>
      </div>
      <div className="btns" style={{ margin: "14px 0 6px" }}>
        <ShareMine path={`/u/${user.id}`} />
        <Link className="b ghost" href="/find">Find services</Link>
        <form action="/auth/signout" method="post"><button className="b ghost" type="submit">Sign out</button></form>
      </div>
      <nav className="me-tabs" aria-label="My photos">
        {TABS.map((x) => (
          <Link key={x.key} href={`/me?tab=${x.key}`} className={x.key === tab ? "on" : ""} aria-current={x.key === tab ? "page" : undefined}>{x.label}</Link>
        ))}
      </nav>
      <Gallery photos={posts} loginNext={`/me?tab=${tab}`} empty={<p className="muted me-empty">{t.empty}</p>} />
    </div>
  );
}
