"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { estimate, money } from "@/lib/data";
import AddressInput from "@/app/components/AddressInput";
import PhotoUpload from "../photos/PhotoUpload";
import { MAX_RADIUS } from "@/lib/promo";
import { startPromotion, type PromoState } from "../../actions";

type Post = { id: string; url: string; video: string | null };
type Props = {
  biz: { id: string; name: string; logo_url: string | null; category: string; city: string; state: string; address: string; website: string | null };
  optins: number;
  photos: Post[];
};
type Objective = "views" | "profile" | "website";

const DAYS = [3, 7, 14, 30];
const MIN_DAILY = 5;

// Promote one post: pick it, pick what you want (views or visits), where, and how much.
export default function PromoteForm({ biz, optins, photos }: Props) {
  const [state, action, pending] = useActionState<PromoState, FormData>(startPromotion, {});
  const [post, setPost] = useState<string>(photos[0]?.id || "");
  const [objective, setObjective] = useState<Objective>("views");
  const [where, setWhere] = useState<"local" | "us">("local");
  const [place, setPlace] = useState<string>("");
  const [boxKey, setBoxKey] = useState(0);
  const [radius, setRadius] = useState(15);
  const [days, setDays] = useState(7);
  const [total, setTotal] = useState(50);
  const [editing, setEditing] = useState(false);

  // A post just added from this page is picked straight away.
  const seen = useRef(new Set(photos.map((p) => p.id)));
  useEffect(() => {
    const fresh = photos.find((p) => !seen.current.has(p.id));
    photos.forEach((p) => seen.current.add(p.id));
    if (fresh) setPost(fresh.id);
  }, [photos]);

  const min = MIN_DAILY * days;
  const packs = [min, Math.max(min * 2, 50), Math.max(min * 4, 100)].filter((v, i, a) => a.indexOf(v) === i);
  const daily = total / days;
  const reachMiles = where === "us" ? 300 : radius;
  const est = estimate(Math.round(daily * 100), days, reachMiles, true, false, optins);
  const n = (x: number) => x.toLocaleString("en-US");
  const range = (x: number) => `${n(Math.round(x * 0.6))} – ${n(Math.round(x * 1.4))}`;
  const pick = photos.find((p) => p.id === post);

  const problem = !post
    ? "Pick a post to promote."
    : objective === "website" && !biz.website
      ? "Add your website in Edit profile first."
      : where === "local" && !place
        ? "Type the address where your ad should show, then pick it from the list."
        : !Number.isFinite(total) || total < min
          ? `For ${days} days the lowest amount is ${money(min * 100)}.`
          : total > 1000 * days
            ? "That amount is too high."
            : "";

  const targets = where === "us" ? [{ kind: "us" }] : place ? [{ kind: "place", label: place, radius }] : [];
  const choice = (k: Objective, title: string, sub: string, disabled = false) => (
    <button type="button" key={k} className={`pr-goal${objective === k ? " on" : ""}`} aria-pressed={objective === k} disabled={disabled} onClick={() => setObjective(k)}>
      <b>{title}</b>
      <span>{sub}</span>
    </button>
  );

  return (
    <form action={action} className="wiz pr" onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT" && e.preventDefault()}>
      <input type="hidden" name="business_id" value={biz.id} />
      <input type="hidden" name="objective" value={objective} />
      <input type="hidden" name="goal" value={objective === "website" ? "website" : "profile"} />
      <input type="hidden" name="targets" value={JSON.stringify(targets)} />
      <input type="hidden" name="age_min" value={18} />
      <input type="hidden" name="photo_ids" value={post} />
      <input type="hidden" name="daily" value={daily.toFixed(2)} />
      <input type="hidden" name="days" value={days} />
      <input type="hidden" name="show_in_search" value="on" />

      <section className="card">
        <h2 className="wiz-q">Pick a post to promote</h2>
        {photos.length > 0 ? (
          <div className="pr-posts">
            {photos.map((p) => (
              <button key={p.id} type="button" className={`pr-post${post === p.id ? " on" : ""}`} aria-pressed={post === p.id} aria-label={p.video ? "Promote this video" : "Promote this photo"} onClick={() => setPost(p.id)}>
                {p.url ? <img src={p.url} alt="" loading="lazy" /> : p.video ? <video src={p.video} muted playsInline preload="metadata" /> : null}
                {p.video && (
                  <span className="pr-play" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="16" height="16"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
                  </span>
                )}
                <span className="pr-tick" aria-hidden="true">{post === p.id ? "✓" : ""}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="muted">You haven&apos;t posted yet. Add a video or photo to promote.</p>
        )}
        <PhotoUpload businessId={biz.id} kind="gallery" label="+ New post" className="b ghost" />
      </section>

      <section className="card">
        <h2 className="wiz-q">What do you want?</h2>
        <div className="pr-goals">
          {choice("views", "More views", "Show your post to more people nearby.")}
          {choice("profile", "More profile visits", "Get people to tap into your page, see your work and contact you.")}
          {choice("website", "More website visits", biz.website ? `Send people to ${biz.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}` : "Add your website in Edit profile to use this.", !biz.website)}
        </div>
      </section>

      <section className="card">
        <h2 className="wiz-q">Where should it show?</h2>
        <div className="seg-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={where === "local"} className={where === "local" ? "on" : ""} onClick={() => setWhere("local")}>Local</button>
          <button type="button" role="tab" aria-selected={where === "us"} className={where === "us" ? "on" : ""} onClick={() => setWhere("us")}>Nationwide</button>
        </div>
        {where === "local" ? (
          <>
            {place ? (
              <div className="pr-place">
                <span aria-hidden="true">📍</span>
                <b>{place}</b>
                <button type="button" className="lnk" onClick={() => { setPlace(""); setBoxKey((k) => k + 1); }}>Change</button>
              </div>
            ) : (
              <>
                <label className="lbl" htmlFor="pr-addr">Address, city or ZIP</label>
                <AddressInput key={boxKey} id="pr-addr" name="_addr" className="in" placeholder="Start typing, e.g. Bowie, MD" ariaLabel="Where your ad shows" onPick={(p) => setPlace(p.label)} />
                {biz.address && (
                  <button type="button" className="wchip" style={{ marginTop: 10 }} onClick={() => setPlace(biz.address)}>Use my shop address</button>
                )}
              </>
            )}
            <label className="pt-r">
              <span>Distance around it: <b>{radius} miles</b></span>
              <input type="range" min={1} max={MAX_RADIUS} value={radius} onChange={(e) => setRadius(Number(e.target.value))} aria-label="Miles around the address" />
            </label>
            <p className="muted" style={{ fontSize: 13, margin: "4px 0 0" }}>Up to {MAX_RADIUS} miles. Your ad can run in another city or state from your shop.</p>
          </>
        ) : (
          <p style={{ margin: 0 }}>Your ad shows to people anywhere in the United States.</p>
        )}
      </section>

      <section className="card">
        <h2 className="wiz-q">How much?</h2>
        <span className="lbl">Run it for</span>
        <div className="seg">
          {DAYS.map((d) => (
            <button key={d} type="button" className={d === days ? "on" : ""} aria-pressed={d === days} onClick={() => { setDays(d); if (total < MIN_DAILY * d) setTotal(MIN_DAILY * d); }}>{d} days</button>
          ))}
        </div>
        <div className="pr-packs">
          {packs.map((v) => (
            <button key={v} type="button" className={`pr-pack${!editing && total === v ? " on" : ""}`} onClick={() => { setTotal(v); setEditing(false); }}>
              <b>{money(v * 100)}</b>
              <span>{range(estimate(Math.round((v / days) * 100), days, reachMiles, true, false, optins).views)} views</span>
            </button>
          ))}
        </div>
        <div className={`pr-amount${editing ? " on" : ""}`}>
          <span>Your amount</span>
          {editing ? (
            <span className="bud-in">
              <span aria-hidden="true">$</span>
              <input type="number" inputMode="numeric" min={min} step={1} value={total || ""} autoFocus aria-label="Total amount in dollars" onChange={(e) => setTotal(Number(e.target.value))} onBlur={() => setEditing(false)} />
            </span>
          ) : (
            <button type="button" className="pr-edit" onClick={() => setEditing(true)} aria-label="Edit amount">
              {money(Math.round(total * 100))}
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
            </button>
          )}
        </div>
        <div className="kpis" style={{ marginTop: 14 }}>
          <div className="kpi"><b>{range(est.views)}</b><span>views</span></div>
          <div className="kpi"><b>{range(est.visits)}</b><span>{objective === "website" ? "website visits" : "profile visits"}</span></div>
          <div className="kpi"><b>{money(Math.round(daily * 100))}</b><span>a day</span></div>
        </div>
        <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>Results are estimates.</p>
      </section>

      <div className="note">Promotions are free during early access. You won&apos;t be charged.</div>

      {(state.error || problem) && <p className="err" role="alert">{state.error || problem}</p>}
      <div className="pr-pay">
        <div>
          <span className="muted">Total</span>
          <b>{money(Math.round((total || 0) * 100))}</b>
        </div>
        {pick && <img src={pick.url} alt="" className="pr-mini" />}
        <button type="submit" className="b" disabled={pending || !!problem}>{pending ? "Starting…" : "Promote"}</button>
      </div>
    </form>
  );
}
