import Link from "next/link";
import { redirect } from "next/navigation";
import { SLIDES } from "@/lib/slides";
import { CATEGORIES } from "@/lib/data";
import { billboard } from "@/lib/billboard";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/auth";
import Slideshow from "./components/Slideshow";
import Billboard from "./components/Billboard";
import ReelStrip from "./components/ReelStrip";
import Welcome from "./components/Welcome";

export const dynamic = "force-dynamic";

const CAT_ICONS: Record<string, string> = {
  "Hair braiding": "💇🏾‍♀️", "Hair salon": "💇", Barber: "💈", "Nail salon": "💅", "Beauty & spa": "🧖", Restaurant: "🍽️",
  "Grocery & market": "🛒", "Moving & hauling": "🚚", "Tree service": "🌳", Cleaning: "🧽", "Auto repair": "🔧",
};

export default async function Landing() {
  // Business owners land on their own business, like opening Instagram.
  const supabase = await createClient();
  const me = await getMe(supabase);
  if (me) {
    const { count } = await supabase.from("businesses").select("id", { count: "exact", head: true }).eq("owner_id", me.id);
    if (count) redirect("/dashboard");
  }
  const ads = await billboard(supabase).catch(() => []);
  // The big billboard shows the first few; the sliding row shows the rest (or all, if there are few).
  const top = ads.slice(0, 6);
  const strip = ads.length > 9 ? ads.slice(6) : ads;

  return (
    <>
      {!me && <Welcome />}
      {top.length ? <Billboard ads={top} /> : <Slideshow slides={SLIDES} />}

      <section className="wrap lp-search">
        <form action="/find" className="lp-box" role="search">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
          <input name="q" type="search" placeholder="Braids, barber, nails near me…" aria-label="What are you looking for?" enterKeyHint="search" />
          <button type="submit" className="b">Search</button>
        </form>
      </section>

      {strip.length > 0 && (
        <section className="lp-sec">
          <div className="wrap lp-head">
            <h2>Trending on AdsVane</h2>
            <Link href="/find">See all</Link>
          </div>
          <ReelStrip ads={strip} />
        </section>
      )}

      <section className="wrap lp-sec">
        <div className="lp-head">
          <h2>Browse by category</h2>
        </div>
        <div className="lp-cats">
          {CATEGORIES.filter((c) => c !== "Other").map((c) => (
            <Link key={c} href={`/find?q=${encodeURIComponent(c)}`} className="lp-cat">
              <span aria-hidden="true">{CAT_ICONS[c] || "📍"}</span>
              {c}
            </Link>
          ))}
        </div>
      </section>

      <section className="wrap lp-sec">
        <div className="lp-biz">
          <div>
            <p className="eyebrow">For businesses</p>
            <h2>Put your business on the AdsVane billboard</h2>
            <p>Create your free profile, post your work, and promote it. Promoted videos and flyers show right here on the home page, where customers can view your page or contact you in one tap.</p>
          </div>
          <div className="lp-biz-btns">
            <Link href={me ? "/dashboard" : "/signup"} className="b">Create your business profile</Link>
            <Link href={me ? "/dashboard" : "/login"} className="b ghost">Log in</Link>
          </div>
        </div>
      </section>
    </>
  );
}
