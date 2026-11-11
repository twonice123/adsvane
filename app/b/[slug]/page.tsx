import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AMENITIES, AMENITY_LABEL, DAYS, SOCIAL, STATES, socialLink, socialText, starText, type Business, type Photo, type Review } from "@/lib/data";
import { ratingsFor, sponsoredIds } from "@/lib/queries";
import { Logo } from "@/app/components/Logo";
import Gallery from "@/app/components/Gallery";
import ProfileTabs from "@/app/components/ProfileTabs";
import { profileTabs } from "@/app/components/tabIcons";
import { toPosts } from "@/lib/posts";
import { memberPosts } from "@/lib/member";
import { Cover } from "@/app/components/Cover";
import ProfileTop from "@/app/components/ProfileTop";
import { getMe } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("businesses").select("*").eq("slug", slug).maybeSingle();
  return { supabase, biz: data as Business | null };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { biz } = await load(slug);
  if (!biz) return { title: "Business not found" };
  return {
    title: `${biz.name}: ${biz.category} in ${biz.city}, ${biz.state}`,
    description: biz.description?.slice(0, 160) || `${biz.name} is a ${biz.category.toLowerCase()} business in ${biz.city}, ${STATES[biz.state] || biz.state}.`,
  };
}

function fmt(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}${m ? ":" + String(m).padStart(2, "0") : ""} ${ap}`;
}

export default async function BusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase, biz } = await load(slug);
  if (!biz) notFound();

  const user = await getMe(supabase);
  const isOwner = !!user && user.id === biz.owner_id;
  const [{ data: reviews }, { data: photoRows }, ratings, sponsored, reposts, saved] = await Promise.all([
    supabase.from("reviews").select("*").eq("business_id", biz.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("business_photos").select("id, url, caption, post_text, post_id, position, view_count").eq("business_id", biz.id).eq("hidden", false).order("created_at", { ascending: false }).limit(1000),
    ratingsFor(supabase, [biz.id]),
    sponsoredIds(supabase, [biz.id]),
    memberPosts(supabase, biz.owner_id, "reposts", user?.id || null),
    isOwner ? memberPosts(supabase, biz.owner_id, "saved", user!.id) : Promise.resolve([]),
  ]);
  const r = ratings.get(biz.id);
  const revs = (reviews as Review[]) || [];
  const address = [biz.street, biz.city, `${biz.state} ${biz.zip || ""}`.trim()].filter(Boolean).join(", ");
  const mapQ = encodeURIComponent(biz.show_address && biz.street ? address : `${biz.name} ${biz.city} ${biz.state}`);
  const amen = biz.amenities.filter((a) => AMENITY_LABEL[a]);
  const social = SOCIAL.map((s) => ({ ...s, link: socialLink(s.key, biz.social?.[s.key]) })).filter((s): s is typeof s & { link: string } => !!s.link);
  const workPhotos = (photoRows as Pick<Photo, "id" | "url" | "caption" | "post_text" | "post_id" | "position" | "view_count">[]) || [];
  // Everything the business has posted shows under Photos, like a social page.
  const photos = [
    ...workPhotos,
    ...(biz.cover_url ? [{ id: "cover", url: biz.cover_url, caption: "Cover photo" }] : []),
    ...(biz.logo_url && /\/storage\/v1\/object\/public\//.test(biz.logo_url) ? [{ id: "logo", url: biz.logo_url, caption: "Profile picture" }] : []),
  ];
  const posts = await toPosts(supabase, photos, user?.id || null, () => ({ name: biz.name, slug: biz.slug, logo_url: biz.logo_url }));
  const tel = biz.phone ? biz.phone.replace(/[^\d+]/g, "") : "";
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapQ}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: biz.name,
    description: biz.description || undefined,
    telephone: biz.phone || undefined,
    url: biz.website || undefined,
    image: [biz.cover_url, biz.logo_url, ...workPhotos.slice(0, 3).map((p) => p.url)].filter(Boolean),
    email: biz.contact_email || undefined,
    address: { "@type": "PostalAddress", streetAddress: biz.show_address ? biz.street || undefined : undefined, addressLocality: biz.city, addressRegion: biz.state, postalCode: biz.zip || undefined, addressCountry: "US" },
    aggregateRating: r ? { "@type": "AggregateRating", ratingValue: String(r.rating), reviewCount: String(r.review_count) } : undefined,
  };

  return (
    <div className="wrap">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <p className="muted" style={{ marginTop: 14 }}>
        <Link href="/" style={{ color: "inherit" }}>AdsVane</Link> › <Link href={`/find?where=${encodeURIComponent(biz.city + " " + biz.state)}`} style={{ color: "inherit" }}>{biz.city}, {biz.state}</Link> › {biz.category}
      </p>
      <div className="pfhead">
        <ProfileTop
          biz={biz}
          cover={<Cover url={biz.cover_url} focus={biz.cover_focus} label={`${biz.name} cover photo`} />}
          picture={<Logo name={biz.name} url={biz.logo_url} size="xl" focus={biz.logo_focus} />}
          photoCount={posts.filter((p) => p.social).length}
          rating={r ? Number(r.rating) : null}
          reviewCount={r ? r.review_count : 0}
          isOwner={isOwner}
          sponsored={sponsored.has(biz.id)}
        />
        <ProfileTabs tabs={profileTabs(isOwner)} />
      </div>

      <div className="grid" id="ptb" data-tab="photos">
        <div className="stack">
          <section className="card tabp" data-p="photos" id="photos">
            <h2>Photos</h2>
            {photos.length > 0 ? (
              <Gallery photos={posts} owner={isOwner} loginNext={`/b/${biz.slug}`} initial={60} />
            ) : (
              <p className="muted" style={{ margin: 0 }}>{biz.name} hasn&apos;t added photos yet.</p>
            )}
          </section>
          {biz.services?.length > 0 && (
            <section className="card tabp" data-p="contact" id="services">
              <h2>Services</h2>
              {biz.services.map((s, i) => (
                <div key={i} className="review">
                  <b>{s.name}</b>
                  {s.note && <p className="muted">{s.note}</p>}
                </div>
              ))}
            </section>
          )}
          <section className="card contact tabp" data-p="contact" id="contact">
            <h2>Contact {biz.name}</h2>
            <p className="sub">Like what you see? Get in touch directly. AdsVane doesn&apos;t charge you anything.</p>
            <div className="cgrid">
              {tel && (
                <a className="cbtn" href={`tel:${tel}`}>
                  <span className="cic" aria-hidden="true">☎</span>
                  <span><b>Call</b><small>{biz.phone}</small></span>
                </a>
              )}
              {tel && (
                <a className="cbtn" href={`sms:${tel}`}>
                  <span className="cic" aria-hidden="true">✉</span>
                  <span><b>Send a text</b><small>{biz.phone}</small></span>
                </a>
              )}
              {biz.contact_email && (
                <a className="cbtn" href={`mailto:${biz.contact_email}?subject=${encodeURIComponent("Question from AdsVane")}`}>
                  <span className="cic" aria-hidden="true">@</span>
                  <span><b>Email</b><small>{biz.contact_email}</small></span>
                </a>
              )}
              {biz.website && (
                <a className="cbtn" href={biz.website} target="_blank" rel="noopener nofollow">
                  <span className="cic" aria-hidden="true">↗</span>
                  <span><b>Website</b><small>{biz.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</small></span>
                </a>
              )}
              <a className="cbtn" href={mapsUrl} target="_blank" rel="noopener">
                <span className="cic" aria-hidden="true">⌖</span>
                <span><b>Directions</b><small>{biz.show_address && biz.street ? address : `${biz.city}, ${biz.state}`}</small></span>
              </a>
              {social.map((s) => (
                <a key={s.key} className="cbtn" href={s.link} target="_blank" rel="noopener nofollow">
                  <span className="cic" aria-hidden="true">{s.label.charAt(0)}</span>
                  <span><b>{s.label}</b><small>{socialText(s.link)}</small></span>
                </a>
              ))}
            </div>
            {!tel && !biz.contact_email && !biz.website && social.length === 0 && (
              <p className="muted" style={{ marginBottom: 0 }}>This business hasn&apos;t added a phone number or email yet.</p>
            )}
          </section>

          <section className="card tabp" data-p="reviews" id="reviews">
            <h2>Reviews</h2>
            {revs.length === 0 && <p className="muted">Be the first to review {biz.name}.</p>}
            {revs.map((rv) => (
              <div key={rv.id} className="review">
                <span className="stars">{starText(rv.stars)}</span> <b>{rv.first_name}</b>{" "}
                <span className="muted">· {new Date(rv.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                {rv.body && <p>{rv.body}</p>}
              </div>
            ))}
            <p style={{ marginBottom: 0 }}>
              <Link className="b" href={`/b/${biz.slug}/review`}>Write a review</Link>
            </p>
          </section>

          <section className="card tabp" data-p="reposts" id="reposts">
            <h2>Reposts</h2>
            <Gallery
              photos={reposts}
              loginNext={`/b/${biz.slug}`}
              empty={<p className="muted" style={{ margin: 0 }}>{isOwner ? "Photos you repost from other businesses show here." : `${biz.name} hasn't reposted anything yet.`}</p>}
            />
          </section>

          {isOwner && (
            <section className="card tabp" data-p="saved" id="saved">
              <h2>Saved</h2>
              <p className="sub">Only you can see what you&apos;ve saved.</p>
              <Gallery photos={saved} loginNext={`/b/${biz.slug}`} empty={<p className="muted" style={{ margin: 0 }}>Tap the bookmark on any photo to save it here.</p>} />
            </section>
          )}
        </div>
        <aside className="stack tabp" data-p="contact">
          <section className="card tabp" data-p="contact">
            <h2>Location</h2>
            <p style={{ margin: 0 }}>{biz.show_address && biz.street ? address : biz.service_area ? `Serves ${biz.service_area}` : `${biz.city}, ${biz.state}`}</p>
            {biz.phone && <p style={{ margin: "6px 0 0" }}><a href={`tel:${tel}`}>{biz.phone}</a></p>}
          </section>
          {Object.values(biz.hours || {}).some(Boolean) && (
            <section className="card tabp" data-p="contact">
              <h2>Hours</h2>
              <table className="hours">
                <tbody>
                  {DAYS.map((d) => {
                    const h = biz.hours?.[d];
                    return (
                      <tr key={d}>
                        <td>{d}</td>
                        <td>{h ? `${fmt(h.open)} – ${fmt(h.close)}` : "Closed"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}
          {amen.length > 0 && (
            <section className="card tabp" data-p="contact">
              <h2>Good to know</h2>
              {AMENITIES.filter((g) => g.items.some(([k]) => amen.includes(k))).map((g) => (
                <div key={g.group} style={{ marginBottom: 10 }}>
                  <div className="lbl">{g.group}</div>
                  <div className="tags">
                    {g.items.filter(([k]) => amen.includes(k)).map(([k, l]) => (
                      <span key={k} className="tag">{l}</span>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}
        </aside>
      </div>
      <div className="mbar">
        {tel && <a className="b" href={`tel:${tel}`}>Call</a>}
        {tel && <a className="b ghost" href={`sms:${tel}`}>Text</a>}
        <a className={tel ? "b ghost" : "b"} href="#contact">Contact</a>
      </div>
    </div>
  );
}
