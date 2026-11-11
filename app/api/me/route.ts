import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/auth";

export const dynamic = "force-dynamic";

// For the bell at the top of every page: signed in? how many new notifications?
export async function GET() {
  const supabase = await createClient();
  const user = await getMe(supabase);
  if (!user) return NextResponse.json({ signedIn: false, unread: 0 }, { headers: { "Cache-Control": "no-store" } });
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("recipient", user.id).is("read_at", null);
  return NextResponse.json({ signedIn: true, unread: count || 0 }, { headers: { "Cache-Control": "no-store" } });
}
