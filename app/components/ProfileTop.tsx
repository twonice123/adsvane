import QRCode from "qrcode";
import { siteUrl, type Business } from "@/lib/data";
import ProfileButtons from "./ProfileButtons";

// The top of a business profile, laid out like a social profile:
// picture and numbers, then name, bio, website and address, then the buttons.
export default async function ProfileTop({
  biz,
  cover,
  picture,
  photoCount,
  rating,
  reviewCount,
  isOwner,
  sponsored = false,
}: {
  biz: Business;
  cover: React.ReactNode;
  picture: React.ReactNode;
  photoCount: number;
  rating: number | null;
  reviewCount: number;
  isOwner: boolean;
  sponsored?: boolean;
}) {
  const profileUrl = `${siteUrl()}/b/${biz.slug}`;
  const qr = await QRCode.toString(profileUrl, { type: "svg", margin: 1, color: { dark: "#0d0b12", light: "#ffffff" } });
  const street = biz.show_address && biz.street ? biz.street : null;
  const address = [street, biz.city, `${biz.state} ${street ? biz.zip || "" : ""}`.trim()].filter(Boolean).join(", ");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(street ? address : `${biz.name} ${biz.city} ${biz.state}`)}`;
  const site = biz.website?.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

  return (
    <div className="igp">
      {cover}
      <div className="igp-row">
        <div className="igp-pic">{picture}</div>
        <ul className="igp-stats">
          <li>
            <a href="#photos"><b>{photoCount}</b><span>post{photoCount === 1 ? "" : "s"}</span></a>
          </li>
          <li>
            <a href="#reviews"><b>{reviewCount}</b><span>review{reviewCount === 1 ? "" : "s"}</span></a>
          </li>
          <li>
            <a href="#reviews"><b>{rating ? <>{rating.toFixed(1)}<i className="igp-star">★</i></> : "–"}</b><span>rating</span></a>
          </li>
        </ul>
      </div>
      <div className="igp-info">
        <h1>
          {biz.name}
          {sponsored && <span className="spon">Sponsored</span>}
        </h1>
        <p className="igp-cat">{biz.category}</p>
        {biz.description ? (
          <p className="igp-bio">{biz.description}</p>
        ) : (
          isOwner && <p className="igp-bio muted">Add a bio so customers know what you do. Tap Edit profile.</p>
        )}
        {site && (
          <a className="igp-link" href={biz.website!} target="_blank" rel="noopener nofollow">
            <span aria-hidden="true">🔗</span> {site}
          </a>
        )}
        <a className="igp-addr" href={mapsUrl} target="_blank" rel="noopener">
          <span aria-hidden="true">📍</span> {address}
          {!street && biz.service_area ? ` · Serves ${biz.service_area}` : ""}
        </a>
      </div>
      <ProfileButtons
        isOwner={isOwner}
        profileUrl={profileUrl}
        qr={qr}
        info={{
          id: biz.id,
          name: biz.name,
          category: biz.category,
          description: biz.description,
          website: biz.website,
          phone: biz.phone,
          contact_email: biz.contact_email,
          street: biz.street,
          city: biz.city,
          state: biz.state,
          zip: biz.zip,
          show_address: biz.show_address,
          logo_url: biz.logo_url,
          logo_focus: biz.logo_focus,
          cover_url: biz.cover_url,
          cover_focus: biz.cover_focus,
        }}
      />
    </div>
  );
}
