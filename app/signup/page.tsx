import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/auth";
import SignupForm from "./SignupForm";

export const metadata = { title: "Create your business profile", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Signup() {
  const supabase = await createClient();
  // Already signed in: skip email and password and go straight to the new business form.
  if (await getMe(supabase)) redirect("/dashboard/new");
  return (
    <div className="wrap narrow" style={{ margin: "26px auto 50px" }}>
      <div className="card su-card">
        <p className="eyebrow">For businesses</p>
        <h1 style={{ marginTop: 4 }}>Create your business profile</h1>
        <p className="sub">It&apos;s free. Enter your email, pick a password, and you&apos;ll go straight to your new profile.</p>
        <SignupForm />
        <p className="su-alt">
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
