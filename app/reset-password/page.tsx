import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/auth";
import ResetForm from "./ResetForm";

export const metadata = { title: "Pick a new password", robots: { index: false } };
export const dynamic = "force-dynamic";

// Opened from the "reset your password" email link (which signs them in first).
export default async function Reset() {
  const supabase = await createClient();
  const me = await getMe(supabase);
  const { data: biz } = me ? await supabase.from("businesses").select("id").eq("owner_id", me.id).limit(1) : { data: null };
  return (
    <div className="wrap narrow" style={{ margin: "26px auto 50px" }}>
      <div className="card su-card">
        <h1 style={{ marginTop: 0 }}>Pick a new password</h1>
        {me ? (
          <>
            <p className="sub">For {me.email}.</p>
            <ResetForm done={biz?.length ? "/dashboard" : "/me"} />
          </>
        ) : (
          <p className="sub">This link has expired or was already used. <Link href="/forgot">Send a new link</Link>.</p>
        )}
      </div>
    </div>
  );
}
