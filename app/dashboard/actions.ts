"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { addressText, geocode, locate } from "@/lib/geo";
import { AGE_MAX, AGE_MIN, MAX_RADIUS, type Target } from "@/lib/promo";

// The map point for an address, saved so search can show miles.
async function place(a: { street: string | null; city: string; state: string; zip: string | null }) {
  const pt = await locate(a);
  return { lat: pt?.lat ?? null, lng: pt?.lng ?? null, located_from: pt ? addressText(a) : null };
}
import { AMENITY_LABEL, CATEGORIES, DAYS, SOCIAL, STATES, slugify, socialLink } from "@/lib/data";
import { getMe } from "@/lib/auth";

export type FormState = { error?: string; saved?: boolean };

function str(fd: FormData, k: string, max = 200) {
  return String(fd.get(k) ?? "").trim().slice(0, max);
}

function url(s: string) {
  if (!s) return null;
  const v = /^https?:\/\//i.test(s) ? s : "https://" + s;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

async function requireUser() {
  const supabase = await createClient();
  const user = await getMe(supabase);
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function saveBusiness(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const id = str(fd, "id", 40);
  const name = str(fd, "name", 120);
  const category = str(fd, "category");
  const city = str(fd, "city", 80);
  const state = str(fd, "state", 2).toUpperCase();
  if (!name) return { error: "Enter your business name." };
  if (!CATEGORIES.includes(category)) return { error: "Pick a category." };
  if (!city) return { error: "Enter your city." };
  if (!STATES[state]) return { error: "Pick your state." };

  const websiteRaw = str(fd, "website", 300);
  const website = url(websiteRaw);
  if (websiteRaw && !website) return { error: "That website address doesn't look right." };
  const contact_email = str(fd, "contact_email", 200).toLowerCase() || null;
  if (contact_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact_email)) return { error: "That email address doesn't look right." };

  const hours: Record<string, { open: string; close: string } | null> = {};
  for (const d of DAYS) {
    const open = str(fd, `open_${d}`, 5);
    const close = str(fd, `close_${d}`, 5);
    hours[d] = fd.get(`on_${d}`) && /^\d\d:\d\d$/.test(open) && /^\d\d:\d\d$/.test(close) ? { open, close } : null;
  }
  const amenities = fd.getAll("amenities").map(String).filter((a) => AMENITY_LABEL[a]);
  const social: Record<string, string> = {};
  for (const s of SOCIAL) {
    const raw = str(fd, `social_${s.key}`, 300);
    if (!raw) continue;
    const link = socialLink(s.key, raw);
    if (!link) return { error: `That ${s.label} link doesn't look right. Copy the link to your ${s.label} page, like ${s.example}` };
    social[s.key] = link;
  }
  const services = str(fd, "services", 3000)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 30)
    .map((l) => {
      const [n, ...rest] = l.split(/\s+[-–—:]\s+/);
      return rest.length ? { name: n.slice(0, 80), note: rest.join(" - ").slice(0, 160) } : { name: n.slice(0, 80) };
    });

  const row = {
    name,
    category,
    description: str(fd, "description", 2000) || null,
    phone: str(fd, "phone", 30) || null,
    website,
    street: str(fd, "street", 120) || null,
    city,
    state,
    zip: str(fd, "zip", 10) || null,
    show_address: fd.get("show_address") === "on",
    service_area: str(fd, "service_area", 120) || null,
    contact_email,
    hours,
    amenities,
    social,
    services,
  };
  Object.assign(row, await place(row));

  if (id) {
    const { error } = await supabase.from("businesses").update(row).eq("id", id).eq("owner_id", user.id);
    if (error) return { error: "Couldn't save. Please try again." };
    revalidatePath(`/dashboard/${id}`);
    revalidatePath("/b/[slug]", "page");
    return { saved: true };
  }

  const base = slugify(`${name} ${city} ${state}`) || "business";
  let slug = base;
  for (let i = 0; i < 5; i++) {
    const { data, error } = await supabase.from("businesses").insert({ ...row, slug, owner_id: user.id }).select("id").single();
    if (!error && data) redirect(`/dashboard/${data.id}?new=1`);
    if (error?.code !== "23505") return { error: "Couldn't create your listing. Please try again." };
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return { error: "Couldn't create your listing. Please try again." };
}

export type PromoState = { error?: string };

export async function startPromotion(_prev: PromoState, fd: FormData): Promise<PromoState> {
  const { supabase, user } = await requireUser();
  const businessId = str(fd, "business_id", 40);
  const daily = Math.round(Number(fd.get("daily")) * 100);
  const days = Number(fd.get("days"));
  const inSearch = fd.get("show_in_search") === "on";
  const inEmail = fd.get("show_in_email") === "on";
  if (!Number.isFinite(daily) || daily < 500) return { error: "The daily budget must be at least $5." };
  if (daily > 100000) return { error: "The daily budget can be at most $1,000." };
  if (![3, 7, 14, 30].includes(days)) return { error: "Pick how many days to run." };
  if (!inSearch && !inEmail) return { error: "Pick at least one place to show your profile." };

  // Where it shows.
  let raw: unknown;
  try {
    raw = JSON.parse(String(fd.get("targets") || "[]"));
  } catch {
    raw = [];
  }
  const list = (Array.isArray(raw) ? raw : []).slice(0, 25) as Record<string, unknown>[];
  const targets: Target[] = [];
  if (list.some((t) => t.kind === "us")) targets.push({ kind: "us" });
  else {
    for (const t of list) {
      if (t.kind === "state" && typeof t.state === "string" && STATES[t.state]) {
        targets.push({ kind: "state", state: t.state, label: STATES[t.state] });
      } else if (t.kind === "place" && typeof t.label === "string" && t.label.trim()) {
        const label = t.label.trim().slice(0, 160);
        const radius = Math.round(Number(t.radius));
        if (!Number.isFinite(radius) || radius < 1 || radius > MAX_RADIUS) return { error: `Pick a distance between 1 and ${MAX_RADIUS} miles for ${label}.` };
        const lat = Number(t.lat), lng = Number(t.lng);
        const given = Number.isFinite(lat) && Number.isFinite(lng) && lat > 17 && lat < 72 && lng > -180 && lng < -64 ? { lat, lng } : null;
        const pt = given || (await geocode(label));
        if (!pt) return { error: `We couldn't find "${label}" on the map. Pick it from the suggestions as you type.` };
        targets.push({ kind: "place", label, lat: pt.lat, lng: pt.lng, radius });
      }
    }
  }
  if (!targets.length) return { error: "Add at least one place where your ad should show." };
  const radius = Math.min(30, Math.max(2, ...targets.map((t) => (t.kind === "place" ? t.radius : 30))));

  const ageMin = Number(fd.get("age_min"));
  if (!Number.isInteger(ageMin) || ageMin < AGE_MIN || ageMin > AGE_MAX) return { error: "Pick a minimum age." };
  const goal = fd.get("goal") === "website" ? "website" : "profile";
  const audienceName = str(fd, "audience_name", 60);
  const saveAudience = fd.get("save_audience") === "on" && !!audienceName;

  const photoIds = String(fd.get("photo_ids") || "").split(",").filter((x) => /^[0-9a-f-]{36}$/.test(x)).slice(0, 5);

  const { data: biz } = await supabase.from("businesses").select("id, website").eq("id", businessId).eq("owner_id", user.id).maybeSingle();
  if (!biz) return { error: "Business not found." };
  if (goal === "website" && !biz.website) return { error: "Add your website in Edit profile first, or pick Visit your profile." };
  if (saveAudience) {
    const { data: had } = await supabase.from("audiences").select("id").eq("business_id", businessId).eq("name", audienceName).maybeSingle();
    if (had) await supabase.from("audiences").update({ targets, age_min: ageMin }).eq("id", had.id);
    else await supabase.from("audiences").insert({ business_id: businessId, name: audienceName, targets, age_min: ageMin });
  }
  const { data: own } = photoIds.length
    ? await supabase.from("business_photos").select("id").eq("business_id", businessId).in("id", photoIds)
    : { data: [] as { id: string }[] };
  const okIds = new Set(((own as { id: string }[]) || []).map((p) => p.id));
  const adPhotos = photoIds.filter((x) => okIds.has(x));

  // Only one running promotion per business: stop any current one first.
  await supabase.from("promotions").update({ status: "stopped" }).eq("business_id", businessId).eq("status", "active");
  const ends = new Date(Date.now() + days * 86400000).toISOString();
  const { error } = await supabase.from("promotions").insert({
    business_id: businessId,
    daily_budget_cents: daily,
    days,
    radius_miles: radius,
    targets,
    age_min: ageMin,
    goal,
    audience_name: audienceName || null,
    photo_ids: adPhotos,
    show_in_search: inSearch,
    show_in_email: inEmail,
    ends_at: ends,
  });
  if (error) return { error: "Couldn't start the promotion. Please try again." };
  revalidatePath("/find");
  redirect(`/dashboard/${businessId}?promo=started`);
}

export async function stopPromotion(fd: FormData) {
  const { supabase } = await requireUser();
  const businessId = str(fd, "business_id", 40);
  await supabase.from("promotions").update({ status: "stopped" }).eq("business_id", businessId).eq("status", "active");
  revalidatePath("/find");
  redirect(`/dashboard/${businessId}?promo=stopped`);
}

export type ProfileState = { error?: string; ok?: number };

// The quick "Edit profile" form at the top of a business page.
export async function saveProfile(_prev: ProfileState, fd: FormData): Promise<ProfileState> {
  const { supabase, user } = await requireUser();
  const id = str(fd, "id", 40);
  const name = str(fd, "name", 120);
  const category = str(fd, "category");
  const city = str(fd, "city", 80).replace(/[\s,]+$/, "");
  const state = str(fd, "state", 2).toUpperCase();
  if (!name) return { error: "Enter your business name." };
  if (!CATEGORIES.includes(category)) return { error: "Pick a category." };
  if (!city) return { error: "Enter your city." };
  if (!STATES[state]) return { error: "Pick your state." };
  const websiteRaw = str(fd, "website", 300);
  const website = url(websiteRaw);
  if (websiteRaw && !website) return { error: "That website address doesn't look right." };
  const contact_email = str(fd, "contact_email", 200).toLowerCase() || null;
  if (contact_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact_email)) return { error: "That email address doesn't look right." };
  const phone = str(fd, "phone", 30) || null;
  if (phone && phone.replace(/\D/g, "").length < 7) return { error: "That phone number doesn't look right." };

  const prow = {
      name,
      category,
      description: str(fd, "description", 2000) || null,
      website,
      phone,
      contact_email,
      street: str(fd, "street", 120).replace(/[\s,]+$/, "") || null,
      city,
      state,
      zip: str(fd, "zip", 10) || null,
      show_address: fd.get("show_address") === "on",
  };
  const { data, error } = await supabase
    .from("businesses")
    .update({ ...prow, ...(await place(prow)) })
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("slug")
    .maybeSingle();
  if (error || !data) return { error: "Couldn't save. Please try again." };
  revalidatePath(`/dashboard/${id}`);
  revalidatePath(`/b/${data.slug}`);
  revalidatePath("/find");
  return { ok: Date.now() };
}
