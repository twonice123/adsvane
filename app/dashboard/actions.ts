"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AMENITY_LABEL, CATEGORIES, DAYS, SOCIAL, STATES, slugify, socialLink } from "@/lib/data";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
    if (!error && data) redirect(`/dashboard/${data.id}/photos?new=1`);
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
  const radius = Number(fd.get("radius"));
  const inSearch = fd.get("show_in_search") === "on";
  const inEmail = fd.get("show_in_email") === "on";
  if (!Number.isFinite(daily) || daily < 500) return { error: "The daily budget must be at least $5." };
  if (daily > 100000) return { error: "The daily budget can be at most $1,000." };
  if (![3, 7, 14, 30].includes(days)) return { error: "Pick how many days to run." };
  if (!Number.isInteger(radius) || radius < 2 || radius > 30) return { error: "Pick a distance between 2 and 30 miles." };
  if (!inSearch && !inEmail) return { error: "Pick at least one place to show your profile." };

  const { data: biz } = await supabase.from("businesses").select("id").eq("id", businessId).eq("owner_id", user.id).maybeSingle();
  if (!biz) return { error: "Business not found." };

  // Only one running promotion per business: stop any current one first.
  await supabase.from("promotions").update({ status: "stopped" }).eq("business_id", businessId).eq("status", "active");
  const ends = new Date(Date.now() + days * 86400000).toISOString();
  const { error } = await supabase.from("promotions").insert({
    business_id: businessId,
    daily_budget_cents: daily,
    days,
    radius_miles: radius,
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
