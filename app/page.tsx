import Link from "next/link";
import { billboard } from "@/lib/billboard";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/auth";
import SplitShow from "./components/SplitShow";
import Welcome from "./components/Welcome";

export const dynamic = "force-dynamic";

const POPULAR = ["Knotless braids", "Barber", "Nails", "Lashes", "Restaurants", "Movers"];

const I = {
  braid: <path d="M12 3c-2 2-2 4 0 6s2 4 0 6-2 4 0 6M8 3c-1.5 2-1.5 4 0 6M16 3c1.5 2 1.5 4 0 6" />,
  scissors: <><circle cx="6" cy="7" r="3" /><circle cx="6" cy="17" r="3" /><path d="M8.5 8.5 20 19M8.5 15.5 20 5" /></>,
  nail: <><path d="M9 21V10a3 3 0 0 1 6 0v11" /><path d="M9 14h6" /><path d="M10 6.5C10 4 11 3 12 3s2 1 2 3.5" /></>,
  spa: <><path d="M12 20c-4 0-7-3-7-7 3 0 5 1 7 4 2-3 4-4 7-4 0 4-3 7-7 7z" /><path d="M12 17c-1.5-2-1.5-6 0-10 1.5 4 1.5 8 0 10z" /></>,
  food: <><path d="M5 3v8a2 2 0 0 0 2 2v8M9 3v8a2 2 0 0 1-2 2M7 3v6" /><path d="M17 21V3c-2 1-3 4-3 8h3" /></>,
  cart: <><path d="M3 4h2l2.5 11h10L20 8H6.5" /><circle cx="9" cy="19" r="1.5" /><circle cx="17" cy="19" r="1.5" /></>,
  truck: <><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>,
  sparkle: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />,
  wrench: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z" />,
  tree: <><path d="M12 3 6 11h3l-4 6h14l-4-6h3z" /><path d="M12 17v4" /></>,
};
const CATS: { name: string; q: string; icon: React.ReactNode; tint: string }[] = [
  { name: "Hair braiding", q: "Hair braiding", icon: I.braid, tint: "#efe9ff" },
  { name: "Barbers", q: "Barber", icon: I.scissors, tint: "#e8f1ff" },
  { name: "Nails", q: "Nail salon", icon: I.nail, tint: "#ffe9f1" },
  { name: "Beauty & spa", q: "Beauty & spa", icon: I.spa, tint: "#e8f7ef" },
  { name: "Restaurants", q: "Restaurant", icon: I.food, tint: "#fff1e3" },
  { name: "Groceries", q: "Grocery & market", icon: I.cart, tint: "#f0f5e6" },
  { name: "Moving", q: "Moving & hauling", icon: I.truck, tint: "#eaf3f7" },
  { name: "Cleaning", q: "Cleaning", icon: I.sparkle, tint: "#eef0ff" },
  { name: "Auto repair", q: "Auto repair", icon: I.wrench, tint: "#f4efe9" },
  { name: "Tree service", q: "Tree service", icon: I.tree, tint: "#e9f5ea" },
];
const Svg = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

export default async function Landing() {
  const supabase = await createClient();
  const me = await getMe(supabase);
  // Real photos from AdsVane businesses fill the split picture (placeholders until the final pictures are in).
  const shots = (await billboard(supabase, 12).catch(() => [])).filter((a) => !a.video).slice(0, 6);
  const pics = shots.map((a) => a.url);

  return (
    <div className="lp">
      {!me && <Welcome />}

      {/* 1. Hero: split picture on one side, the search on the other */}
      <section className="lp-hero">
        <div className="lp-hero-in">
          <SplitShow pics={pics} />

          <div className="lp-copy">
            <p className="lp-word">Ads<span>Vane</span></p>
            <h1>Discover the best local pros near you.</h1>
            <p className="lp-lead">Braiders, barbers, nail techs, restaurants and more, with real photos, videos and reviews from your neighborhood.</p>
            <form action="/find" className="lp-search2" role="search">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
              <input name="q" type="search" placeholder="What are you looking for?" aria-label="What are you looking for?" enterKeyHint="search" />
              <button type="submit">Search</button>
            </form>
            <div className="lp-pop">
              <span>Popular:</span>
              {POPULAR.map((p) => (
                <Link key={p} href={`/find?q=${encodeURIComponent(p + " near me")}`}>{p}</Link>
              ))}
            </div>
            <div className="lp-cta">
              <Link href="/find" className="lp-cta-find">Find services</Link>
              <Link href={me ? "/dashboard" : "/signup"} className="lp-cta-biz">{me ? "Go to your business" : "Create your business profile"}</Link>
            </div>
            {!me && <p className="lp-own-in">Have a business account? <Link href="/login">Log in</Link></p>}
          </div>
        </div>
      </section>

      {/* 2. The billboard */}
      <section className="lp-board">
        <div className="lp-in">
          <p className="lp-kicker">The AdsVane Billboard</p>
          <h2>Local businesses, front and center.</h2>
          <p className="lp-sub">Short videos and flyers from businesses near you. Tap one to see their page or get in touch.</p>
          <div className="board">
            <div className="board-main slot video">
              <span className="slot-ic big" aria-hidden="true"><svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg></span>
              <b>Featured video goes here</b>
              <small>7 to 15 second promo video</small>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Categories */}
      <section className="lp-in lp-block">
        <h2>Browse by category</h2>
        <div className="cats2">
          {CATS.map((c) => (
            <Link key={c.name} href={`/find?q=${encodeURIComponent(c.q)}`} className="cat2">
              <span className="cat2-ic" style={{ background: c.tint }}><Svg>{c.icon}</Svg></span>
              <span>{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. How it works */}
      <section className="lp-in lp-block">
        <h2>How AdsVane works</h2>
        <div className="steps">
          <div className="step"><span>1</span><b>Search</b><p>Type what you need. We show the best matches near you first.</p></div>
          <div className="step"><span>2</span><b>Compare</b><p>See real photos, short videos and reviews from customers.</p></div>
          <div className="step"><span>3</span><b>Connect</b><p>Call, text or visit their page in one tap. No middleman.</p></div>
        </div>
      </section>

      {/* 5. For businesses */}
      <section className="lp-in lp-block">
        <div className="lp-forbiz">
          <div className="lp-forbiz-copy">
            <p className="lp-kicker">For businesses</p>
            <h2>Get found. Get booked. Get on the billboard.</h2>
            <ul>
              <li>A free profile with your photos, videos and reviews</li>
              <li>Post your work in seconds, right from your phone</li>
              <li>A QR code so happy customers leave reviews</li>
              <li>Promote your page and show up on the AdsVane Billboard</li>
            </ul>
            <div className="lp-forbiz-btns">
              <Link href={me ? "/dashboard" : "/signup"} className="b">Create your business profile</Link>
              {!me && <Link href="/login" className="b ghost">Log in</Link>}
            </div>
          </div>
          <div className="lp-forbiz-pic" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {pics[2] ? <img src={pics[2]} alt="" /> : <div className="split-empty" />}
          </div>
        </div>
      </section>

      <footer className="lp-foot">
        <div className="lp-in">
          <p className="lp-word small">Ads<span>Vane</span></p>
          <nav>
            <Link href="/find">Find services</Link>
            <Link href="/signup">Create business profile</Link>
            <Link href="/login">Log in</Link>
          </nav>
          <small>© {new Date().getFullYear()} AdsVane · Free listings for local businesses. Paid placements are always labeled Sponsored.</small>
        </div>
      </footer>
    </div>
  );
}
