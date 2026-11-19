import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/auth";
import StartForm from "./StartForm";

export const metadata = { title: "Create your business profile", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Signup() {
  const supabase = await createClient();
  // Already signed in: skip email and password and go straight to the new business form.
  if (await getMe(supabase)) redirect("/dashboard/new");
  return (
    <div className="wrap narrow" style={{ margin: "26px auto 50px" }}>
      <div className="card su-card">
        <StartForm needAccount />
        <p className="muted su-terms">By creating an account you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.</p>
        <p className="su-alt">
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
