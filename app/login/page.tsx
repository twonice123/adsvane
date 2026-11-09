import LoginForm from "./LoginForm";

export const metadata = { title: "Business sign in", robots: { index: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = sp.next?.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/dashboard";
  return (
    <div className="wrap narrow" style={{ margin: "26px auto 50px" }}>
      <div className="card" style={{ padding: 26 }}>
        <p className="eyebrow">For businesses</p>
        <h1 style={{ marginTop: 4 }}>List your business free</h1>
        <p className="sub">Enter your email and we'll send you a sign-in link. No password needed. New here? This creates your owner account.</p>
        {sp.error && <p className="err">That sign-in link didn't work or has expired. Send a new one below.</p>}
        <LoginForm next={next} />
      </div>
    </div>
  );
}
