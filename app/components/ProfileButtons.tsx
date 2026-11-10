"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, STATES } from "@/lib/data";
import { saveProfile, type ProfileState } from "@/app/dashboard/actions";
import AddressInput from "./AddressInput";
import { Logo } from "./Logo";
import { Cover } from "./Cover";
import PhotoUpload from "@/app/dashboard/[id]/photos/PhotoUpload";
import FrameEditor from "@/app/dashboard/[id]/FrameEditor";
import { removePhoto } from "@/app/dashboard/photo-actions";

export type ProfileInfo = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  website: string | null;
  phone: string | null;
  contact_email: string | null;
  street: string | null;
  city: string;
  state: string;
  zip: string | null;
  show_address: boolean;
  logo_url: string | null;
  logo_focus: string | null;
  cover_url: string | null;
  cover_focus: string | null;
};

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    // Escape closes this sheet, unless the photo framing window is open on top of it.
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector(".fe-back") && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="sh-back" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sh-box">
        <div className="sh-top">
          <button type="button" className="sh-x" onClick={onClose} aria-label="Close">✕</button>
          <h2>{title}</h2>
        </div>
        {children}
      </div>
    </div>
  );
}

// Profile picture and cover photo, at the top of Edit profile.
function PhotoSection({ p }: { p: ProfileInfo }) {
  return (
    <div className="ef-pics">
      <Cover url={p.cover_url} focus={p.cover_focus} />
      <div className="ef-avatar">
        <Logo name={p.name} url={p.logo_url} size="xl" focus={p.logo_focus} />
      </div>
      <div className="ef-picrow">
        <span className="ef-pl">Profile picture</span>
        <PhotoUpload businessId={p.id} kind="logo" label={p.logo_url ? "Change" : "Add"} className="lnk" wrapClass="inl2" />
        {p.logo_url && <FrameEditor businessId={p.id} kind="logo" url={p.logo_url} focus={p.logo_focus} className="lnk" />}
        {p.logo_url && (
          <form action={removePhoto}>
            <input type="hidden" name="business_id" value={p.id} />
            <input type="hidden" name="what" value="logo" />
            <button className="lnk lnk-bad" type="submit">Remove</button>
          </form>
        )}
      </div>
      <div className="ef-picrow">
        <span className="ef-pl">Cover photo</span>
        <PhotoUpload businessId={p.id} kind="cover" label={p.cover_url ? "Change" : "Add"} className="lnk" wrapClass="inl2" />
        {p.cover_url && <FrameEditor businessId={p.id} kind="cover" url={p.cover_url} focus={p.cover_focus} className="lnk" />}
        {p.cover_url && (
          <form action={removePhoto}>
            <input type="hidden" name="business_id" value={p.id} />
            <input type="hidden" name="what" value="cover" />
            <button className="lnk lnk-bad" type="submit">Remove</button>
          </form>
        )}
      </div>
    </div>
  );
}

function EditForm({ p, onDone }: { p: ProfileInfo; onDone: () => void }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfile, {});
  const [bio, setBio] = useState(p.description || "");
  const [city, setCity] = useState(p.city);
  const [st, setSt] = useState(p.state);
  const [zip, setZip] = useState(p.zip || "");
  const router = useRouter();
  useEffect(() => {
    if (state.ok) {
      router.refresh();
      onDone();
    }
  }, [state.ok, router, onDone]);

  return (
    <form action={action} className="ef">
      <input type="hidden" name="id" value={p.id} />
      <label className="ff">
        <span>Name</span>
        <input name="name" required maxLength={120} defaultValue={p.name} />
      </label>
      <label className="ff">
        <span>Category</span>
        <select name="category" defaultValue={p.category} required>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <label className="ff">
        <span>Bio <em>{bio.length}/2000</em></span>
        <textarea name="description" maxLength={2000} rows={4} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What you do, your prices or deposit, how to book." />
      </label>
      <label className="ff">
        <span>Website</span>
        <input name="website" inputMode="url" maxLength={300} defaultValue={p.website || ""} placeholder="yourwebsite.com" />
      </label>

      <h3 className="ef-h">Contact options</h3>
      <label className="ff">
        <span>Phone number</span>
        <input name="phone" type="tel" maxLength={30} defaultValue={p.phone || ""} placeholder="(410) 555-0100" />
      </label>
      <label className="ff">
        <span>Email (shown on your page)</span>
        <input name="contact_email" type="email" maxLength={200} defaultValue={p.contact_email || ""} placeholder="hello@yourbusiness.com" />
      </label>

      <h3 className="ef-h">Address</h3>
      <div className="ff">
        <span>Street address</span>
        <AddressInput
          name="street"
          ariaLabel="Street address"
          defaultValue={p.street || ""}
          placeholder="Start typing your address"
          pickText={(x) => x.street || x.label}
          onPick={(x) => {
            if (x.city) setCity(x.city);
            if (x.state) setSt(x.state);
            if (x.zip) setZip(x.zip);
          }}
        />
      </div>
      <div className="ef-row">
        <label className="ff">
          <span>City</span>
          <input name="city" required maxLength={80} value={city} onChange={(e) => setCity(e.target.value)} />
        </label>
        <label className="ff ff-st">
          <span>State</span>
          <select name="state" required value={st} onChange={(e) => setSt(e.target.value)}>
            {Object.keys(STATES).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="ff ff-zip">
          <span>ZIP</span>
          <input name="zip" inputMode="numeric" maxLength={10} value={zip} onChange={(e) => setZip(e.target.value)} />
        </label>
      </div>
      <label className="check">
        <input type="checkbox" name="show_address" defaultChecked={p.show_address} />
        <span>Show my street address on my page</span>
      </label>

      {state.error && <p className="err" role="alert">{state.error}</p>}
      <div className="ef-save">
        <button className="b" type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        <a className="b ghost" href={`/dashboard/${p.id}/edit`}>Hours, services &amp; social links</a>
      </div>
    </form>
  );
}

