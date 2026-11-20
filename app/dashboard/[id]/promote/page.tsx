import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type Business } from "@/lib/data";
import PromoteForm from "./PromoteForm";
import { getMe } from "@/lib/auth";
import { group, isVideo } from "@/lib/posts";
import { addressText } from "@/lib/geo";
import { isRunning, type Promotion } from "@/lib/data";
import { stopPromotion } from "../../actions";

export const metadata = { title: "Promote profile", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Promote({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getMe(supabase);
  const { data } = await supabase.from("businesses").select("*").eq("id", id).eq("owner_id", user!.id).maybeSingle();
  if (!data) notFound();
  const biz = data as Business;
  const [{ data: optins }, { data: promos }, { data: photoRows }] = await Promise.all([
    supabase.rpc("optin_count"),
    supabase.from("promotions").select("*").eq("business_id", id).order("created_at", { ascending: false }).limit(5),
    supabase.from("business_photos").select("id, url, caption, post_id, position, poster_url").eq("business_id", id).eq("hidden", false).order("created_at", { ascending: false }).limit(200),
  ]);
  const photos = group((photoRows as { id: string; url: string; caption: string | null; post_id: string | null; position: number | null; poster_url: string | null }[]) || []).map((p) => ({ id: p.id, url: isVideo(p.url) ? p.posters[0] || p.poster_url || "" : p.url, video: isVideo(p.url) ? p.url : null }));
  const running = ((promos as Promotion[]) || []).find(isRunning);
  return (
    <div className="wrap" style={{ marginBottom: 0 }}>
      <p className="muted" style={{ marginTop: 14 }}><Link href={`/dashboard/${id}`}>← Back to dashboard</Link></p>
      <h1>Promote</h1>
      {running && (
        <section className="card" style={{ marginBottom: 18 }}>
          <p style={{ margin: "0 0 10px" }}><b style={{ color: "var(--brand)" }}>Your promotion is running</b> until {new Date(running.ends_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.</p>
          <form action={stopPromotion}>
            <input type="hidden" name="business_id" value={id} />
            <button className="b danger" type="submit">Stop promotion</button>
          </form>
        </section>
      )}
      <PromoteForm
        biz={{ id: biz.id, name: biz.name, logo_url: biz.logo_url, category: biz.category, city: biz.city, state: biz.state, address: addressText(biz), website: biz.website }}
        photos={photos}
        optins={typeof optins === "number" ? optins : 0}
      />
    </div>
  );
}
