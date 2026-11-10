import type { Business } from "./data";

// Turning addresses into map points, and measuring miles between them.
// Uses the free Photon service (OpenStreetMap data). PLACES_URL swaps it out in tests.
const PHOTON = process.env.PLACES_URL || "https://photon.komoot.io/api/";

export type Point = { lat: number; lng: number };

export async function geocode(text: string): Promise<Point | null> {
  const q = text.trim().slice(0, 160);
  if (q.length < 3) return null;
  try {
    const res = await fetch(`${PHOTON}?q=${encodeURIComponent(q)}&limit=3&lang=en&bbox=-171,18,-66,72`, {
      headers: { "User-Agent": "AdsVane/1.0 (local business directory)" },
      next: { revalidate: 60 * 60 * 24 * 7 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { features?: { geometry?: { coordinates?: [number, number] }; properties?: { countrycode?: string } }[] };
    const f = (data.features || []).find((x) => !x.properties?.countrycode || x.properties.countrycode.toUpperCase() === "US");
    const c = f?.geometry?.coordinates;
    return c && Number.isFinite(c[0]) && Number.isFinite(c[1]) ? { lat: c[1], lng: c[0] } : null;
  } catch {
    return null;
  }
}

// The address text we place a business by. A street that already holds the
// whole address (city, state and ZIP) is used as it is.
export function addressText(b: Pick<Business, "street" | "city" | "state" | "zip">) {
  const city = (b.city || "").replace(/[\s,]+$/, "");
  const street = (b.street || "").replace(/[\s,]+$/, "");
  if (street && city && street.toLowerCase().includes(city.toLowerCase())) return street;
  return [street, city, `${b.state} ${b.zip || ""}`.trim()].filter(Boolean).join(", ");
}

// Where a business is: its street address, or else the middle of its city.
export async function locate(b: Pick<Business, "street" | "city" | "state" | "zip">): Promise<Point | null> {
  const full = addressText(b);
  return (await geocode(full)) || (b.street ? await geocode(`${b.city.replace(/[\s,]+$/, "")}, ${b.state}`) : null);
}

export function miles(a: Point, b: Point) {
  const R = 3958.8;
  const r = (d: number) => (d * Math.PI) / 180;
  const dLat = r(b.lat - a.lat);
  const dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function milesText(m: number) {
  return m < 0.1 ? "less than 0.1 mi" : m < 10 ? `${m.toFixed(1)} mi` : `${Math.round(m)} mi`;
}
