import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/data";
import PrintButton from "./PrintButton";
import { getMe } from "@/lib/auth";

export const metadata = { title: "Review QR poster", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Poster({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getMe(supabase);
  const { data } = await supabase.from("businesses").select("name,slug").eq("id", id).eq("owner_id", user!.id).maybeSingle();
  if (!data) notFound();
  const url = `${siteUrl()}/b/${data.slug}/review`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 1 });
  return (
    <div className="wrap narrow" style={{ textAlign: "center", margin: "30px auto" }}>
      <p className="eyebrow">AdsVane</p>
      <h1>Enjoyed your visit to {data.name}?</h1>
      <p className="sub" style={{ fontSize: 20 }}>Scan to leave a quick review</p>
      <div style={{ width: 320, maxWidth: "100%", margin: "0 auto" }} dangerouslySetInnerHTML={{ __html: qr }} />
      <p className="muted">{url.replace(/^https?:\/\//, "")}</p>
      <PrintButton />
    </div>
  );
}
