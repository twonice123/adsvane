import type { Business, Promotion } from "./data";
import { isRunning } from "./data";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Rating = { business_id: string; review_count: number; rating: number };

export async function ratingsFor(supabase: SupabaseClient, ids: string[]) {
  const map = new Map<string, Rating>();
  if (!ids.length) return map;
  const { data } = await supabase.from("business_ratings").select("*").in("business_id", ids);
  (data as Rating[] | null)?.forEach((r) => map.set(r.business_id, r));
  return map;
}

export async function sponsoredIds(supabase: SupabaseClient, ids?: string[]) {
  let q = supabase
    .from("promotions")
    .select("business_id,status,ends_at,show_in_search")
    .eq("status", "active")
    .eq("show_in_search", true)
    .gt("ends_at", new Date().toISOString());
  if (ids) q = q.in("business_id", ids);
  const { data } = await q;
  return new Set(((data as Pick<Promotion, "business_id" | "status" | "ends_at">[]) || []).filter(isRunning).map((p) => p.business_id));
}

export function cityLine(b: Pick<Business, "city" | "state">) {
  return `${b.city}, ${b.state}`;
}
