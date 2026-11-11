import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f-]{36}$/i;

// Counts one view of a post (once per signed-in person, or once per browser).
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { photo?: string; key?: string };
  if (!body.photo || !UUID.test(body.photo)) return NextResponse.json({}, { status: 400 });
  const key = typeof body.key === "string" ? body.key.slice(0, 64) : "";
  const supabase = await createClient();
  const { data } = await supabase.rpc("note_view", { p_photo: body.photo, p_key: key });
  return NextResponse.json({ views: typeof data === "number" ? data : null });
}
