import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/auth";
import { META_SCOPES, metaReady, metaRedirect } from "@/lib/meta";

// "Connect" in Settings: off to Facebook/Instagram's own login screen.
export async function GET(request: NextRequest) {
  const { origin } = request.nextUrl;
  const supabase = await createClient();
  if (!(await getMe(supabase))) return NextResponse.redirect(`${origin}/login?next=${encodeURIComponent("/settings")}`);
  if (!metaReady()) return NextResponse.redirect(`${origin}/settings?connect=soon`);
  const state = crypto.randomUUID();
  const u = new URL(`https://www.facebook.com/${process.env.META_GRAPH_VERSION || "v23.0"}/dialog/oauth`);
  u.searchParams.set("client_id", process.env.META_APP_ID!);
  u.searchParams.set("redirect_uri", metaRedirect(origin));
  u.searchParams.set("state", state);
  u.searchParams.set("scope", META_SCOPES);
  u.searchParams.set("response_type", "code");
  const res = NextResponse.redirect(u.toString());
  res.cookies.set("av_meta_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/connect/meta", maxAge: 600 });
  return res;
}
