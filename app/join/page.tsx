import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/auth";
import JoinForm from "./JoinForm";

export const metadata = { title: "Create your account", robots: { index: false } };
export const dynamic = "force-dynamic";

// Customers create an account before searching (email, password, then their name).
export default async function Join({ searchParams }: { searchParams: Promise<{ next?: string; step?: string }> }) {
  const sp = await searchParams;
  const next = sp.next?.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/find";
  const supabase = await createClient();
  const me = await getMe(supabase);
  if (me && sp.step !== "profile") redirect(next);
  if (!me && sp.step === "profile") redirect(`/login?who=member&next=${encodeURIComponent(`/join?step=profile&next=${next}`)}`);
  return (
    <div className="wrap narrow" style={{ margin: "26px auto 50px" }}>
      <div className="card su-card">
        <JoinForm next={next} startAt={me ? 3 : 1} />
        <p className="muted su-terms">By creating an account you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.</p>
        {!me && (
          <p className="su-alt">
            Already have an account? <Link href={`/login?who=member&next=${encodeURIComponent(next)}`}>Log in</Link>
            <br />
            Own a business? <Link href="/signup">Create your business profile</Link>
          </p>
        )}
      </div>
    </div>
  );
}
