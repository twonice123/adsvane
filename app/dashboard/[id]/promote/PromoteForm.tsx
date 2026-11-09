"use client";
import { useActionState, useState } from "react";
import { estimate, money, starText } from "@/lib/data";
import { Logo } from "@/app/components/Logo";
import { startPromotion, type PromoState } from "../../actions";

type Props = {
  biz: { id: string; name: string; logo_url: string | null; category: string; city: string; state: string };
  features: string[];
  rating: { rating: number; count: number } | null;
  optins: number;
};

export default function PromoteForm({ biz, features, rating, optins }: Props) {
  const [state, action, pending] = useActionState<PromoState, FormData>(startPromotion, {});
  const [daily, setDaily] = useState(10);
  const [days, setDays] = useState(7);
  const [radius, setRadius] = useState(10);
  const [search, setSearch] = useState(true);
  const [email, setEmail] = useState(true);
  const valid = daily >= 5 && (search || email);
  const est = estimate(Math.round(daily * 100), days, radius, search, email, optins);
  const n = (x: number) => x.toLocaleString("en-US");

  return (
    <div className="grid">
      <form action={action} className="stack">
        <input type="hidden" name="business_id" value={biz.id} />
        <section className="card">
          <h2>1. Where it shows</h2>
          <label className="check"><input type="checkbox" name="show_in_search" checked={search} onChange={(e) => setSearch(e.target.checked)} /><span><b>Top of AdsVane search</b><br /><span className="muted">Marked “Sponsored” above other results.</span></span></label>
          <label className="check"><input type="checkbox" name="show_in_email" checked={email} onChange={(e) => setEmail(e.target.checked)} /><span><b>Featured in customer emails</b><br /><span className="muted">Sent only to customers nearby who opted in, at most one promo email a week each.</span></span></label>
        </section>
        <section className="card">
          <h2>2. Who sees it</h2>
          <label className="lbl" htmlFor="radius">People within {radius} miles of {biz.city}</label>
          <input id="radius" name="radius" type="range" min={2} max={30} value={radius} onChange={(e) => setRadius(Number(e.target.value))} />
        </section>
        <section className="card">
          <h2>3. Budget</h2>
          <div className="fld">
            <label htmlFor="daily">Daily budget (minimum $5)</label>
            <input id="daily" name="daily" type="number" min={5} max={1000} step={1} value={daily} onChange={(e) => setDaily(Number(e.target.value))} />
          </div>
          <span className="lbl">How long</span>
          <input type="hidden" name="days" value={days} />
          <div className="seg">
            {[3, 7, 14, 30].map((d) => (
              <button key={d} type="button" className={d === days ? "on" : ""} aria-pressed={d === days} onClick={() => setDays(d)}>{d} days</button>
            ))}
          </div>
          <p style={{ marginBottom: 0 }}>Total: <b>{money(Math.round(daily * 100) * days)}</b> over {days} days.</p>
        </section>
        {state.error && <p className="err" role="alert">{state.error}</p>}
        {daily < 5 && <p className="err">The daily budget must be at least $5.</p>}
        {!search && !email && <p className="err">Pick at least one place to show your profile.</p>}
        <div className="note">Payments aren&apos;t connected yet, so promotions run at no charge while AdsVane is in early access.</div>
        <button className="b" type="submit" disabled={pending || !valid}>{pending ? "Starting…" : "Promote profile"}</button>
      </form>

      <aside className="stack">
        <section className="card">
          <h2>Estimated results</h2>
          <div className="kpis">
            <div className="kpi"><b>{n(est.views)}</b><span>search views</span></div>
            <div className="kpi"><b>{n(est.emails)}</b><span>emails</span></div>
            <div className="kpi"><b>{n(est.visits)}</b><span>profile visits</span></div>
          </div>
          <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>Rough estimates. {optins === 0 ? "No customers have opted in to emails yet, so emails start once they do." : `${n(optins)} customer${optins === 1 ? " has" : "s have"} opted in to emails so far.`}</p>
        </section>
        {search && (
          <section className="card">
            <h2>Search preview</h2>
            <div className="row sponsored" style={{ gridTemplateColumns: "48px 1fr" }}>
              <Logo name={biz.name} url={biz.logo_url} size="sm" />
              <div>
                <h3 style={{ fontSize: 16 }}>{biz.name}<span className="spon">Sponsored</span></h3>
                <p>{biz.category} · {biz.city}, {biz.state}</p>
                {rating && <p><span className="stars">{starText(rating.rating)}</span> {rating.rating.toFixed(1)} ({rating.count})</p>}
              </div>
            </div>
          </section>
        )}
        {email && (
          <section className="card">
            <h2>Email preview</h2>
            <div className="mail">
              <div className="mail-top"><Logo name={biz.name} url={biz.logo_url} /></div>
              <div className="mail-body">
                <p className="eyebrow">Featured near you</p>
                <h3 style={{ fontFamily: "Georgia,serif" }}>{biz.name}</h3>
                {rating && <p style={{ margin: "2px 0" }}><span className="stars">{starText(rating.rating)}</span> {rating.rating.toFixed(1)}</p>}
                <p className="muted" style={{ margin: "4px 0 12px" }}>{features.length ? features.join(" · ") : `${biz.category} in ${biz.city}`}</p>
                <span className="b" style={{ fontSize: 14 }}>View profile</span>
                <p className="muted" style={{ fontSize: 11, marginTop: 14 }}>Sponsored · You're getting this because you asked for local picks. Unsubscribe</p>
              </div>
            </div>
          </section>
        )}
      </aside>
    </div>
  );
}
