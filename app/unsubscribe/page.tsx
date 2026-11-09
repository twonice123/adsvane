import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Unsubscribe", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Unsubscribe({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  let ok = false;
  if (t && /^[0-9a-f-]{36}$/i.test(t)) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("unsubscribe", { p_token: t });
    ok = data === true;
  }
  return (
    <div className="wrap narrow" style={{ margin: "26px auto 50px" }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>{ok ? "You're unsubscribed" : "Link not recognized"}</h1>
        <p className="sub">
          {ok
            ? "You won't get any more promotional emails from AdsVane. Your reviews stay posted."
            : "This unsubscribe link isn't valid. If you keep getting emails, reply to one and we'll remove you."}
        </p>
      </div>
    </div>
  );
}
