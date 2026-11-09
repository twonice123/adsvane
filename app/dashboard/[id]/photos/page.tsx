import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MAX_PHOTOS, type Business, type Photo } from "@/lib/data";
import { Logo } from "@/app/components/Logo";
import { removePhoto } from "../../photo-actions";
import PhotoUpload from "./PhotoUpload";

export const metadata = { title: "Photos", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Photos({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase.from("businesses").select("*").eq("id", id).eq("owner_id", user!.id).maybeSingle();
  if (!data) notFound();
  const biz = data as Business;
  const { data: rows } = await supabase.from("business_photos").select("*").eq("business_id", id).order("created_at", { ascending: false });
  const photos = (rows as Photo[]) || [];

  return (
    <div className="wrap" style={{ marginBottom: 40 }}>
      <p className="muted" style={{ marginTop: 14 }}><Link href={`/dashboard/${id}`}>← Back to dashboard</Link></p>
      {sp.new && <p className="ok" style={{ marginTop: 14 }}>Your free listing is live! Now add a profile picture, a cover photo and some photos of your work. You can also do this later from your dashboard.</p>}
      <h1>Photos</h1>
      <p className="sub">Your profile picture and cover photo are the first thing customers see. Add photos of your work so people can see what you do.</p>

      <section className="card">
        <h2>Profile picture and cover photo</h2>
        <div className="pfprev">
          <div className="cover" style={biz.cover_url ? { backgroundImage: `url("${biz.cover_url}")` } : undefined}>
            {!biz.cover_url && <span className="cover-empty">No cover photo yet</span>}
          </div>
          <div className="pfrow">
            <Logo name={biz.name} url={biz.logo_url} size="xl" />
            <b className="pfname">{biz.name}</b>
          </div>
        </div>
        <div className="two" style={{ marginTop: 18 }}>
          <div>
            <div className="lbl">Profile picture</div>
            <p className="muted" style={{ margin: "0 0 8px" }}>Your logo or a clear photo. Shows as a circle.</p>
            <div className="btns">
              <PhotoUpload businessId={id} kind="logo" label={biz.logo_url ? "Change profile picture" : "Add profile picture"} />
              {biz.logo_url && (
                <form action={removePhoto}>
                  <input type="hidden" name="business_id" value={id} />
                  <input type="hidden" name="what" value="logo" />
                  <button className="b ghost" type="submit">Remove</button>
                </form>
              )}
            </div>
          </div>
          <div>
            <div className="lbl">Cover photo</div>
            <p className="muted" style={{ margin: "0 0 8px" }}>A wide photo across the top of your page, like your shop or your best work.</p>
            <div className="btns">
              <PhotoUpload businessId={id} kind="cover" label={biz.cover_url ? "Change cover photo" : "Add cover photo"} />
              {biz.cover_url && (
                <form action={removePhoto}>
                  <input type="hidden" name="business_id" value={id} />
                  <input type="hidden" name="what" value="cover" />
                  <button className="b ghost" type="submit">Remove</button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <h2>Photos of your work</h2>
        <p className="sub">Up to {MAX_PHOTOS} photos. You can pick several at once. {photos.length > 0 && `You have ${photos.length}.`}</p>
        <PhotoUpload businessId={id} kind="gallery" label="Add photos" multiple />
        {photos.length === 0 ? (
          <p className="muted" style={{ marginBottom: 0 }}>No photos yet. Businesses with photos get far more calls.</p>
        ) : (
          <div className="gal" style={{ marginTop: 16 }}>
            {photos.map((p) => (
              <figure key={p.id} className="galitem">
                <img src={p.url} alt={p.caption || `${biz.name} photo`} loading="lazy" />
                <form action={removePhoto} className="galdel">
                  <input type="hidden" name="business_id" value={id} />
                  <input type="hidden" name="what" value="photo" />
                  <input type="hidden" name="photo_id" value={p.id} />
                  <button type="submit" aria-label="Remove this photo">Remove</button>
                </form>
              </figure>
            ))}
          </div>
        )}
      </section>

      <div className="btns" style={{ marginTop: 18 }}>
        <Link className="b" href={`/b/${biz.slug}`}>See my page</Link>
        <Link className="b ghost" href={`/dashboard/${id}`}>Go to my dashboard</Link>
      </div>
    </div>
  );
}
