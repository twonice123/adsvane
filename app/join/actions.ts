"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/auth";

export async function saveMemberProfile(firstName: string, zip: string): Promise<{ ok?: true; error?: string }> {
  const name = String(firstName ?? "").trim().slice(0, 60);
  const z = String(zip ?? "").trim().slice(0, 10);
  if (!name) return { error: "Enter your first name." };
  if (z && !/^\d{5}(-\d{4})?$/.test(z)) return { error: "Enter a 5-digit ZIP code, or leave it empty." };
  const supabase = await createClient();
  if (!(await getMe(supabase))) return { error: "Please log in first." };
  const { error } = await supabase.rpc("save_member_profile", { p_first_name: name, p_zip: z || null });
  if (error) return { error: "Couldn't save your profile. Please try again." };
  revalidatePath("/me");
  return { ok: true };
}

// Save or unsave a business page.
export async function toggleSaveBusiness(businessId: string, save: boolean): Promise<{ saved?: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getMe(supabase);
  if (!user) return { error: "login" };
  const id = String(businessId ?? "").slice(0, 40);
  if (save) {
    const { error } = await supabase.from("business_saves").upsert({ user_id: user.id, business_id: id }, { onConflict: "user_id,business_id", ignoreDuplicates: true });
    if (error) return { error: "Couldn't save. Please try again." };
  } else {
    const { error } = await supabase.from("business_saves").delete().eq("user_id", user.id).eq("business_id", id);
    if (error) return { error: "Couldn't update. Please try again." };
  }
  revalidatePath("/me");
  return { saved: save };
}
