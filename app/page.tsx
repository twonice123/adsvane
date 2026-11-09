import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES, starText, type Business } from "@/lib/data";
import { ratingsFor, sponsoredIds, cityLine } from "@/lib/queries";
import { Logo } from "./components/Logo";

export const dynamic = "force-dynamic";

function clean(s: string | undefined) {
  return (s || "").replace(/[%,()*]/g, " ").trim().slice(0, 60);
}

export default async function Directory({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const q = clean(sp.q);
  const where = clean(sp.where);
  const cat = sp.cat && CATEGORIES.includes(sp.cat) ? sp.cat : "";
  const supabase = await createClient();

  let query = supabase.from("businesses").select("*").order("created_at", { ascending: false }).limit(60);
  if (q) query = query.or(`name.ilike.%${q}%,category.ilike.%${q}%,description.ilike.%${q}%`);
  if (where) {
    const [city, st] = where.split(/\s+(?=[A-Za-z]{2}$)/);
    query = st ? query.ilike("city", `%${city.trim()}%`).ilike("state", st) : query.or(`city.ilike.%${where}%,zip.eq.${where},state.ilike.${where}`);
  }
  if (cat) query = query.eq("category", cat);
  const { data, error } = await query;
  const list = (data as Business[]) || [];
  const ids = list.map((b) => b.id);
  const [ratings, sponsored] = await Promise.all([ratingsFor(supabase, ids), sponsoredIds(supabase, ids)]);
  const sorted = [...list.filter((b) => sponsored.has(b.id)), ...list.filter((b) => !sponsored.has(b.id))];

  return (
    <div className="wrap">
      <h1>Find local businesses you can trust</h1>
      <p className="sub">Real reviews from real customers. Listing is free for every business.</p>
      <form className="search" action="/">
        <input name="q" defaultValue={q} placeholder="What? e.g. braids, tacos, movers" aria-label="What are you looking for" />
        <input name="where" defaultValue={where} placeholder="Where? City, ST or ZIP" aria-label="Where" />
        <select name="cat" defaultValue={cat} aria-label="Category">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <button type="submit">Search</button>
      </form>

      {error && <p className="err">Search is having trouble right now. Please try again.</p>}

      <div className="list">
        {sorted.map((b) => {
          const r = ratings.get(b.id);
          const s = sponsored.has(b.id);
          return (
            <div key={b.id} className={`row${s ? " sponsored" : ""}`}>
              <Logo name={b.name} url={b.logo_url} />
              <div>
                <h3>
                  <Link href={`/b/${b.slug}`}>{b.name}</Link>
                  {s && <span className="spon">Sponsored</span>}
                </h3>
                <p>
                  {b.category} · {cityLine(b)}
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
              </div>
              <div className="go">
                <Link className="b" href={`/b/${b.slug}`}>
                  View profile
                </Link>
              </div>
            </div>
          );
        })}
        {!sorted.length && !error && (
          <div className="card">
            <h2>No businesses found{q || where ? " for that search" : " yet"}</h2>
            <p className="sub">
              Own a local business? <Link href="/dashboard">List it free on AdsVane</Link>. It takes about five minutes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
