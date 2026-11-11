import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AMENITY_LABEL, type Business } from "@/lib/data";
import { ratingsFor } from "@/lib/queries";
import PromoteForm from "./PromoteForm";
import { getMe } from "@/lib/auth";

export const metadata = { title: "Promote profile", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Promote({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getMe(supabase);
  const { data } = await supabase.from("businesses").select("*").eq("id", id).eq("owner_id", user!.id).maybeSingle();
  if (!data) notFound();
  const biz = data as Business;
  const [{ data: optins }, ratings] = await Promise.all([supabase.rpc("optin_count"), ratingsFor(supabase, [id])]);
  const r = ratings.get(id);
  return (
    <div className="wrap" style={{ marginBottom: 40 }}>
      <p className="muted" style={{ marginTop: 14 }}><Link href={`/dashboard/${id}`}>← Back to dashboard</Link></p>
      <h1>Promote {biz.name}</h1>
      <p className="sub">Show up at the top of AdsVane search and in emails to customers nearby who asked for local picks. Paid spots are always labeled Sponsored.</p>
      <PromoteForm
        biz={{ id: biz.id, name: biz.name, logo_url: biz.logo_url, category: biz.category, city: biz.city, state: biz.state }}
        features={biz.amenities.map((a) => AMENITY_LABEL[a]).filter(Boolean).slice(0, 3)}
        rating={r ? { rating: Number(r.rating), count: r.review_count } : null}
        optins={typeof optins === "number" ? optins : 0}
      />
    </div>
  );
}
