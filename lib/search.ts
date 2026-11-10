import { STATES, type Business } from "./data";

// Reads one free-text search like "braiding shop near me",
// "hair braiding in Fort Worth" or "barber lubbock tx".

const NEAR = /\b(near\s*me|nearby|near\s*by|close\s*to\s*me|around\s*me|closest|nearest)\b/i;
const FILLER = new Set(
  "a an the and or for of to at on in near me my best good top cheap affordable local shop shops store stores place places service services spot spots business businesses open now please find get".split(" "),
);
// Common spellings people type, mapped to one root.
const SAME: Record<string, string> = {
  braid: "braid", braids: "braid", braiding: "braid", braider: "braid", braiders: "braid", braided: "braid",
  breading: "braid", breiding: "braid", brading: "braid", braiding_: "braid", briading: "braid", braidng: "braid", braders: "braid",
  barber: "barber", barbers: "barber", barbershop: "barber", barbing: "barber",
  nail: "nail", nails: "nail", manicure: "nail", pedicure: "nail",
  salon: "salon", salons: "salon", hair: "hair", hairstylist: "hair", stylist: "hair", hairdresser: "hair",
  mover: "move", movers: "move", moving: "move", hauling: "haul", haul: "haul",
  restaurant: "food", restaurants: "food", food: "food", eat: "food", tacos: "taco", taco: "taco",
  clean: "clean", cleaning: "clean", cleaner: "clean", cleaners: "clean", maid: "clean",
  mechanic: "auto", mechanics: "auto", auto: "auto", car: "auto", repair: "repair",
  tree: "tree", trees: "tree", spa: "spa", beauty: "beauty", grocery: "grocery", market: "grocery",
};
// Words each category answers to, beyond its own name.
const CAT_WORDS: Record<string, string[]> = {
  "Hair braiding": ["braid", "hair"],
  "Hair salon": ["hair", "salon"],
  Barber: ["barber", "hair"],
  "Nail salon": ["nail", "salon"],
  "Beauty & spa": ["beauty", "spa"],
  Restaurant: ["food"],
  "Grocery & market": ["grocery", "food"],
  "Moving & hauling": ["move", "haul"],
  "Tree service": ["tree"],
  Cleaning: ["clean"],
  "Auto repair": ["auto", "repair"],
};

function root(w: string) {
  w = w.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (SAME[w]) return SAME[w];
  return w.replace(/(ings|ing|ers|er|es|s)$/, "") || w;
}

export function words(text: string) {
  return (text.toLowerCase().match(/[a-z0-9']+/g) || []).map((w) => w.replace(/'/g, ""));
}

export type Parsed = { what: string[]; nearMe: boolean; place: string | null };

// Pull "near me" and a place name out of the text. Known cities come from the
// listings themselves, so "braiding lanham" finds Lanham without the word "in".
export function parseSearch(raw: string, cities: { city: string; state: string }[]): Parsed {
  let text = ` ${raw.replace(/[,]/g, " ").replace(/\s+/g, " ").trim()} `;
  const nearMe = NEAR.test(text);
  text = text.replace(new RegExp(NEAR.source, "gi"), " ");
  let place: string | null = null;

  // "in Fort Worth", "near Lanham MD"
  const m = text.match(/\s(?:in|near|around|at)\s+([a-z][a-z .'-]{1,40}?)\s*$/i);
  if (m) {
    place = m[1].trim();
    text = text.slice(0, m.index);
  } else {
    // A trailing city we know, with or without a state.
    const lower = text.toLowerCase();
    const known = [...new Set(cities.map((c) => c.city.replace(/[\s,]+$/, "").toLowerCase()))].sort((a, b) => b.length - a.length);
    for (const c of known) {
      const re = new RegExp(`\\s${c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s+([a-z]{2}|${Object.values(STATES).join("|").toLowerCase()}))?\\s*$`);
      const hit = lower.match(re);
      if (hit && hit.index !== undefined) {
        place = text.slice(hit.index).trim();
        text = text.slice(0, hit.index);
        break;
      }
    }
    // "barber 76102"
    const zip = !place && text.match(/\s(\d{5})\s*$/);
    if (zip && zip.index !== undefined) {
      place = zip[1];
      text = text.slice(0, zip.index);
    }
  }
  const what = [...new Set(words(text).filter((w) => !FILLER.has(w) && w.length > 1).map(root))];
  return { what, nearMe, place };
}

// Split a place like "Fort Worth TX" or "Lanham, Maryland" into city and state.
export function splitPlace(place: string): { city: string; state: string | null } {
  const p = place.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  const names = Object.entries(STATES).map(([abbr, name]) => [abbr, name.toLowerCase()] as const);
  for (const [abbr, name] of names) {
    if (p.toLowerCase().endsWith(" " + name)) return { city: p.slice(0, -name.length).trim(), state: abbr };
  }
  const m = p.match(/^(.*\S)\s+([A-Za-z]{2})$/);
  if (m && STATES[m[2].toUpperCase()]) return { city: m[1], state: m[2].toUpperCase() };
  return { city: p, state: null };
}

// How well a business fits the "what" words (0 = not at all).
export function fit(b: Business, what: string[]) {
  if (!what.length) return 1;
  const own = new Set([
    ...words([b.name, b.category, b.description || "", ...(b.services || []).map((s) => `${s.name} ${s.note || ""}`)].join(" ")).map(root),
    ...(CAT_WORDS[b.category] || []),
  ]);
  const has = (w: string) => own.has(w) || [...own].some((o) => o.length >= 4 && w.length >= 4 && (o.startsWith(w) || w.startsWith(o)));
  const hits = what.filter(has).length;
  const catHit = what.some((w) => (CAT_WORDS[b.category] || []).includes(w));
  return hits === what.length ? 2 + (catHit ? 1 : 0) : hits > 0 ? 1 : 0;
}