export default function ProfileButtons({
  info,
  isOwner,
  profileUrl,
  qr,
}: {
  info: ProfileInfo;
  isOwner: boolean;
  profileUrl: string;
  qr: string;
}) {
  const [open, setOpen] = useState<"" | "edit" | "share" | "contact">("");
  const [copied, setCopied] = useState(false);
  const close = () => setOpen("");
  const tel = info.phone ? info.phone.replace(/[^\d+]/g, "") : "";
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <>
      <div className="pbtns">
        {isOwner && <button type="button" className="pb" onClick={() => setOpen("edit")}>Edit profile</button>}
        <button type="button" className="pb" onClick={() => setOpen("share")}>Share profile</button>
        <button type="button" className={isOwner ? "pb" : "pb pb-main"} onClick={() => setOpen("contact")}>Contact</button>
      </div>

      {open === "edit" && (
        <Sheet title="Edit profile" onClose={close}>
          <PhotoSection p={info} />
          <EditForm p={info} onDone={close} />
        </Sheet>
      )}

      {open === "share" && (
        <Sheet title="Share profile" onClose={close}>
          <div className="share">
            <p className="sub">Scan this code with a phone camera to open {info.name}&apos;s page.</p>
            <div className="share-qr" dangerouslySetInnerHTML={{ __html: qr }} role="img" aria-label={`QR code for ${info.name}`} />
            <p className="share-name">{info.name}</p>
            <div className="copyrow">
              <input readOnly value={profileUrl} aria-label="Profile link" onFocus={(e) => e.currentTarget.select()} />
              <button
                className="b ghost"
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(profileUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch {}
                }}
              >
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
            <div className="btns" style={{ marginTop: 12, justifyContent: "center" }}>
              {canShare && (
                <button type="button" className="b" onClick={() => navigator.share({ title: info.name, url: profileUrl }).catch(() => {})}>
                  Send to someone
                </button>
              )}
              <a className="b ghost" download={`${info.name.replace(/[^\w]+/g, "-")}-qr.svg`} href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr)}`}>
                Save QR code
              </a>
            </div>
            {isOwner && (
              <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
                Want customers to leave a review instead? Use your <a href={`/dashboard/${info.id}/qr`} target="_blank">review QR poster</a>.
              </p>
            )}
          </div>
        </Sheet>
      )}

      {open === "contact" && (
        <Sheet title={`Contact ${info.name}`} onClose={close}>
          <div className="cgrid one">
            {tel ? (
              <>
                <a className="cbtn" href={`tel:${tel}`}>
                  <span className="cic" aria-hidden="true">☎</span>
                  <span><b>Call</b><small className="big">{info.phone}</small></span>
                </a>
                <a className="cbtn" href={`sms:${tel}`}>
                  <span className="cic" aria-hidden="true">✉</span>
                  <span><b>Send a text</b><small>{info.phone}</small></span>
                </a>
              </>
            ) : (
              <p className="muted" style={{ margin: 0 }}>{isOwner ? "Add your phone number in Edit profile so customers can call or text you." : "This business hasn't added a phone number yet."}</p>
            )}
            {info.contact_email && (
              <a className="cbtn" href={`mailto:${info.contact_email}?subject=${encodeURIComponent("Question from AdsVane")}`}>
                <span className="cic" aria-hidden="true">@</span>
                <span><b>Email</b><small>{info.contact_email}</small></span>
              </a>
            )}
          </div>
        </Sheet>
      )}
    </>
  );
}
