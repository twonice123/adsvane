"use client";
import { useActionState } from "react";
import { AMENITIES, CATEGORIES, DAYS, SOCIAL, STATES, socialLink, type Business } from "@/lib/data";
import { saveBusiness, type FormState } from "./actions";
import AddressInput from "@/app/components/AddressInput";
import type { Place } from "@/app/api/places/route";

// Fill city, state and ZIP from the address someone picked.
function fillAddress(p: Place) {
  const set = (id: string, v: string | null) => {
    const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
    if (el && v) el.value = v;
  };
  set("city", p.city);
  set("state", p.state);
  set("zip", p.zip);
}

export default function BusinessForm({ biz }: { biz?: Business }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveBusiness, {});
  const h = biz?.hours || {};
  return (
    <form action={action} className="stack">
      {biz && <input type="hidden" name="id" value={biz.id} />}
      <section className="card">
        <h2>Basics</h2>
        <div className="fld">
          <label htmlFor="name">Business name</label>
          <input id="name" name="name" type="text" required maxLength={120} defaultValue={biz?.name} />
        </div>
        <div className="fld">
          <label htmlFor="category">Category</label>
          <select id="category" name="category" defaultValue={biz?.category || ""} required>
            <option value="" disabled>Pick one</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="fld">
          <label htmlFor="description">About your business</label>
          <textarea id="description" name="description" maxLength={2000} defaultValue={biz?.description || ""} placeholder="What you do, what you're known for, who you serve." />
        </div>
        {biz ? (
          <p className="note" style={{ margin: 0 }}>To add your profile picture, cover photo and photos of your work, go to your <a href={`/dashboard/${biz.id}`}>dashboard</a>.</p>
        ) : (
          <p className="note" style={{ margin: 0 }}>You can add your profile picture, cover photo and photos of your work right after this.</p>
        )}
      </section>

      <section className="card">
        <h2>Contact and location</h2>
        <div className="two">
          <div className="fld"><label htmlFor="phone">Phone</label><input id="phone" name="phone" type="tel" defaultValue={biz?.phone || ""} /></div>
          <div className="fld"><label htmlFor="website">Website</label><input id="website" name="website" type="text" inputMode="url" autoComplete="url" defaultValue={biz?.website || ""} placeholder="yourbusiness.com" /></div>
        </div>
        <div className="fld"><label htmlFor="contact_email">Email for customers (optional)</label><input id="contact_email" name="contact_email" type="email" defaultValue={biz?.contact_email || ""} placeholder="Shown on your page so customers can email you" /></div>
        <div className="fld"><label htmlFor="street">Street address</label><AddressInput id="street" name="street" defaultValue={biz?.street || ""} placeholder="Start typing, then pick your address" onPick={fillAddress} pickText={(p) => p.street || p.label} /></div>
        <div className="three">
          <div className="fld"><label htmlFor="city">City</label><input id="city" name="city" type="text" required defaultValue={biz?.city || ""} /></div>
          <div className="fld">
            <label htmlFor="state">State</label>
            <select id="state" name="state" required defaultValue={biz?.state || ""}>
              <option value="" disabled>State</option>
              {Object.keys(STATES).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="fld"><label htmlFor="zip">ZIP</label><input id="zip" name="zip" type="text" inputMode="numeric" defaultValue={biz?.zip || ""} /></div>
        </div>
        <label className="check"><input type="checkbox" name="show_address" defaultChecked={biz ? biz.show_address : true} /><span>Show my street address on my page</span></label>
        <div className="fld"><label htmlFor="service_area">Area you serve (if you go to customers)</label><input id="service_area" name="service_area" type="text" defaultValue={biz?.service_area || ""} placeholder="e.g. Houston and 20 miles around" /></div>
      </section>

      <section className="card">
        <h2>Hours</h2>
        {DAYS.map((d) => (
          <div key={d} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "4px 0" }}>
            <label className="check" style={{ width: 130 }}><input type="checkbox" name={`on_${d}`} defaultChecked={biz ? !!h[d] : d !== "Sunday"} /><span>{d}</span></label>
            <input type="time" name={`open_${d}`} defaultValue={h[d]?.open || "09:00"} aria-label={`${d} opens`} />
            <span>to</span>
            <input type="time" name={`close_${d}`} defaultValue={h[d]?.close || "18:00"} aria-label={`${d} closes`} />
          </div>
        ))}
      </section>

      <section className="card">
        <h2>Services</h2>
        <div className="fld">
          <label htmlFor="services">One per line. Add a short note after a dash if you like.</label>
          <textarea id="services" name="services" defaultValue={(biz?.services || []).map((s) => (s.note ? `${s.name} - ${s.note}` : s.name)).join("\n")} placeholder={"Knotless braids - all lengths\nBox braids\nCornrows"} />
        </div>
      </section>

      <section className="card">
        <h2>Features</h2>
        <div className="amen">
          {AMENITIES.map((g) => (
            <div key={g.group} style={{ display: "contents" }}>
              <h4>{g.group}</h4>
              {g.items.map(([k, l]) => (
                <label key={k} className="check"><input type="checkbox" name="amenities" value={k} defaultChecked={biz?.amenities.includes(k)} /><span>{l}</span></label>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Social media</h2>
        <p className="sub">Paste the link to each of your pages. Open your page in the app or browser, copy the link, and paste it here.</p>
        <div className="two">
          {SOCIAL.map((s) => (
            <div key={s.key} className="fld"><label htmlFor={`social_${s.key}`}>{s.label} link</label><input id={`social_${s.key}`} name={`social_${s.key}`} type="text" inputMode="url" autoComplete="off" placeholder={s.example} defaultValue={socialLink(s.key, biz?.social?.[s.key]) || ""} /></div>
          ))}
        </div>
      </section>

      {state.error && <p className="err" role="alert">{state.error}</p>}
      {state.saved && <p className="ok" role="status">Saved. Your page is updated.</p>}
      <div className="btns">
        <button className="b" type="submit" disabled={pending}>{pending ? "Saving…" : biz ? "Save changes" : "Create my free listing"}</button>
      </div>
    </form>
  );
}
