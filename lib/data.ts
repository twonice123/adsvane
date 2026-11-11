export type Business = {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  phone: string | null;
  website: string | null;
  street: string | null;
  city: string;
  state: string;
  zip: string | null;
  show_address: boolean;
  service_area: string | null;
  logo_url: string | null;
  cover_url: string | null;
  cover_focus: string | null;
  logo_focus: string | null;
  contact_email: string | null;
  lat: number | null;
  lng: number | null;
  located_from: string | null;
  hours: Record<string, { open: string; close: string } | null>;
  amenities: string[];
  social: Record<string, string>;
  services: { name: string; note?: string }[];
  created_at: string;
};

export type Photo = {
  id: string;
  business_id: string;
  path: string;
  url: string;
  caption: string | null;
  post_text: string | null;
  hidden: boolean;
  post_id: string | null;
  position: number;
  view_count: number;
  created_at: string;
};

export const PHOTO_BUCKET = "business-photos";

export type Review = {
  id: string;
  business_id: string;
  first_name: string;
  stars: number;
  body: string | null;
  created_at: string;
};

export type Promotion = {
  id: string;
  business_id: string;
  daily_budget_cents: number;
  days: number;
  radius_miles: number;
  show_in_search: boolean;
  show_in_email: boolean;
  targets?: import("./promo").Target[] | null;
  age_min?: number | null;
  age_max?: number | null;
  photo_ids?: string[];
  status: "active" | "stopped" | "completed";
  starts_at: string;
  ends_at: string;
};

export const CATEGORIES = [
  "Hair braiding",
  "Hair salon",
  "Barber",
  "Nail salon",
  "Beauty & spa",
  "Restaurant",
  "Grocery & market",
  "Moving & hauling",
  "Tree service",
  "Cleaning",
  "Auto repair",
  "Other",
];

export const STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas",
  KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts",
  MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico",
  NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

export const AMENITIES: { group: string; items: [string, string][] }[] = [
  { group: "Parking", items: [["parkFreeLot", "Free parking lot"], ["parkFreeStreet", "Free street parking"], ["parkPaid", "Paid parking"], ["parkGarage", "Parking garage nearby"]] },
  { group: "Amenities", items: [["wifi", "Free Wi-Fi"], ["restroom", "Restroom"], ["waiting", "Waiting area"], ["ac", "Air conditioning"]] },
  { group: "Accessibility", items: [["wcEntrance", "Wheelchair-accessible entrance"], ["wcParking", "Wheelchair-accessible parking"], ["wcRestroom", "Wheelchair-accessible restroom"]] },
  { group: "Planning", items: [["walkins", "Walk-ins welcome"], ["apptReq", "Appointment required"], ["kids", "Good for kids"]] },
  { group: "Payments", items: [["cards", "Credit cards"], ["debit", "Debit cards"], ["mobilePay", "Mobile payments (Apple Pay, Google Pay)"], ["cashOnly", "Cash only"]] },
  { group: "From the business", items: [["blackOwned", "Black-owned"], ["womenOwned", "Women-owned"], ["veteranOwned", "Veteran-owned"], ["lgbtq", "LGBTQ+ friendly"]] },
];

export const AMENITY_LABEL: Record<string, string> = Object.fromEntries(
  AMENITIES.flatMap((g) => g.items)
);

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const SOCIAL: { key: string; label: string; base: string; hosts: string[]; example: string }[] = [
  { key: "instagram", label: "Instagram", base: "https://instagram.com/", hosts: ["instagram.com", "instagr.am"], example: "https://instagram.com/yourpage" },
  { key: "facebook", label: "Facebook", base: "https://facebook.com/", hosts: ["facebook.com", "fb.com", "fb.me", "m.facebook.com"], example: "https://facebook.com/yourpage" },
  { key: "tiktok", label: "TikTok", base: "https://tiktok.com/@", hosts: ["tiktok.com", "vm.tiktok.com"], example: "https://tiktok.com/@yourpage" },
  { key: "youtube", label: "YouTube", base: "https://youtube.com/@", hosts: ["youtube.com", "youtu.be", "m.youtube.com"], example: "https://youtube.com/@yourchannel" },
  { key: "x", label: "X (Twitter)", base: "https://x.com/", hosts: ["x.com", "twitter.com"], example: "https://x.com/yourpage" },
];

// Turns what an owner typed (a full link, a link without https, or just a
// username) into a full link to that network. Returns null when it's a link
// to some other website.
export function socialLink(key: string, value: string | null | undefined): string | null {
  const s = SOCIAL.find((x) => x.key === key);
  const v = (value || "").trim();
  if (!s || !v) return null;
  const looksLikeLink = /^https?:\/\//i.test(v) || /^(www\.|m\.)?[a-z0-9-]+\.[a-z]{2,}\//i.test(v);
  if (!looksLikeLink) {
    const user = v.replace(/^@/, "").replace(/[^\w.\-]/g, "");
    return user ? s.base + user : null;
  }
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : "https://" + v);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (!s.hosts.includes(host)) return null;
    u.protocol = "https:";
    return u.toString();
  } catch {
    return null;
  }
}

// Short text for a social link, like "instagram.com/yourpage".
export function socialText(link: string) {
  return link.replace(/^https?:\/\/(www\.)?/i, "").replace(/[?#].*$/, "").replace(/\/$/, "");
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function starText(n: number) {
  const r = Math.round(n);
  return "★★★★★".slice(0, r) + "☆☆☆☆☆".slice(r);
}

export function money(cents: number) {
  return "$" + (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
}

export function siteUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return "http://localhost:3000";
}

export function isRunning(p: Pick<Promotion, "status" | "ends_at">) {
  return p.status === "active" && new Date(p.ends_at).getTime() > Date.now();
}

// Placeholder rates until real numbers exist (see the plan doc).
export function estimate(dailyCents: number, days: number, radius: number, search: boolean, email: boolean, optins: number) {
  const dollars = (dailyCents / 100) * days;
  const reach = Math.sqrt(radius / 10);
  const views = search ? Math.round(dollars * 38 * reach) : 0;
  const emails = email ? Math.min(Math.round(dollars * 25 * reach), Math.max(optins, 0) * Math.ceil(days / 7)) : 0;
  const visits = Math.round(views * 0.06 + emails * 0.04);
  return { views, emails, visits, total: dailyCents * days };
}

// Framing for a cover or profile picture, saved as "x y zoom".
export type Focus = { x: number; y: number; z: number };
export function parseFocus(f: string | null | undefined): Focus {
  const [x, y, z] = (f || "").split(" ").map(Number);
  const ok = (n: number, lo: number, hi: number) => Number.isFinite(n) && n >= lo && n <= hi;
  return ok(x, 0, 100) && ok(y, 0, 100) && ok(z, 1, 3) ? { x, y, z } : { x: 50, y: 50, z: 1 };
}
export function focusText(f: Focus) {
  const r = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
  return `${r(Math.min(100, Math.max(0, f.x)))} ${r(Math.min(100, Math.max(0, f.y)))} ${r(Math.min(3, Math.max(1, f.z)), 2)}`;
}
export function focusStyle(f: string | null | undefined | Focus) {
  const v = typeof f === "object" && f ? f : parseFocus(f as string | null | undefined);
  return {
    objectPosition: `${v.x}% ${v.y}%`,
    transform: v.z !== 1 ? `scale(${v.z})` : undefined,
    transformOrigin: `${v.x}% ${v.y}%`,
  } as const;
}
