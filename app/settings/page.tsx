import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/auth";
import Security from "./Security";

export const metadata = { title: "Settings", robots: { index: false } };
export const dynamic = "force-dynamic";

const NETS = [
  { name: "Instagram", note: "Share your posts to Instagram too" },
  { name: "Facebook", note: "Share your posts to your Facebook Page" },
  { name: "TikTok", note: "Share your videos to TikTok" },
];

export default async function Settings() {
  const supabase = await createClient();
  const me = await getMe(supabase);
  if (!me) redirect("/login?next=%2Fsettings");
  return (
    <div className="wrap narrow dwrap" style={{ marginTop: 22 }}>
      <h1>Settings</h1>
      {me.email && <p className="sub">Signed in as {me.email}.</p>}
      <Security />
      <section className="card set-card">
        <h2>Connected accounts</h2>
        <p className="sub">Post once on AdsVane and share it to your other pages at the same time.</p>
        {NETS.map((n) => (
          <div key={n.name} className="set-row">
            <div>
              <b>{n.name}</b>
              <small>{n.note}</small>
            </div>
            <button type="button" className="b ghost" disabled>Coming soon</button>
          </div>
        ))}
      </section>
      <form action="/auth/signout" method="post" style={{ marginTop: 18 }}>
        <button className="b ghost" type="submit" style={{ width: "100%" }}>Sign out</button>
      </form>
    </div>
  );
}
