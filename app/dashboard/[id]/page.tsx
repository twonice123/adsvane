import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { siteUrl, starText, isRunning, type Business, type Photo, type Promotion, type Review } from "@/lib/data";
import { ratingsFor } from "@/lib/queries";
import { Logo } from "@/app/components/Logo";
import PhotoUpload from "./photos/PhotoUpload";
import Gallery from "@/app/components/Gallery";
import { toPosts } from "@/lib/posts";
import { Cover } from "@/app/components/Cover";
import CopyLink from "./CopyLink";
import ScrollTop from "@/app/components/ScrollTop";
import ProfileTop from "@/app/components/ProfileTop";
import { getMe } from "@/lib/auth";
import ProfileTabs from "@/app/components/ProfileTabs";
import { profileTabs } from "@/app/components/tabIcons";
import { memberPosts } from "@/lib/member";

export const metadata = { title: "Dashboard", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Manage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const user = await getMe(supabase);
  const { data } = await supabase.from("businesses").select("*").eq("id", id).eq("owner_id", user!.id).maybeSingle();
  if (!data) notFound();
  const biz = data as Business;

  const [{ data: promos }, { data: reviews }, { data: photoRows }, ratings, reposts, saved] = await Promise.all([
    supabase.from("promotions").select("*").eq("business_id", id).order("created_at", { ascending: false }).limit(5),
    supabase.from("reviews").select("*").eq("business_id", id).order("created_at", { ascending: false }).limit(5),
    supabase.from("business_photos").select("*").eq("business_id", id).order("created_at", { ascending: false }),
    ratingsFor(supabase, [id]),
    memberPosts(supabase, user!.id, "reposts", user!.id),
    memberPosts(supabase, user!.id, "saved", user!.id),
  ]);
  const address = [biz.street, biz.city, `${biz.state} ${biz.zip || ""}`.trim()].filter(Boolean).join(", ");
  const photos = (photoRows as Photo[]) || [];
  const posts = await toPosts(supabase, photos, user!.id, () => ({ name: biz.name, slug: biz.slug, logo_url: biz.logo_url }));
  const running = ((promos as Promotion[]) || []).find(isRunning);
  const r = ratings.get(id);
  const reviewUrl = `${siteUrl()}/b/${biz.slug}/review`;
  const qr = await QRCode.toString(reviewUrl, { type: "svg", margin: 1, color: { dark: "#0d0b12", light: "#ffffff" } });
  const daysLeft = running ? Math.max(1, Math.ceil((new Date(running.ends_at).getTime() - Date.now()) / 86400000)) : 0;

  return (
    <div className="wrap" style={{ marginBottom: 40 }}>
      <div className="dhead">
        <ProfileTop
          biz={biz}
          isOwner
          photoCount={posts.filter((p) => !p.hidden).length}
          rating={r ? Number(r.rating) : null}
          reviewCount={r ? r.review_count : 0}
          sponsored={!!running}
          cover={<Cover url={biz.cover_url} focus={biz.cover_focus} />}
          picture={<Logo name={biz.name} url={biz.logo_url} size="xl" focus={biz.logo_focus} />}
        />
        <div className="pbar">
          <Link className="pbar-main" href={`/dashboard/${id}/promote`}>
            <b>Promote your account</b>
            <small>
              <span aria-hidden="true">↗</span>{" "}
              {running ? `Promotion running · ${daysLeft} day${daysLeft > 1 ? "s" : ""} left` : "Get seen by more customers nearby"}
            </small>
          </Link>
          <PhotoUpload businessId={id} kind="gallery" label="+" ariaLabel="New post" multiple className="pbar-plus" wrapClass="pbar-up" />
        </div>
        <ProfileTabs tabs={profileTabs(true)} />
      </div>
      {sp.new && <ScrollTop />}
      {sp.new && <p className="ok">Your free listing is live! Tap Edit profile to add your profile picture, cover photo and bio.</p>}
      {sp.promo === "started" && <p className="ok">Your promotion is running. Your profile now shows as Sponsored.</p>}
      {sp.promo === "stopped" && <p className="note">Promotion stopped. Your free listing still shows in search.</p>}

      <div className="grid" id="ptb" data-tab="photos" style={{ marginTop: 10, gridTemplateColumns: "1fr" }}>
        <div className="stack">
          <div className="tabp dash-photos" data-p="photos" id="photos">
            <Gallery
              photos={posts.filter((p) => !p.hidden)}
              owner
              loginNext={`/dashboard/${id}`}
              empty={<p className="muted" style={{ margin: "8px 0 0" }}>No photos yet. Tap + to post your first one. Businesses with photos get far more calls.</p>}
            />
          </div>


          <section className="card tabp" data-p="contact" id="contact">
            <h2>Contact details</h2>
            <p className="sub">This is how customers reach you from your page.</p>
            <div className="review"><b>Phone</b><p>{biz.phone || <span className="muted">Not added</span>}</p></div>
            <div className="review"><b>Email</b><p>{biz.contact_email || <span className="muted">Not added</span>}</p></div>
            <div className="review"><b>Website</b><p>{biz.website || <span className="muted">Not added</span>}</p></div>
            <div className="review"><b>Address</b><p>{biz.show_address && biz.street ? address : `${biz.city}, ${biz.state}`}</p></div>
            <div className="btns" style={{ marginTop: 12 }}>
              <Link className="b" href={`/dashboard/${id}/edit`}>Hours, services &amp; social links</Link>
              <Link className="b ghost" href={`/b/${biz.slug}`}>View my page</Link>
              <Link className="b ghost" href="/dashboard">All my businesses</Link>
            </div>
          </section>

          <section className="card tabp" data-p="reviews" id="reviews">
            <h2>Recent reviews</h2>
            {r ? <p style={{ marginTop: 0 }}><span className="stars">{starText(Number(r.rating))}</span> {Number(r.rating).toFixed(1)} from {r.review_count} review{r.review_count === 1 ? "" : "s"}</p> : <p className="muted">No reviews yet. Share your review link to get your first one.</p>}
            {((reviews as Review[]) || []).map((rv) => (
              <div key={rv.id} className="review">
                <span className="stars">{starText(rv.stars)}</span> <b>{rv.first_name}</b>
                {rv.body && <p>{rv.body}</p>}
              </div>
            ))}
          </section>

          <section className="card tabp" data-p="reviews">
            <h2>Get more reviews</h2>
            <p className="sub">Print this QR code for your counter, or text the link to customers after a visit.</p>
            <div className="qr" dangerouslySetInnerHTML={{ __html: qr }} role="img" aria-label="QR code for your review page" />
            <p className="muted" style={{ fontSize: 12 }}>Ask every customer, not just happy ones, and never offer rewards for reviews.</p>
            <CopyLink url={reviewUrl} />
            <p style={{ marginBottom: 0 }}><a className="b ghost" href={`/dashboard/${id}/qr`} target="_blank">Printable QR poster</a></p>
          </section>

          <section className="card tabp" data-p="reposts" id="reposts">
            <h2>Reposts</h2>
            <Gallery photos={reposts} loginNext={`/dashboard/${id}`} empty={<p className="muted" style={{ margin: 0 }}>Photos you repost from other businesses show here.</p>} />
          </section>

          <section className="card tabp" data-p="saved" id="saved">
            <h2>Saved</h2>
            <p className="sub">Only you can see what you&apos;ve saved.</p>
            <Gallery photos={saved} loginNext={`/dashboard/${id}`} empty={<p className="muted" style={{ margin: 0 }}>Tap the bookmark on any photo to save it here.</p>} />
          </section>
        </div>

      </div>
    </div>
  );
}
