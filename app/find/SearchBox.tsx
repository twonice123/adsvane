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

const reload = () => location.reload();

// Asks once, in plain words, before the phone's own location prompt.
function LocationAsk({ onAllowed }: { onAllowed: () => void }) {
  const [state, setState] = useState<"hidden" | "ask" | "waiting" | "off">("hidden");
  useEffect(() => {
    if (savedSpot()) return;
    let skipped = false;
    try {
      skipped = sessionStorage.getItem("av_loc_skip") === "1";
    } catch {}
    const perm = navigator.permissions?.query({ name: "geolocation" as PermissionName });
    if (!perm) return setState(skipped ? "hidden" : "ask");
    perm
      .then((s) => {
        if (s.state === "granted") askSpot().then((ok) => ok && onAllowed());
        else if (s.state === "denied") !skipped && setState("off");
        else if (!skipped) setState("ask");
      })
      .catch(() => !skipped && setState("ask"));
  }, [onAllowed]);

  if (state === "hidden") return null;
  return (
    <div className="locask" role="dialog" aria-modal="true" aria-labelledby="locask-t">
      <div className="locask-box">
        <div className="locask-ic" aria-hidden="true">📍</div>
        {state === "off" ? (
          <>
            <h2 id="locask-t">Location is turned off</h2>
            <p>
              AdsVane uses your location to show the shops closest to you and how many miles away they are. To turn it on, open your phone&apos;s
              Settings, turn on Location, and allow it for this website in your browser. Then come back to this page.
            </p>
            <div className="btns">
              <button
                type="button"
                className="b"
                onClick={() => {
                  try {
                    sessionStorage.setItem("av_loc_skip", "1");
                  } catch {}
                  setState("hidden");
                }}
              >
                OK
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="locask-t">AdsVane wants to use your location</h2>
            <p>This helps us find shops around you and show how many miles away each one is. Your phone will ask you to allow it next.</p>
            <div className="btns">
              <button
                type="button"
                className="b"
                disabled={state === "waiting"}
                onClick={async () => {
                  setState("waiting");
                  if (await askSpot()) onAllowed();
                  else setState("off");
                }}
              >
                {state === "waiting" ? "Waiting for your phone…" : "Allow location"}
              </button>
              <button
                type="button"
                className="b ghost"
                onClick={() => {
                  try {
                    sessionStorage.setItem("av_loc_skip", "1");
                  } catch {}
                  setState("hidden");
                }}
              >
                Not now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// One search box: "braiding shop near me", "barber Fort Worth", "nails 20706".
export default function SearchBox({ defaultValue }: { defaultValue: string }) {
  const [q, setQ] = useState(defaultValue);
  const [busy, setBusy] = useState(false);

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
      <LocationAsk onAllowed={reload} />
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
          placeholder="What do you need? e.g. braiding, barber, nails"
          aria-label="What are you looking for, and where?"
          enterKeyHint="search"
        />
        <button type="submit" disabled={busy}>{busy ? "Finding you…" : "Search"}</button>
      </form>
      <div className="quick">
        {["Braiding", "Hair salon", "Barber", "Nails", "Cleaning", "Movers"].map((t) => (
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
