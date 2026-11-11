import Link from "next/link";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES, starText, type Business } from "@/lib/data";
import { ratingsFor, sponsoredIds, cityLine } from "@/lib/queries";
import { addressText, geocode, locate, miles, milesText, type Point } from "@/lib/geo";
import { fit, parseSearch, splitPlace } from "@/lib/search";
import { Logo } from "../components/Logo";
import SearchBox, { ExactLink } from "./SearchBox";

export const dynamic = "force-dynamic";
export const metadata = { title: "Find local services" };

const NEAR_MILES = 60;
const AROUND_PLACE_MILES = 25;

function point(lat: unknown, lng: unknown): Point | null {
  const a = Number(lat);
  const b = Number(lng);
  return Number.isFinite(a) && Number.isFinite(b) && (a !== 0 || b !== 0) && Math.abs(a) <= 90 && Math.abs(b) <= 180 ? { lat: a, lng: b } : null;
}
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export default async function Directory({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  // Older links used separate what / where / category boxes.
  const legacy = [sp.q, sp.cat, sp.where && `in ${sp.where}`].filter(Boolean).join(" ");
  const raw = (sp.where || sp.cat ? legacy : sp.q || "").replace(/[%()*]/g, " ").trim().slice(0, 100);

  // Where the visitor is: their phone's location if they allowed it, else a rough guess from their connection.
  const jar = await cookies();
  const hdr = await headers();
  const exactSpot = point(...(decodeURIComponent(jar.get("av_loc")?.value || "").split(",") as [string, string]));
  const roughSpot = point(hdr.get("x-vercel-ip-latitude"), hdr.get("x-vercel-ip-longitude"));
  const me = exactSpot || roughSpot;

  const supabase = await createClient();
  const { data, error } = await supabase.from("businesses").select("*").order("created_at", { ascending: false }).limit(1000);
  const all = (data as Business[]) || [];
  const parsed = parseSearch(raw, all);
  let { what, place } = parsed;
  // A city we have no listings in yet, typed without "in" ("braiding shop Austin"):
  // if the last words match no business at all, treat them as the place.
  if (!place && what.length > 1) {
    const tail = raw.replace(/\b(near\s*me|nearby)\b/gi, " ").trim().split(/\s+/);
    for (const n of [2, 1]) {
      const guess = tail.slice(-n).join(" ");
      const gw = parseSearch(guess, []).what;
      if (!gw.length || all.some((b) => fit(b, gw) > 0)) continue;
      if (await geocode(guess)) {
        place = guess;
        what = what.filter((w) => !gw.includes(w));
        break;
      }
    }
  }
  const cat = sp.cat && CATEGORIES.includes(sp.cat) ? sp.cat : "";

  // Match the "what" words; if nothing fits every word, take anything that fits some.
  let pool = all.filter((b) => !cat || b.category === cat);
  const scored = pool.map((b) => ({ b, s: fit(b, what) }));
  pool = scored.some((x) => x.s >= 2) ? scored.filter((x) => x.s >= 2).map((x) => x.b) : scored.filter((x) => x.s >= 1).map((x) => x.b);

  // Map points for each business (saved ones, or worked out now for older listings).
  const pts = new Map<string, Point>();
  const todo: Business[] = [];
  for (const b of pool) {
    const saved = point(b.lat, b.lng);
    if (saved && b.located_from === addressText(b)) pts.set(b.id, saved);
    else if (todo.length < 20) todo.push(b);
    else if (saved) pts.set(b.id, saved);
  }
  await Promise.all(todo.map(async (b) => {
    const p = (await locate(b)) || point(b.lat, b.lng);
    if (p) pts.set(b.id, p);
  }));

  let placeLabel = "";
  let placeMiss = false;
  let origin: Point | null = null;
  if (place) {
    const { city, state } = splitPlace(place);
    const zipOnly = /^\d{5}$/.test(city);
    const inCity = pool.filter((b) =>
      zipOnly ? (b.zip || "").startsWith(city) : norm(b.city) === norm(city) && (!state || b.state === state),
    );
    const center = await geocode(zipOnly ? `${city}` : `${city}${state ? ", " + state : ""}`);
    placeLabel = zipOnly ? city : `${city.replace(/\b\w/g, (c) => c.toUpperCase())}${state ? ", " + state : ""}`;
    if (center) {
      // That city, plus shops just outside it.
      const near = pool.filter((b) => !inCity.includes(b) && pts.has(b.id) && miles(center, pts.get(b.id)!) <= AROUND_PLACE_MILES);
      pool = [...inCity, ...near];
      origin = center;
    } else pool = inCity;
    placeMiss = pool.length === 0;
  } else if (me) {
    // No place typed: show what's near the visitor, closest first.
    origin = me;
    const close = pool.filter((b) => pts.has(b.id) && miles(me, pts.get(b.id)!) <= NEAR_MILES);
    if (close.length) pool = close;
  }

  const dist = new Map<string, number>();
  if (me) for (const b of pool) if (pts.has(b.id)) dist.set(b.id, miles(me, pts.get(b.id)!));
  const ids = pool.map((b) => b.id);
  const [ratings, sponsored, { data: photoRows }] = await Promise.all([
    ratingsFor(supabase, ids),
    sponsoredIds(supabase, ids),
    ids.length
      ? supabase.from("business_photos").select("business_id, url").in("business_id", ids).eq("hidden", false).order("created_at", { ascending: false }).limit(1000)
      : Promise.resolve({ data: [] as { business_id: string; url: string }[] }),
  ]);
  const thumbs = new Map<string, string[]>();
  for (const p of (photoRows as { business_id: string; url: string }[]) || []) {
    const t = thumbs.get(p.business_id) || [];
    if (t.length < 10) thumbs.set(p.business_id, [...t, p.url]);
  }
  // Closest first when we know where someone is searching from.
  const byDistance = (a: Business, b: Business) => {
    if (!origin) return 0;
    const da = pts.has(a.id) ? miles(origin, pts.get(a.id)!) : Infinity;
    const db = pts.has(b.id) ? miles(origin, pts.get(b.id)!) : Infinity;
    return da - db;
  };
  const sorted = [...pool.filter((b) => sponsored.has(b.id)).sort(byDistance), ...pool.filter((b) => !sponsored.has(b.id)).sort(byDistance)];

  const heading = raw
    ? `${sorted.length} result${sorted.length === 1 ? "" : "s"}${place ? ` in ${placeLabel}` : me ? " near you" : ""}`
    : me && sorted.length
      ? "Shops near you"
      : "";

  return (
    <div className="wrap">
      <h1>Find local services you can trust</h1>
      <p className="sub">Type what you need. We show the closest shops first. Add a city to look somewhere else, like &ldquo;braiding Fort Worth&rdquo;.</p>
      <SearchBox defaultValue={raw} />

      {sp.loc === "off" && !exactSpot && (
        <p className="note" role="alert">
          We couldn&apos;t get your location. To see shops closest to you, turn on Location on your phone and allow it for this website, then
          search again. Or type your city, like &ldquo;braiding shop Lanham&rdquo;.
        </p>
      )}
      {error && <p className="err">Search is having trouble right now. Please try again.</p>}
      {heading && (
        <p className="found">
          <b>{heading}</b>
          {me && !exactSpot && dist.size > 0 && (
            <span className="muted"> · Miles are from your rough area. <ExactLink /></span>
          )}
        </p>
      )}

      <div className="list">
        {sorted.map((b) => {
          const r = ratings.get(b.id);
          const s = sponsored.has(b.id);
          const pics = [...(thumbs.get(b.id) || []), ...(b.cover_url ? [b.cover_url] : [])].slice(0, 10);
          const d = dist.get(b.id);
          const showStreet = b.show_address && b.street;
          const addr = showStreet ? addressText(b) : cityLine(b).replace(/,\s*,/, ",");
          const pt = pts.get(b.id);
          const dir = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(showStreet ? addr : pt ? `${pt.lat},${pt.lng}` : addr)}`;
          const tel = b.phone ? b.phone.replace(/[^\d+]/g, "") : "";
          return (
            <div key={b.id} className={`row${s ? " sponsored" : ""}`}>
              <Logo name={b.name} url={b.logo_url} focus={b.logo_focus} />
              <div>
                <h3>
                  <Link href={`/b/${b.slug}`}>{b.name}</Link>
                  {s && <span className="spon">Sponsored</span>}
                </h3>
                <p>
                  {b.category}
                  {d !== undefined && <> · <b className="mi">{milesText(d)}</b></>}
                </p>
                <p>
                  {r ? (
                    <>
                      <span className="stars">{starText(Number(r.rating))}</span> {Number(r.rating).toFixed(1)} ({r.review_count} review
                      {r.review_count === 1 ? "" : "s"})
                    </>
                  ) : (
                    <span className="muted">No reviews yet</span>
                  )}
                </p>
                <a className="raddr" href={dir} target="_blank" rel="noopener">
                  📍 {addr}
                </a>
              </div>
              {pics.length > 0 && (
                <Link href={`/b/${b.slug}#photos`} className="thumbs" aria-label={`See photos of ${b.name}`}>
                  {pics.map((u, i) => (
                    <img key={i} src={u} alt="" loading="lazy" />
                  ))}
                </Link>
              )}
              <div className="go">
                <Link className="b" href={`/b/${b.slug}`}>View profile</Link>
                {tel && <a className="b ghost" href={`tel:${tel}`}>Call</a>}
              </div>
            </div>
          );
        })}
        {!sorted.length && !error && (
          <div className="card">
            <h2>{placeMiss ? `No businesses in ${placeLabel} yet` : raw ? "No businesses found for that search" : "No businesses yet"}</h2>
            <p className="sub">
              {raw && "Try fewer words, like “braids near me”, or a nearby city. "}
              Own a local business? <Link href="/dashboard">List it free on AdsVane</Link>. It takes about five minutes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
