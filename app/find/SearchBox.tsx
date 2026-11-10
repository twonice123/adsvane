"use client";
import { useEffect, useState } from "react";

const NEAR = /\b(near\s*me|nearby|near\s*by|close\s*to\s*me|around\s*me|closest|nearest)\b/i;
const COOKIE = "av_loc";

function savedSpot() {
  const m = document.cookie.match(/(?:^|; )av_loc=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}
function saveSpot(lat: number, lng: number) {
  document.cookie = `${COOKIE}=${encodeURIComponent(`${lat.toFixed(4)},${lng.toFixed(4)}`)}; path=/; max-age=86400; samesite=lax`;
}
function askSpot(): Promise<boolean> {
  return new Promise((done) => {
    if (!("geolocation" in navigator)) return done(false);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        saveSpot(p.coords.latitude, p.coords.longitude);
        done(true);
      },
      () => done(false),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
    );
  });
}

// One search box: "braiding shop near me", "barber Fort Worth", "nails 20706".
export default function SearchBox({ defaultValue, exact }: { defaultValue: string; exact: boolean }) {
  const [q, setQ] = useState(defaultValue);
  const [busy, setBusy] = useState(false);

  // If location is already allowed, use it quietly so miles are exact.
  useEffect(() => {
    if (exact || savedSpot()) return;
    navigator.permissions
      ?.query({ name: "geolocation" as PermissionName })
      .then((s) => s.state === "granted" && askSpot().then((ok) => ok && defaultValue && location.reload()))
      .catch(() => {});
  }, [exact, defaultValue]);

  async function go(text: string) {
    const u = new URL("/find", location.href);
    if (text.trim()) u.searchParams.set("q", text.trim());
    if (NEAR.test(text) && !savedSpot()) {
      setBusy(true);
      if (!(await askSpot())) u.searchParams.set("loc", "off");
    }
    location.href = u.toString();
  }

  return (
    <>
      <form
        className="search one"
        action="/find"
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
      >
        <input
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Try: braiding shop near me"
          aria-label="What are you looking for, and where?"
          enterKeyHint="search"
        />
        <button type="submit" disabled={busy}>{busy ? "Finding you…" : "Search"}</button>
      </form>
      <div className="quick">
        <button
          type="button"
          className="chip2"
          onClick={() => {
            const t = NEAR.test(q) ? q : `${q.trim()} near me`.trim();
            setQ(t);
            go(t);
          }}
        >
          📍 Near me
        </button>
        {["Braiding shop near me", "Barber near me", "Nails near me"].map((t) => (
          <button key={t} type="button" className="chip2" onClick={() => { setQ(t); go(t); }}>
            {t}
          </button>
        ))}
      </div>
    </>
  );
}

// "Use my exact location" link under results that use a rough location.
export function ExactLink() {
  const [msg, setMsg] = useState("");
  return (
    <>
      <button
        type="button"
        className="lnk"
        onClick={async () => {
          setMsg("");
          if (await askSpot()) location.reload();
          else setMsg("Location is off. Turn on Location on your phone and allow it for this website, then try again.");
        }}
      >
        Use my exact location
      </button>
      {msg && <span className="muted"> {msg}</span>}
    </>
  );
}
