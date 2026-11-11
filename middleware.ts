import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Keeps the owner's sign-in fresh and guards the dashboard.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );
  // Checks the sign-in token locally when possible (fast), and refreshes it when it has expired.
  const { data } = await supabase.auth.getClaims().catch(() => ({ data: null }));
  const user = data?.claims?.sub ? { id: String(data.claims.sub) } : null;

  const path = request.nextUrl.pathname;
  if (!user && (path.startsWith("/dashboard") || path === "/me" || path === "/notifications" || path === "/archive")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (path !== "/dashboard" && !path.startsWith("/dashboard/")) url.searchParams.set("who", "member");
    url.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  // "Add your business" for an owner with one business: go straight to it, skipping a page.
  if (user && path === "/dashboard") {
    const { data: rows } = await supabase.from("businesses").select("id").eq("owner_id", user.id).limit(2);
    if (rows?.length === 1) {
      const url = request.nextUrl.clone();
      url.pathname = `/dashboard/${rows[0].id}`;
      url.search = "";
      const r = NextResponse.redirect(url);
      response.cookies.getAll().forEach((c) => r.cookies.set(c));
      return r;
    }
  }
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/me", "/notifications", "/archive", "/login", "/auth/:path*"],
};
