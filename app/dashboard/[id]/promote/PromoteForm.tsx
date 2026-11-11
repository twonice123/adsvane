"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { estimate, money, starText, STATES } from "@/lib/data";
import { Logo } from "@/app/components/Logo";
import AddressInput from "@/app/components/AddressInput";
import PhotoUpload from "../photos/PhotoUpload";
import { AGE_MAX, AGE_MIN, MAX_RADIUS } from "@/lib/promo";
import { startPromotion, type PromoState } from "../../actions";

type Props = {
  biz: { id: string; name: string; logo_url: string | null; category: string; city: string; state: string; address: string };
  features: string[];
  rating: { rating: number; count: number } | null;
  optins: number;
  photos: { id: string; url: string }[];
};

type Spot = { key: string; kind: "place"; label: string; radius: number } | { key: string; kind: "state"; state: string };

const ages = Array.from({ length: AGE_MAX - AGE_MIN + 1 }, (_, i) => AGE_MIN + i);

export default function PromoteForm({ biz, features, rating, optins, photos }: Props) {
  const [state, action, pending] = useActionState<PromoState, FormData>(startPromotion, {});
  const [daily, setDaily] = useState(10);
  const [days, setDays] = useState(7);
  const [search, setSearch] = useState(true);
  const [email, setEmail] = useState(true);
  const [whole, setWhole] = useState(false);
  const [spots, setSpots] = useState<Spot[]>([{ key: "home", kind: "place", label: biz.address, radius: 15 }]);
  const [boxKey, setBoxKey] = useState(0);
  const [ageMin, setAgeMin] = useState(AGE_MIN);
  const [ageMax, setAgeMax] = useState(AGE_MAX);
  const [picked, setPicked] = useState<string[]>(photos.slice(0, 3).map((p) => p.id));

  // Pictures just added from this page go straight into the ad.
  const seen = useRef(new Set(photos.map((p) => p.id)));
  useEffect(() => {
    const fresh = photos.filter((p) => !seen.current.has(p.id)).map((p) => p.id);
    fresh.forEach((id) => seen.current.add(id));
    if (fresh.length) setPicked((p) => [...fresh, ...p].slice(0, 5));
  }, [photos]);

  const hasWhere = whole || spots.length > 0;
  const valid = daily >= 5 && daily <= 1000 && (search || email) && hasWhere;
  // How big an area this covers, for the rough estimate.
  const reach = Math.min(3, whole ? 3 : spots.reduce((s, x) => s + (x.kind === "state" ? 2 : Math.sqrt(x.radius / 10)), 0));
  const est = estimate(Math.round(daily * 100), days, 10 * reach * reach, search, email, optins);
  const n = (x: number) => x.toLocaleString("en-US");
  const targets = whole ? [{ kind: "us" }] : spots.map((s) => (s.kind === "state" ? { kind: "state", state: s.state } : { kind: "place", label: s.label, radius: s.radius }));
  const adPics = picked.map((id) => photos.find((p) => p.id === id)?.url).filter(Boolean) as string[];

  function addPlace(label: string) {
    const l = label.trim();
    if (!l) return;
    if (!spots.some((s) => s.kind === "place" && s.label.toLowerCase() === l.toLowerCase())) {
      setSpots([...spots, { key: crypto.randomUUID(), kind: "place", label: l, radius: 15 }]);
    }
    setBoxKey((k) => k + 1);
  }
  function addState(st: string) {
    if (!st || spots.some((s) => s.kind === "state" && s.state === st)) return;
    setSpots([...spots, { key: crypto.randomUUID(), kind: "state", state: st }]);
  }
  function togglePic(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 5 ? p : [...p, id]));
  }

  return (
    <div className="grid">
      <form action={action} className="stack">
        <input type="hidden" name="business_id" value={biz.id} />
        <input type="hidden" name="targets" value={JSON.stringify(targets)} />
        <input type="hidden" name="photo_ids" value={picked.join(",")} />
        <input type="hidden" name="age_min" value={ageMin} />
        <input type="hidden" name="age_max" value={ageMax} />

        <section className="card">
          <h2>1. Where your ad shows</h2>
          <p className="sub">Add the places where you want customers to see you. You can add as many as you like: an address, a city, a ZIP code or a whole state.</p>
          <label className="check">
            <input type="checkbox" checked={whole} onChange={(e) => setWhole(e.target.checked)} />
            <span><b>Whole United States</b><br /><span className="muted">Show to people searching anywhere in the US.</span></span>
          </label>
          {!whole && (
            <>
              <div className="pt-list">
                {spots.map((s) => (
                  <div key={s.key} className="pt-item">
                    <div className="pt-top">
                      <span className="pt-ic" aria-hidden="true">{s.kind === "state" ? "▦" : "⌖"}</span>
                      <b>{s.kind === "state" ? `All of ${STATES[s.state]}` : s.label}</b>
                      <button type="button" className="pt-x" aria-label={`Remove ${s.kind === "state" ? STATES[s.state] : s.label}`} onClick={() => setSpots(spots.filter((x) => x.key !== s.key))}>✕</button>
                    </div>
                    {s.kind === "place" && (
                      <label className="pt-r">
                        <span>Within <b>{s.radius} miles</b>{s.radius >= 60 ? " (about 1 hour drive)" : ""}</span>
                        <input
                          type="range"
                          min={1}
                          max={MAX_RADIUS}
                          value={s.radius}
                          aria-label={`Miles around ${s.label}`}
                          onChange={(e) => setSpots(spots.map((x) => (x.key === s.key ? { ...x, radius: Number(e.target.value) } : x)))}
                        />
                      </label>
                    )}
                  </div>
                ))}
                {spots.length === 0 && <p className="muted" style={{ margin: 0 }}>No places yet. Add one below.</p>}
              </div>
              <span className="lbl">Add a place</span>
              <div
                className="pt-add"
                onKeyDown={(e) => {
                  const el = e.target as HTMLInputElement;
                  if (e.key === "Enter" && el.tagName === "INPUT" && !e.defaultPrevented) {
                    e.preventDefault();
                    addPlace(el.value);
                  }
                }}
              >
                <AddressInput
                  key={boxKey}
                  name="_place"
                  className="in"
                  placeholder="Type or paste an address, city or ZIP"
                  ariaLabel="Add a place"
                  onPick={(p) => addPlace(p.label)}
                  pickText={(p) => p.label}
                />
                <button type="button" className="b ghost" onClick={(e) => addPlace((e.currentTarget.parentElement?.querySelector("input") as HTMLInputElement | null)?.value ?? "")}>
                  Add
                </button>
              </div>
              <span className="lbl">Or add a whole state</span>
              <select className="in" value="" onChange={(e) => addState(e.target.value)} aria-label="Add a whole state">
                <option value="">Choose a state…</option>
                {Object.entries(STATES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </>
          )}
        </section>

        <section className="card">
          <h2>2. Who sees it</h2>
          <span className="lbl">Age range</span>
          <div className="age-row">
            <select className="in" value={ageMin} aria-label="From age" onChange={(e) => { const v = Number(e.target.value); setAgeMin(v); if (v > ageMax) setAgeMax(v); }}>
              {ages.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <span>to</span>
            <select className="in" value={ageMax} aria-label="To age" onChange={(e) => { const v = Number(e.target.value); setAgeMax(v); if (v < ageMin) setAgeMin(v); }}>
              {ages.map((a) => <option key={a} value={a}>{a === AGE_MAX ? "65+" : a}</option>)}
            </select>
          </div>
          <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>AdsVane doesn&apos;t ask customers their age yet, so for now your ad shows to everyone in your places. Your age range is saved and will be used once we do.</p>
          <span className="lbl">Where on AdsVane</span>
          <label className="check"><input type="checkbox" name="show_in_search" checked={search} onChange={(e) => setSearch(e.target.checked)} /><span><b>Top of AdsVane search</b><br /><span className="muted">Marked “Sponsored” above other results.</span></span></label>
          <label className="check"><input type="checkbox" name="show_in_email" checked={email} onChange={(e) => setEmail(e.target.checked)} /><span><b>Featured in customer emails</b><br /><span className="muted">Sent only to customers who opted in, at most one promo email a week each.</span></span></label>
        </section>

        <section className="card">
          <h2>3. Pictures for your ad</h2>
          <p className="sub">Pick up to 5 of your photos to show in your ad, or add new ones.</p>
          <div className="ad-pics">
            {photos.map((p) => {
              const i = picked.indexOf(p.id);
              return (
                <button key={p.id} type="button" className={`ad-pic${i >= 0 ? " on" : ""}`} aria-pressed={i >= 0} aria-label={i >= 0 ? `Photo ${i + 1} in your ad, tap to remove` : "Use this photo in your ad"} onClick={() => togglePic(p.id)}>
                  <img src={p.url} alt="" loading="lazy" />
                  {i >= 0 && <span className="ad-n">{i + 1}</span>}
                </button>
              );
            })}
          </div>
          {photos.length === 0 && <p className="muted">You haven&apos;t posted any photos yet. Ads with pictures get far more visits.</p>}
          <PhotoUpload businessId={biz.id} kind="gallery" label="+ Add pictures" multiple className="b ghost" />
        </section>

        <section className="card">
          <h2>4. Budget</h2>
          <label className="lbl" htmlFor="daily">Daily budget</label>
          <div className="bud-row">
            <input type="range" min={5} max={500} step={1} value={Math.min(daily, 500)} aria-label="Daily budget slider" onChange={(e) => setDaily(Number(e.target.value))} />
            <div className="bud-in">
              <span aria-hidden="true">$</span>
              <input id="daily" name="daily" type="number" inputMode="numeric" min={5} max={1000} step={1} value={daily || ""} onChange={(e) => setDaily(Number(e.target.value))} />
            </div>
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>Drag the bar or type any amount from $5 to $1,000 a day.</p>
          <span className="lbl">How long</span>
          <input type="hidden" name="days" value={days} />
          <div className="seg">
            {[3, 7, 14, 30].map((d) => (
              <button key={d} type="button" className={d === days ? "on" : ""} aria-pressed={d === days} onClick={() => setDays(d)}>{d} days</button>
            ))}
          </div>
          <p style={{ marginBottom: 0 }}>Total: <b>{money(Math.round((daily || 0) * 100) * days)}</b> over {days} days.</p>
        </section>

        {state.error && <p className="err" role="alert">{state.error}</p>}
        {daily < 5 && <p className="err">The daily budget must be at least $5.</p>}
        {daily > 1000 && <p className="err">The daily budget can be at most $1,000.</p>}
        {!search && !email && <p className="err">Pick at least one place on AdsVane to show your ad.</p>}
        {!hasWhere && <p className="err">Add at least one place where your ad should show.</p>}
        <div className="note">Payments aren&apos;t connected yet, so promotions run at no charge while AdsVane is in early access.</div>
        <button className="b" type="submit" disabled={pending || !valid}>{pending ? "Starting…" : "Promote profile"}</button>
      </form>

      <aside className="stack">
        <section className="card">
          <h2>Your ad</h2>
          <p className="muted" style={{ marginTop: 0, fontSize: 14 }}>
            {whole ? "Whole United States" : spots.map((s) => (s.kind === "state" ? STATES[s.state] : `${s.label.split(",")[0]} (${s.radius} mi)`)).join(" · ") || "No places yet"}
            {" · "}Ages {ageMin}–{ageMax === AGE_MAX ? "65+" : ageMax}
          </p>
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
              {adPics.length > 0 && (
                <div className="thumbs" style={{ gridColumn: "1 / -1" }}>
                  {adPics.map((u) => <img key={u} src={u} alt="" />)}
                </div>
              )}
            </div>
          </section>
        )}
        {email && (
          <section className="card">
            <h2>Email preview</h2>
            <div className="mail">
              <div className="mail-top"><Logo name={biz.name} url={biz.logo_url} /></div>
              {adPics[0] && <img className="mail-pic" src={adPics[0]} alt="" />}
              <div className="mail-body">
                <p className="eyebrow">Featured near you</p>
                <h3 style={{ fontFamily: "Georgia,serif" }}>{biz.name}</h3>
                {rating && <p style={{ margin: "2px 0" }}><span className="stars">{starText(rating.rating)}</span> {rating.rating.toFixed(1)}</p>}
                <p className="muted" style={{ margin: "4px 0 12px" }}>{features.length ? features.join(" · ") : `${biz.category} in ${biz.city}`}</p>
                <span className="b" style={{ fontSize: 14 }}>View profile</span>
                <p className="muted" style={{ fontSize: 11, marginTop: 14 }}>Sponsored · You&apos;re getting this because you asked for local picks. Unsubscribe</p>
              </div>
            </div>
          </section>
        )}
      </aside>
    </div>
  );
}
