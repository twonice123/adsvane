"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ReviewInput = { slug: string; stars: number; body: string; firstName: string; email: string; optIn: boolean };

export async function postReview(input: ReviewInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_review", {
    p_business_slug: String(input.slug).slice(0, 80),
    p_stars: Number(input.stars),
    p_body: String(input.body ?? "").slice(0, 1000),
    p_first_name: String(input.firstName ?? "").slice(0, 60),
    p_email: String(input.email ?? "").slice(0, 200),
    p_email_opt_in: input.optIn === true,
  });
  if (error) return { error: error.code === "22023" || error.code === "P0002" ? error.message : "Something went wrong. Please try again." };
  revalidatePath(`/b/${input.slug}`);
  return {};
}
