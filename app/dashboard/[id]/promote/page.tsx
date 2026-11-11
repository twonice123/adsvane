import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AMENITY_LABEL, type Business } from "@/lib/data";
import { ratingsFor } from "@/lib/queries";
import PromoteForm, { type Audience } from "./PromoteForm";
import { getMe } from "@/lib/auth";
import { group } from "@/lib/posts";
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
  const [{ data: optins }, ratings, { data: promos }, { data: photoRows }, { data: auds }] = await Promise.all([
    supabase.rpc("optin_count"),
    ratingsFor(supabase, [id]),
    supabase.from("promotions").select("*").eq("business_id", id).order("created_at", { ascending: false }).limit(5),
    supabase.from("business_photos").select("id, url, caption, post_id, position").eq("business_id", id).eq("hidden", false).order("created_at", { ascending: false }).limit(200),
    supabase.from("audiences").select("id, name, targets, age_min").eq("business_id", id).order("created_at", { ascending: false }).limit(20),
  ]);
  const photos = group((photoRows as { id: string; url: string; caption: string | null; post_id: string | null; position: number | null }[]) || []).map((p) => ({ id: p.id, url: p.url }));
  const running = ((promos as Promotion[]) || []).find(isRunning);
  const r = ratings.get(id);
  return (
    <div className="wrap" style={{ marginBottom: 40 }}>
      <p className="muted" style={{ marginTop: 14 }}><Link href={`/dashboard/${id}`}>← Back to dashboard</Link></p>
      <h1>Promote {biz.name}</h1>
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
        audiences={(auds as Audience[]) || []}
        features={biz.amenities.map((a) => AMENITY_LABEL[a]).filter(Boolean).slice(0, 3)}
        rating={r ? { rating: Number(r.rating), count: r.review_count } : null}
        optins={typeof optins === "number" ? optins : 0}
      />
    </div>
  );
}
