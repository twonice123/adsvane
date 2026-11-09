import { NextResponse } from "next/server";
import { STATES } from "@/lib/data";

// Address and city suggestions while someone types. Uses the free Photon
// service (OpenStreetMap data), limited to the United States.
const PHOTON = process.env.PLACES_URL || "https://photon.komoot.io/api/";
const STATE_ABBR: Record<string, string> = Object.fromEntries(Object.entries(STATES).map(([abbr, name]) => [name.toLowerCase(), abbr]));

export type Place = { label: string; street: string | null; city: string | null; state: string | null; zip: string | null; kind: "address" | "street" | "city" | "zip" | "place" };

type Feature = {
  properties: {
    countrycode?: string;
    type?: string;
    name?: string;
    housenumber?: string;
    street?: string;
    city?: string;
    town?: string;
    village?: string;
    district?: string;
    county?: string;
    state?: string;
    postcode?: string;
  };
};

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 120) || "";
  if (q.length < 3) return NextResponse.json([]);
  // Prefer places near the visitor (Vercel tells us their rough location).
  const lat = Number(req.headers.get("x-vercel-ip-latitude"));
  const lon = Number(req.headers.get("x-vercel-ip-longitude"));
  const near = lat && lon ? `&lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}&zoom=9&location_bias_scale=0.3` : "";
  const url = `${PHOTON}?q=${encodeURIComponent(q)}&limit=10&lang=en&bbox=-171,18,-66,72${near}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "AdsVane/1.0 (local business directory)" }, next: { revalidate: 86400 } });
    if (!res.ok) return NextResponse.json([]);
    const data = (await res.json()) as { features?: Feature[] };
    const seen = new Set<string>();
    const out: Place[] = [];
    for (const f of data.features || []) {
      const p = f.properties;
      if (p.countrycode && p.countrycode.toUpperCase() !== "US") continue;
      const state = p.state ? STATE_ABBR[p.state.toLowerCase()] || (p.state.length === 2 ? p.state.toUpperCase() : null) : null;
      if (!state) continue;
      const city = p.city || p.town || p.village || p.district || (p.type === "city" ? p.name : null) || null;
      const street = p.street ? [p.housenumber, p.street].filter(Boolean).join(" ") : p.type === "street" ? p.name || null : null;
      const zip = p.postcode ? p.postcode.slice(0, 5) : null;
      const kind: Place["kind"] = p.housenumber && street ? "address" : street ? "street" : p.type === "city" || (!street && city) ? "city" : zip ? "zip" : "place";
      const place = kind === "place" && p.name ? p.name : null;
      const label = [place, street, city || p.county, [state, zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
      if (!label || seen.has(label)) continue;
      seen.add(label);
      out.push({ label, street, city: city || null, state, zip, kind });
      if (out.length >= 6) break;
    }
    return NextResponse.json(out, { headers: { "Cache-Control": "private, max-age=600" } });
  } catch {
    return NextResponse.json([]);
  }
}
