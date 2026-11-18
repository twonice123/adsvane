import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/auth";
import { type Business, type Photo } from "@/lib/data";
import { Logo } from "@/app/components/Logo";
import PhotoUpload from "../photos/PhotoUpload";
import ProfileSetupForm from "./ProfileSetupForm";

export const metadata = { title: "Complete your profile", robots: { index: false } };
export const dynamic = "force-dynamic";

// After creating a business: complete your profile, then add photos, then on to your page.
export default async function Setup({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ step?: string }> }) {
  const { id } = await params;
  const step = (await searchParams).step === "photos" ? "photos" : "profile";
  const supabase = await createClient();
  const user = await getMe(supabase);
  const { data } = await supabase.from("businesses").select("*").eq("id", id).eq("owner_id", user!.id).maybeSingle();
  if (!data) notFound();
  const biz = data as Business;

  if (step === "profile")
    return (
      <div className="wrap narrow" style={{ margin: "26px auto 50px" }}>
        <div className="card su-card st">
          <div className="st-bar" aria-hidden="true"><span className="on" /><span /></div>
          <p className="st-step">Almost done</p>
          <h1>Complete your profile</h1>
          <p className="sub">Your account is ready. Add a few details so customers can trust you and reach you.</p>

          <div className="st-pic">
            <Logo name={biz.name} url={biz.logo_url} size="xl" focus={biz.logo_focus} />
            <div>
              <b>Profile picture</b>
              <p className="muted">Your logo or a clear photo of you or your shop.</p>
              <PhotoUpload businessId={biz.id} kind="logo" label={biz.logo_url ? "Change picture" : "Add profile picture"} className="b ghost" />
            </div>
          </div>

          <ProfileSetupForm biz={biz} />
        </div>
      </div>
    );

  const { data: rows } = await supabase.from("business_photos").select("*").eq("business_id", id).order("created_at", { ascending: false });
  const photos = ((rows as Photo[]) || []).filter((p) => !p.hidden);
  return (
    <div className="wrap narrow" style={{ margin: "26px auto 50px" }}>
      <div className="card su-card st">
        <div className="st-bar" aria-hidden="true"><span className="on" /><span className="on" /></div>
        <p className="st-step">Last step</p>
        <h1>Add photos of your work</h1>
        <p className="sub">Pages with photos get far more calls. Add a few of your best ones. You can add more any time with the + button.</p>
        {photos.length > 0 && (
          <div className="st-grid">
            {photos.slice(0, 9).map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={p.poster_url || p.url} alt="" />
            ))}
          </div>
        )}
        <PhotoUpload businessId={biz.id} kind="gallery" label={photos.length ? "Add more photos" : "Add photos"} multiple className="b ghost st-add" />
        <div className="st-btns">
          <Link href={`/dashboard/${biz.id}/setup`} className="b ghost">Back</Link>
          <Link href={`/dashboard/${biz.id}?new=1`} className="b">{photos.length ? "Go to my page" : "Skip for now"}</Link>
        </div>
      </div>
    </div>
  );
}
