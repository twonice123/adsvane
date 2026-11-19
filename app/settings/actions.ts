"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/auth";

export async function disconnect(fd: FormData) {
  const provider = String(fd.get("provider") ?? "");
  if (!["facebook", "instagram", "tiktok"].includes(provider)) return;
  const supabase = await createClient();
  const me = await getMe(supabase);
  if (!me) return;
  await supabase.from("social_connections").delete().eq("user_id", me.id).eq("provider", provider);
  revalidatePath("/settings");
}
