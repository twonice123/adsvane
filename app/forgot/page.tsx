import Link from "next/link";
import ForgotForm from "./ForgotForm";

export const metadata = { title: "Forgot password", robots: { index: false } };

export default async function Forgot({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="wrap narrow" style={{ margin: "26px auto 50px" }}>
      <div className="card su-card">
        <h1 style={{ marginTop: 0 }}>Forgot your password?</h1>
        <p className="sub">Enter the email you log in with. We&apos;ll send you a link to pick a new password.</p>
        <ForgotForm email={sp.email?.slice(0, 200) || ""} />
        <p className="su-alt"><Link href="/login">Back to log in</Link></p>
      </div>
    </div>
  );
}
