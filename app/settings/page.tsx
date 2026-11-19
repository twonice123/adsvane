import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/auth";
import Security from "./Security";
import Personal from "./Personal";
import { disconnect } from "./actions";

export const metadata = { title: "Settings", robots: { index: false } };
export const dynamic = "force-dynamic";

const NETS = [
  { key: "instagram", name: "Instagram", note: "Share your posts to Instagram too", ready: true },
  { key: "facebook", name: "Facebook", note: "Share your posts to your Facebook Page", ready: true },
  { key: "tiktok", name: "TikTok", note: "Share your videos to TikTok", ready: false },
];

const CONNECT_MSG: Record<string, { ok?: string; err?: string }> = {
  ok: { ok: "Connected! Your Facebook Page and Instagram are linked." },
  cancelled: { err: "Connecting was cancelled. Tap Connect to try again." },
  failed: { err: "We couldn't connect. Please try again." },
  nopage: { err: "We didn't find a Facebook Page on that account. Create a Facebook Page for your business, then tap Connect again." },
  soon: { err: "Connecting is almost ready. We're finishing the setup with Instagram and Facebook." },
};

export default async function Settings({ searchParams }: { searchParams: Promise<{ email?: string; connect?: string; ig?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const me = await getMe(supabase);
  if (!me) redirect("/login?next=%2Fsettings");
  const { data: conns } = await supabase.from("social_connections").select("provider, account_name").eq("user_id", me.id);
  const linked = new Map<string, string[]>();
  for (const c of (conns as { provider: string; account_name: string | null }[]) || []) linked.set(c.provider, [...(linked.get(c.provider) || []), c.account_name || "Connected"]);
  const cm = sp.connect ? CONNECT_MSG[sp.connect] : undefined;
  return (
    <div className="wrap narrow dwrap" style={{ marginTop: 22 }}>
      <h1>Settings</h1>
      <Personal email={me.email || ""} changed={sp.email === "changed"} />
      <Security />
      <section className="card set-card">
        <h2>Connected accounts</h2>
        <p className="sub">Post once on AdsVane and share it to your other pages at the same time.</p>
        {cm?.ok && <p className="ok" role="status">{cm.ok}{sp.ig === "none" ? " (No Instagram was found. Make your Instagram a Professional account linked to this Page, then connect again.)" : ""}</p>}
        {cm?.err && <p className="err" role="alert">{cm.err}</p>}
        {NETS.map((n) => {
          const names = linked.get(n.key);
          return (
            <div key={n.name} className="set-row">
              <div>
                <b>{n.name}</b>
                <small>{names ? `Connected: ${names.join(", ")}` : n.note}</small>
              </div>
              {!n.ready ? (
                <button type="button" className="b ghost" disabled>Coming soon</button>
              ) : names ? (
                <form action={disconnect}>
                  <input type="hidden" name="provider" value={n.key} />
                  <button className="b ghost" type="submit">Disconnect</button>
                </form>
              ) : (
                <a className="b" href="/api/connect/meta/start">Connect</a>
              )}
            </div>
          );
        })}
      </section>
      <form action="/auth/signout" method="post" style={{ marginTop: 18 }}>
        <button className="b ghost" type="submit" style={{ width: "100%" }}>Sign out</button>
      </form>
    </div>
  );
}
