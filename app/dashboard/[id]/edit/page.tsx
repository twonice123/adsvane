import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Business } from "@/lib/data";
import BusinessForm from "../../BusinessForm";

export const metadata = { title: "Edit your page", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Edit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase.from("businesses").select("*").eq("id", id).eq("owner_id", user!.id).maybeSingle();
  if (!data) notFound();
  const biz = data as Business;
  return (
    <div className="wrap narrow" style={{ margin: "0 auto 40px" }}>
      <p className="muted" style={{ marginTop: 14 }}><Link href={`/dashboard/${id}`}>← Back to dashboard</Link></p>
      <h1>Edit {biz.name}</h1>
      <BusinessForm biz={biz} />
    </div>
  );
}
