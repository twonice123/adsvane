import MfaForm from "./MfaForm";

export const metadata = { title: "Enter your code", robots: { index: false } };

export default async function Mfa({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const next = sp.next?.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/dashboard";
  return (
    <div className="wrap narrow" style={{ margin: "26px auto 50px" }}>
      <div className="card su-card">
        <p className="eyebrow">Two-step login</p>
        <h1 style={{ marginTop: 4 }}>Enter your 6-digit code</h1>
        <p className="sub">Open your authenticator app (like Google Authenticator) and type the code it shows for AdsVane.</p>
        <MfaForm next={next} />
      </div>
    </div>
  );
}
