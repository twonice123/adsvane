"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { estimate, money, starText, STATES } from "@/lib/data";
import { Logo } from "@/app/components/Logo";
import AddressInput from "@/app/components/AddressInput";
import PhotoUpload from "../photos/PhotoUpload";
import { AGE_MAX, AGE_MIN, MAX_RADIUS, type Target } from "@/lib/promo";
import { startPromotion, type PromoState } from "../../actions";

export type Audience = { id: string; name: string; targets: Target[]; age_min: number };

type Props = {
  biz: { id: string; name: string; logo_url: string | null; category: string; city: string; state: string; address: string; website: string | null };
  features: string[];
  rating: { rating: number; count: number } | null;
  optins: number;
  photos: { id: string; url: string }[];
  audiences: Audience[];
};

// One place in an audience being built.
type Spot =
  | { key: string; kind: "us" }
  | { key: string; kind: "state"; state: string }
  | { key: string; kind: "place"; label: string; radius: number; lat?: number; lng?: number; local: boolean };

const STEPS = ["Goal", "Audience", "Budget", "Review"];
const ages = Array.from({ length: AGE_MAX - AGE_MIN + 1 }, (_, i) => AGE_MIN + i);
const key = () => Math.random().toString(36).slice(2);

function spotText(s: Spot) {
  return s.kind === "us" ? "United States" : s.kind === "state" ? STATES[s.state] : `${s.label.split(",").slice(0, 2).join(",")} + ${s.radius} mi`;
}
function toSpots(ts: Target[]): Spot[] {
  return ts.map((t) =>
    t.kind === "us" ? { key: key(), kind: "us" } : t.kind === "state" ? { key: key(), kind: "state", state: t.state } : { key: key(), kind: "place", label: t.label, radius: t.radius, lat: t.lat, lng: t.lng, local: true },
  );
}

