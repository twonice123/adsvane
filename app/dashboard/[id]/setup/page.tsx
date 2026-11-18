import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/auth";
import { type Business, type Photo } from "@/lib/data";
import { Logo } from "@/app/components/Logo";
import PhotoUpload from "../photos/PhotoUpload";
import ProfileSetupForm from "./ProfileSetupForm";
import FrameEditor from "../FrameEditor";
import { Cover } from "@/app/components/Cover";

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

          <div className="st-pics">
            <Cover url={biz.cover_url} focus={biz.cover_focus} />
            <div className="st-avatar"><Logo name={biz.name} url={biz.logo_url} size="xl" focus={biz.logo_focus} /></div>
          </div>
          <div className="st-picrow">
            <div>
              <b>Profile picture</b>
              <p className="muted">Your logo or a clear photo of you or your shop.</p>
            </div>
            <div className="st-picbtns">
              <PhotoUpload businessId={biz.id} kind="logo" label={biz.logo_url ? "Change" : "Add profile picture"} className={biz.logo_url ? "b ghost" : "b"} />
              {biz.logo_url && <FrameEditor businessId={biz.id} kind="logo" url={biz.logo_url} focus={biz.logo_focus} className="b ghost" openOnNew />}
            </div>
          </div>
          <div className="st-picrow">
            <div>
              <b>Cover photo</b>
              <p className="muted">The wide picture at the top of your page.</p>
            </div>
            <div className="st-picbtns">
              <PhotoUpload businessId={biz.id} kind="cover" label={biz.cover_url ? "Change" : "Add cover photo"} className={biz.cover_url ? "b ghost" : "b"} />
              {biz.cover_url && <FrameEditor businessId={biz.id} kind="cover" url={biz.cover_url} focus={biz.cover_focus} className="b ghost" openOnNew />}
            </div>
          </div>

          <ProfileSetupForm biz={biz} hasPics={!!biz.logo_url && !!biz.cover_url} />
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
