import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Business } from "@/lib/data";
import { Logo } from "@/app/components/Logo";

export const metadata = { title: "Your businesses", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("businesses").select("*").eq("owner_id", user.id).order("created_at");
  const list = (data as Business[]) || [];
  if (list.length === 1) redirect(`/dashboard/${list[0].id}`);
  return (
    <div className="wrap" style={{ marginBottom: 40 }}>
      <h1>Your businesses</h1>
      <p className="sub">Signed in as {user.email}.</p>
      <div className="list">
        {list.map((b) => (
          <div key={b.id} className="row">
            <Logo name={b.name} url={b.logo_url} />
            <div><h3><Link href={`/dashboard/${b.id}`}>{b.name}</Link></h3><p>{b.category} · {b.city}, {b.state}</p></div>
            <div className="go"><Link className="b" href={`/dashboard/${b.id}`}>Manage</Link></div>
          </div>
        ))}
        {!list.length && (
          <div className="card">
            <h2>List your business free</h2>
            <p className="sub">Add your details once and get a page customers can find, review and share.</p>
            <Link className="b" href="/dashboard/new">Add my business</Link>
          </div>
        )}
      </div>
      <div className="btns">
        {list.length > 0 && <Link className="b ghost" href="/dashboard/new">Add another business</Link>}
        <form action="/auth/signout" method="post"><button className="b ghost" type="submit">Sign out</button></form>
      </div>
    </div>
  );
}
