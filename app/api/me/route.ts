import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/auth";

export const dynamic = "force-dynamic";

// For the bell at the top of every page: signed in? how many new notifications?
export async function GET() {
  const supabase = await createClient();
  const user = await getMe(supabase);
  if (!user) return NextResponse.json({ signedIn: false, unread: 0 }, { headers: { "Cache-Control": "no-store" } });
  const [{ count }, { data: biz }] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("recipient", user.id).is("read_at", null),
    supabase.from("businesses").select("id").eq("owner_id", user.id).order("created_at").limit(2),
  ]);
  const ids = ((biz as { id: string }[]) || []).map((b) => b.id);
  // bizId lets the phone's bottom + post straight to the business when there's only one.
  return NextResponse.json({ signedIn: true, unread: count || 0, business: ids.length > 0, bizId: ids.length === 1 ? ids[0] : null }, { headers: { "Cache-Control": "no-store" } });
}
