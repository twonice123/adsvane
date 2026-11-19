import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/auth";
import { GRAPH, metaReady, metaRedirect } from "@/lib/meta";

type Page = { id: string; name: string; access_token: string; instagram_business_account?: { id: string; username?: string } };

async function graph<T>(path: string, params: Record<string, string>): Promise<T> {
  const u = new URL(GRAPH + path);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const r = await fetch(u, { cache: "no-store" });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j?.error?.message || `Graph ${r.status}`);
  return j as T;
}

// Back from Facebook/Instagram: save the Pages and Instagram accounts they allowed.
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const back = (q: string) => {
    const res = NextResponse.redirect(`${origin}/settings?${q}`);
    res.cookies.delete({ name: "av_meta_state", path: "/api/connect/meta" });
    return res;
  };
  if (!metaReady()) return back("connect=soon");
  if (searchParams.get("error")) return back("connect=cancelled");
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state || state !== request.cookies.get("av_meta_state")?.value) return back("connect=failed");

  const supabase = await createClient();
  const me = await getMe(supabase);
  if (!me) return NextResponse.redirect(`${origin}/login?next=${encodeURIComponent("/settings")}`);

  try {
    const short = await graph<{ access_token: string }>("/oauth/access_token", {
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      redirect_uri: metaRedirect(origin),
      code,
    });
    // Swap for a long-lived login, so Page keys made from it don't expire.
    const long = await graph<{ access_token: string }>("/oauth/access_token", {
      grant_type: "fb_exchange_token",
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      fb_exchange_token: short.access_token,
    });
    const pages = await graph<{ data: Page[] }>("/me/accounts", {
      access_token: long.access_token,
      fields: "id,name,access_token,instagram_business_account{id,username}",
      limit: "50",
    });
    const rows: { provider: string; account_id: string; account_name: string; access_token: string }[] = [];
    for (const p of pages.data || []) {
      rows.push({ provider: "facebook", account_id: p.id, account_name: p.name, access_token: p.access_token });
      if (p.instagram_business_account)
        rows.push({ provider: "instagram", account_id: p.instagram_business_account.id, account_name: p.instagram_business_account.username ? `@${p.instagram_business_account.username}` : p.name, access_token: p.access_token });
    }
    if (!rows.length) return back("connect=nopage");
    await supabase.from("social_connections").delete().eq("user_id", me.id).in("provider", ["facebook", "instagram"]);
    const { error } = await supabase.from("social_connections").insert(rows.map((r) => ({ ...r, user_id: me.id })));
    if (error) return back("connect=failed");
    return back(`connect=ok${rows.some((r) => r.provider === "instagram") ? "" : "&ig=none"}`);
  } catch {
    return back("connect=failed");
  }
}