export default function PromoteForm({ biz, features, rating, optins, photos, audiences }: Props) {
  const [state, action, pending] = useActionState<PromoState, FormData>(startPromotion, {});
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<"profile" | "website">("profile");
  const [search, setSearch] = useState(true);
  const [email, setEmail] = useState(true);

  // Audience: suggested (near the shop), a saved one, or your own.
  const [aud, setAud] = useState<string>("suggested");
  const [name, setName] = useState("");
  const [save, setSave] = useState(true);
  const [tab, setTab] = useState<"regional" | "local">("regional");
  const [own, setOwn] = useState<Spot[]>([]);
  const [ownAge, setOwnAge] = useState(AGE_MIN);
  const [boxKey, setBoxKey] = useState(0);
  const [radius, setRadius] = useState(15);
  const [locErr, setLocErr] = useState("");

  const [daily, setDaily] = useState(10);
  const [days, setDays] = useState(7);
  const [picked, setPicked] = useState<string[]>(photos.slice(0, 3).map((p) => p.id));

  // Pictures just added from this page go straight into the ad.
  const seen = useRef(new Set(photos.map((p) => p.id)));
  useEffect(() => {
    const fresh = photos.filter((p) => !seen.current.has(p.id)).map((p) => p.id);
    fresh.forEach((id) => seen.current.add(id));
    if (fresh.length) setPicked((p) => [...fresh, ...p].slice(0, 5));
  }, [photos]);

  const suggested: Spot[] = [{ key: "home", kind: "place", label: biz.address, radius: 15, local: true }];
  const saved = audiences.find((a) => a.id === aud);
  const spots: Spot[] = aud === "suggested" ? suggested : aud === "own" ? own : saved ? toSpots(saved.targets) : suggested;
  const ageMin = aud === "own" ? ownAge : saved ? saved.age_min : AGE_MIN;
  const audLabel = aud === "suggested" ? "Suggested audience" : aud === "own" ? name.trim() || "Your own audience" : saved?.name || "";
  const targets = spots.map((s) => (s.kind === "us" ? { kind: "us" } : s.kind === "state" ? { kind: "state", state: s.state } : { kind: "place", label: s.label, radius: s.radius, lat: s.lat, lng: s.lng }));

  const whole = spots.some((s) => s.kind === "us");
  const reach = Math.min(3, whole ? 3 : spots.reduce((s, x) => s + (x.kind === "state" ? 2 : x.kind === "place" ? Math.sqrt(x.radius / 10) : 0), 0));
  const est = estimate(Math.round((daily || 0) * 100), days, 10 * reach * reach, search, email, optins);
  const n = (x: number) => x.toLocaleString("en-US");
  const adPics = picked.map((id) => photos.find((p) => p.id === id)?.url).filter(Boolean) as string[];

  const stepOk = [
    (search || email) && (goal === "profile" || !!biz.website),
    spots.length > 0,
    daily >= 5 && daily <= 1000,
    true,
  ];
  const stepMsg = [
    !(search || email) ? "Pick at least one place on AdsVane to show your ad." : goal === "website" && !biz.website ? "Add your website in Edit profile first, or pick Visit your profile." : "",
    spots.length ? "" : "Add at least one location to your audience.",
    daily < 5 ? "The daily budget must be at least $5." : daily > 1000 ? "The daily budget can be at most $1,000." : "",
    "",
  ];

  function addOwn(s: Spot) {
    setOwn((cur) => {
      if (s.kind === "us") return [s, ...cur.filter((x) => x.kind !== "us")];
      if (s.kind === "state" && cur.some((x) => x.kind === "state" && x.state === s.state)) return cur;
      if (s.kind === "place" && cur.some((x) => x.kind === "place" && x.label.toLowerCase() === s.label.toLowerCase())) return cur;
      return [...cur, s];
    });
  }
  function addPlace(label: string, local: boolean) {
    const l = label.trim();
    if (!l) return;
    addOwn({ key: key(), kind: "place", label: l, radius: local ? radius : 15, local });
    setBoxKey((k) => k + 1);
  }
  function hereNow() {
    setLocErr("");
    if (!navigator.geolocation) return setLocErr("This phone can't share its location.");
    navigator.geolocation.getCurrentPosition(
      (p) => addOwn({ key: key(), kind: "place", label: "Your current location", lat: p.coords.latitude, lng: p.coords.longitude, radius, local: true }),
      () => setLocErr("We couldn't get your location. Turn on Location for this website, or type an address."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }
  function togglePic(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 5 ? p : [...p, id]));
  }
  const enterAdds = (local: boolean) => (e: React.KeyboardEvent) => {
    const el = e.target as HTMLInputElement;
    if (e.key === "Enter" && el.tagName === "INPUT" && !e.defaultPrevented) {
      e.preventDefault();
      addPlace(el.value, local);
    }
  };
  const radioRow = (on: boolean, onPick: () => void, title: React.ReactNode, sub: React.ReactNode, disabled = false) => (
    <label className={`opt${on ? " on" : ""}${disabled ? " off" : ""}`}>
      <span className="opt-t">
        <b>{title}</b>
        <span>{sub}</span>
      </span>
      <input type="radio" checked={on} disabled={disabled} onChange={onPick} />
    </label>
  );

  return (
    <form
      action={action}
      className="wiz"
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT" && step < 3) e.preventDefault();
      }}
    >
      <input type="hidden" name="business_id" value={biz.id} />
      <input type="hidden" name="goal" value={goal} />
      <input type="hidden" name="targets" value={JSON.stringify(targets)} />
      <input type="hidden" name="age_min" value={ageMin} />
      <input type="hidden" name="audience_name" value={aud === "own" ? name.trim() : saved ? saved.name : ""} />
      {aud === "own" && save && <input type="hidden" name="save_audience" value="on" />}
      <input type="hidden" name="photo_ids" value={picked.join(",")} />
      <input type="hidden" name="daily" value={daily || 0} />
      <input type="hidden" name="days" value={days} />
      {search && <input type="hidden" name="show_in_search" value="on" />}
      {email && <input type="hidden" name="show_in_email" value="on" />}

      <div className="wiz-bar" aria-hidden="true">
        {STEPS.map((s, i) => <span key={s} className={i <= step ? "on" : ""} />)}
      </div>
      <p className="wiz-step">Step {step + 1} of {STEPS.length} · {STEPS[step]}</p>

      {step === 0 && (
        <section className="card">
          <h2 className="wiz-q">What do you want people to do when they see your ad?</h2>
          {radioRow(goal === "profile", () => setGoal("profile"), "Visit your profile", "Best for getting known. People land on your AdsVane page to see your photos, reviews and how to reach you.")}
          {radioRow(
            goal === "website",
            () => setGoal("website"),
            "Visit your website",
            biz.website ? <>Best for online bookings and sales. Tapping your ad opens <b>{biz.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</b></> : "Add your website in Edit profile to use this.",
            !biz.website,
          )}
          <h3 className="wiz-h">Where on AdsVane</h3>
          <label className="check"><input type="checkbox" checked={search} onChange={(e) => setSearch(e.target.checked)} /><span><b>Top of AdsVane search</b><br /><span className="muted">Marked “Sponsored” above other results.</span></span></label>
          <label className="check"><input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} /><span><b>Featured in customer emails</b><br /><span className="muted">Sent only to customers who opted in, at most one promo email a week each.</span></span></label>
        </section>
      )}

      {step === 1 && (
        <section className="card">
          <h2 className="wiz-q">Who should see your ad?</h2>
          {radioRow(aud === "suggested", () => setAud("suggested"), "Suggested audience", <>People near your shop<br /><span className="muted">{biz.address} + 15 mi · Age 18+</span></>)}
          {audiences.map((a) => radioRow(aud === a.id, () => setAud(a.id), a.name, <span className="muted">{toSpots(a.targets).map(spotText).join(" · ")} · Age {a.age_min}+</span>))}
          {radioRow(aud === "own", () => setAud("own"), "Create your own", "Pick your locations and minimum age, and give your audience a name.")}

          {aud === "own" && (
            <div className="aud">
              <label className="lbl" htmlFor="aud-name">Audience name</label>
              <input id="aud-name" className="in" value={name} maxLength={60} placeholder="e.g. Maryland braids clients" onChange={(e) => setName(e.target.value)} />
              <label className="check" style={{ marginTop: 8 }}>
                <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} />
                <span>Save this audience so I can use it again</span>
              </label>

              <h3 className="wiz-h">Locations</h3>
              {own.length > 0 ? (
                <div className="pt-list">
                  {own.map((s) => (
                    <div key={s.key} className="pt-item">
                      <div className="pt-top">
                        <span className="pt-ic" aria-hidden="true">{s.kind === "place" ? "⌖" : "▦"}</span>
                        <b>{s.kind === "us" ? "United States" : s.kind === "state" ? STATES[s.state] : s.label}</b>
                        <button type="button" className="pt-x" aria-label={`Remove ${spotText(s)}`} onClick={() => setOwn(own.filter((x) => x.key !== s.key))}>✕</button>
                      </div>
                      {s.kind === "place" && (
                        <label className="pt-r">
                          <span>Radius <b>{s.radius} mi</b>{s.radius >= 60 ? " (about 1 hour drive)" : ""}</span>
                          <input type="range" min={1} max={MAX_RADIUS} value={s.radius} aria-label={`Miles around ${s.label}`} onChange={(e) => setOwn(own.map((x) => (x.key === s.key ? { ...x, radius: Number(e.target.value) } : x)))} />
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted" style={{ marginTop: 0 }}>No locations yet. Add a region or a local address below.</p>
              )}

              <div className="seg-tabs" role="tablist">
                <button type="button" role="tab" aria-selected={tab === "regional"} className={tab === "regional" ? "on" : ""} onClick={() => setTab("regional")}>Regional</button>
                <button type="button" role="tab" aria-selected={tab === "local"} className={tab === "local" ? "on" : ""} onClick={() => setTab("local")}>Local</button>
              </div>

              {tab === "regional" ? (
                <div className="tabbox">
                  <div className="pt-add" onKeyDown={enterAdds(false)}>
                    <AddressInput key={boxKey} name="_region" className="in" placeholder="Add locations: a city or ZIP" ariaLabel="Add a city or ZIP" onPick={(p) => addPlace(p.label, false)} />
                  </div>
                  <div className="chips">
                    <button type="button" className="wchip" onClick={() => addOwn({ key: key(), kind: "us" })}>+ United States</button>
                  </div>
                  <select className="in" value="" onChange={(e) => e.target.value && addOwn({ key: key(), kind: "state", state: e.target.value })} aria-label="Add a state">
                    <option value="">+ Add a state…</option>
                    {Object.entries(STATES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>Adding more cities and states lets more people see your ad.</p>
                </div>
              ) : (
                <div className="tabbox">
                  <button type="button" className="b ghost" style={{ width: "100%" }} onClick={hereNow}>⌖ Use my current location</button>
                  {locErr && <p className="err">{locErr}</p>}
                  <span className="lbl" style={{ marginTop: 12 }}>Address</span>
                  <div className="pt-add" onKeyDown={enterAdds(true)}>
                    <AddressInput key={boxKey} name="_addr" className="in" placeholder="Type or paste an address" ariaLabel="Add an address" onPick={(p) => addPlace(p.label, true)} />
                  </div>
                  <label className="pt-r">
                    <span>Radius for new addresses: <b>{radius} mi</b></span>
                    <input type="range" min={1} max={MAX_RADIUS} value={radius} onChange={(e) => setRadius(Number(e.target.value))} aria-label="Radius" />
                  </label>
                </div>
              )}

              <h3 className="wiz-h">Minimum age</h3>
              <select className="in" value={ownAge} aria-label="Minimum age" onChange={(e) => setOwnAge(Number(e.target.value))}>
                {ages.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>AdsVane doesn&apos;t ask customers their age yet, so for now your ad shows to everyone in your locations.</p>
            </div>
          )}
        </section>
      )}

      {step === 2 && (
        <>
          <section className="card">
            <h2 className="wiz-q">Budget and duration</h2>
            <label className="lbl" htmlFor="daily">Daily budget</label>
            <div className="bud-row">
              <input type="range" min={5} max={500} step={1} value={Math.min(daily || 5, 500)} aria-label="Daily budget slider" onChange={(e) => setDaily(Number(e.target.value))} />
              <div className="bud-in">
                <span aria-hidden="true">$</span>
                <input id="daily" type="number" inputMode="numeric" min={5} max={1000} step={1} value={daily || ""} onChange={(e) => setDaily(Number(e.target.value))} />
              </div>
            </div>
            <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>Drag the bar or type any amount from $5 to $1,000 a day.</p>
            <span className="lbl">Duration</span>
            <div className="seg">
              {[3, 7, 14, 30].map((d) => (
                <button key={d} type="button" className={d === days ? "on" : ""} aria-pressed={d === days} onClick={() => setDays(d)}>{d} days</button>
              ))}
            </div>
            <p style={{ marginBottom: 0 }}>Total: <b>{money(Math.round((daily || 0) * 100) * days)}</b> over {days} days.</p>
          </section>
          <section className="card">
            <h2>Pictures for your ad</h2>
            <p className="sub">Pick up to 5 of your photos, or add new ones.</p>
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
        </>
      )}

      {step === 3 && (
        <>
          <section className="card">
            <h2 className="wiz-q">Review your ad</h2>
            <dl className="rev">
              <dt>Goal</dt><dd>{goal === "website" ? "Visit your website" : "Visit your profile"}<button type="button" className="lnk" onClick={() => setStep(0)}>Edit</button></dd>
              <dt>Audience</dt><dd>{audLabel}<br /><span className="muted">{spots.map(spotText).join(" · ")} · Age {ageMin}+</span><button type="button" className="lnk" onClick={() => setStep(1)}>Edit</button></dd>
              <dt>Budget</dt><dd>{money(Math.round(daily * 100))} a day for {days} days · <b>{money(Math.round(daily * 100) * days)}</b> total<button type="button" className="lnk" onClick={() => setStep(2)}>Edit</button></dd>
              <dt>Shows in</dt><dd>{[search && "AdsVane search", email && "customer emails"].filter(Boolean).join(" and ")}</dd>
            </dl>
            <div className="kpis">
              <div className="kpi"><b>{n(est.views)}</b><span>search views</span></div>
              <div className="kpi"><b>{n(est.emails)}</b><span>emails</span></div>
              <div className="kpi"><b>{n(est.visits)}</b><span>{goal === "website" ? "website visits" : "profile visits"}</span></div>
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
                <span className="b" style={{ gridColumn: "1 / -1", textAlign: "center", fontSize: 14 }}>{goal === "website" ? "Visit website" : "View profile"}</span>
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
                  <span className="b" style={{ fontSize: 14 }}>{goal === "website" ? "Visit website" : "View profile"}</span>
                  <p className="muted" style={{ fontSize: 11, marginTop: 14 }}>Sponsored · You&apos;re getting this because you asked for local picks. Unsubscribe</p>
                </div>
              </div>
            </section>
          )}
          <div className="note">Payments aren&apos;t connected yet, so promotions run at no charge while AdsVane is in early access.</div>
        </>
      )}

      {state.error && <p className="err" role="alert">{state.error}</p>}
      {stepMsg[step] && <p className="err">{stepMsg[step]}</p>}
      <div className="wiz-nav">
        {step > 0 && <button key="back" type="button" className="b ghost" onClick={() => setStep(step - 1)}>Back</button>}
        {step < 3 ? (
          <button key="next" type="button" className="b" disabled={!stepOk[step]} onClick={() => { setStep(step + 1); window.scrollTo({ top: 0 }); }}>Next</button>
        ) : (
          <button key="go" type="submit" className="b" disabled={pending || !stepOk.every(Boolean)}>{pending ? "Starting…" : "Promote now"}</button>
        )}
      </div>
    </form>
  );
}
